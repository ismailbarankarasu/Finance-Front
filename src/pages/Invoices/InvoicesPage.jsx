import { useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { useAccounting } from "../../context/useAccounting";

import {
  CompanyRole,
  InvoiceStatus,
  InvoiceType,
  PartyType,
  invoiceStatusLabel,
  invoiceTypeLabel,
} from "../../utils/accounting";

function localToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(dateText, days) {
  if (!dateText) return "";

  const date = new Date(`${dateText}T12:00:00`);

  date.setDate(date.getDate() + Number(days));

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function money(value) {
  return Number(value ?? 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function emptyLine() {
  return {
    productId: "",
    quantity: "1",
    unitPrice: "",
    discountAmount: "0",
  };
}

function statusBadge(status) {
  switch (status) {
    case InvoiceStatus.Draft:
      return "text-bg-warning";

    case InvoiceStatus.Approved:
      return "text-bg-primary";

    case InvoiceStatus.PartiallyPaid:
      return "text-bg-info";

    case InvoiceStatus.Paid:
      return "text-bg-success";

    case InvoiceStatus.Cancelled:
      return "text-bg-secondary";

    default:
      return "text-bg-secondary";
  }
}

export default function InvoicesPage() {
  const {
    activeCompany,
    activeCompanyId,
    activePeriod,
    activePeriodId,
  } = useAccounting();

  const [products, setProducts] = useState([]);
  const [parties, setParties] = useState([]);

  const [invoices, setInvoices] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const [type, setType] = useState(InvoiceType.Sales);
  const [counterpartyId, setCounterpartyId] = useState("");

  const [date, setDate] = useState(localToday());
  const [dueDate, setDueDate] = useState(localToday());

  const [lines, setLines] = useState([
    emptyLine(),
  ]);

  const [preview, setPreview] = useState(null);

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const [actionStatus, setActionStatus] =
    useState("idle");

  const role = activeCompany?.role;

  const canCreateSales =
    role === CompanyRole.Admin ||
    role === CompanyRole.Accountant ||
    role === CompanyRole.Sales;

  const canManageAccounting =
    role === CompanyRole.Admin ||
    role === CompanyRole.Accountant;

  const canCreate =
    type === InvoiceType.Sales
      ? canCreateSales
      : canManageAccounting;

  const suitableParties = useMemo(
    () =>
      parties.filter((party) => {
        if (!party.isActive) {
          return false;
        }

        if (type === InvoiceType.Sales) {
          return (
            party.type === PartyType.Customer ||
            party.type === PartyType.Both
          );
        }

        return (
          party.type === PartyType.Supplier ||
          party.type === PartyType.Both
        );
      }),
    [parties, type],
  );

  async function loadData(signal) {
    if (!activeCompanyId) return;

    setStatus("loading");
    setError("");

    try {
      const requests = [
        api.get(
          `/companies/${activeCompanyId}/products`,
          {
            signal,
          },
        ),

        api.get(
          `/companies/${activeCompanyId}/counterparties`,
          {
            params: {
              page: 1,
              pageSize: 100,
            },
            signal,
          },
        ),
      ];

      if (activePeriodId) {
        requests.push(
          api.get(
            `/companies/${activeCompanyId}/invoices`,
            {
              params: {
                periodId: activePeriodId,
                page: 1,
                pageSize: 100,
              },
              signal,
            },
          ),
        );
      }

      const results = await Promise.all(requests);

      setProducts(results[0].data ?? []);

      setParties(
        results[1].data?.items ?? [],
      );

      setInvoices(
        results[2]?.data?.items ?? [],
      );

      setTotalCount(
        Number(
          results[2]?.data?.totalCount ?? 0,
        ),
      );

      setStatus("success");
    } catch (error) {
      if (signal?.aborted) return;

      setStatus("error");

      setError(
        error.response?.data?.message ??
          "Fatura bilgileri yüklenemedi.",
      );
    }
  }

  useEffect(() => {
    if (!activeCompanyId) return;

    const controller = new AbortController();

    loadData(controller.signal);

    return () => controller.abort();
  }, [
    activeCompanyId,
    activePeriodId,
  ]);

  useEffect(() => {
    setCounterpartyId("");
    setPreview(null);

    setLines([
      emptyLine(),
    ]);
  }, [type]);

  function updateLine(index, field, value) {
    setPreview(null);

    setLines((previous) =>
      previous.map((line, lineIndex) => {
        if (lineIndex !== index) {
          return line;
        }

        const next = {
          ...line,
          [field]: value,
        };

        if (field === "productId") {
          const product = products.find(
            (item) =>
              item.id === Number(value),
          );

          if (
            product &&
            type === InvoiceType.Sales
          ) {
            next.unitPrice = String(
              product.salesPrice,
            );
          }

          if (
            type === InvoiceType.Purchase
          ) {
            next.unitPrice = "";
          }
        }

        return next;
      }),
    );
  }

  function addLine() {
    setPreview(null);

    setLines((previous) => [
      ...previous,
      emptyLine(),
    ]);
  }

  function removeLine(index) {
    if (lines.length === 1) return;

    setPreview(null);

    setLines((previous) =>
      previous.filter(
        (_, lineIndex) =>
          lineIndex !== index,
      ),
    );
  }

  function resetForm() {
    setCounterpartyId("");
    setDate(localToday());
    setDueDate(localToday());

    setLines([
      emptyLine(),
    ]);

    setPreview(null);
    setError("");
  }

  function buildRequest() {
    return {
      fiscalPeriodId:
        activePeriodId,

      counterpartyId:
        Number(counterpartyId),

      type: Number(type),

      date,

      dueDate,

      lines: lines.map((line) => ({
        productId:
          Number(line.productId),

        quantity:
          Number(line.quantity),

        unitPrice:
          Number(line.unitPrice),

        discountAmount:
          Number(
            line.discountAmount || 0,
          ),
      })),

      version: 1,
    };
  }

  function validateForm() {
    if (
      !activePeriodId ||
      !counterpartyId
    ) {
      return "Cari seçmelisiniz.";
    }

    if (
      !date ||
      !dueDate
    ) {
      return "Fatura ve vade tarihi zorunludur.";
    }

    if (dueDate < date) {
      return "Vade tarihi fatura tarihinden önce olamaz.";
    }

    if (
      activePeriod &&
      (date < activePeriod.startDate ||
        date > activePeriod.endDate)
    ) {
      return "Fatura tarihi aktif mali dönem içinde olmalıdır.";
    }

    if (lines.length === 0) {
      return "En az bir fatura satırı olmalıdır.";
    }

    const productIds = [];

    for (const line of lines) {
      const productId =
        Number(line.productId);

      const quantity =
        Number(line.quantity);

      const unitPrice =
        Number(line.unitPrice);

      const discount =
        Number(
          line.discountAmount || 0,
        );

      if (!productId) {
        return "Tüm satırlarda ürün seçilmelidir.";
      }

      if (
        !Number.isFinite(quantity) ||
        quantity <= 0
      ) {
        return "Miktar sıfırdan büyük olmalıdır.";
      }

      if (
        !Number.isFinite(unitPrice) ||
        unitPrice < 0
      ) {
        return "Birim fiyat geçersiz.";
      }

      if (
        !Number.isFinite(discount) ||
        discount < 0
      ) {
        return "İndirim geçersiz.";
      }

      productIds.push(productId);
    }

    if (
      new Set(productIds).size !==
      productIds.length
    ) {
      return "Aynı ürün faturada birden fazla satırda kullanılamaz.";
    }

    return null;
  }

  async function calculatePreview() {
    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setActionStatus("loading");
    setError("");

    try {
      const { data } = await api.post(
        `/companies/${activeCompanyId}/invoices/preview`,
        buildRequest(),
      );

      setPreview(data);

      setActionStatus("idle");
    } catch (error) {
      setActionStatus("idle");

      setError(
        error.response?.data?.message ??
          "Fatura önizlemesi hesaplanamadı.",
      );
    }
  }

  async function saveInvoice() {
    const validationError =
      validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    setActionStatus("loading");
    setError("");

    try {
      await api.post(
        `/companies/${activeCompanyId}/invoices`,
        buildRequest(),
      );

      resetForm();

      await loadData();

      setActionStatus("success");
    } catch (error) {
      setActionStatus("idle");

      setError(
        error.response?.data?.message ??
          "Fatura kaydedilemedi.",
      );
    }
  }

  async function approveInvoice(invoice) {
    const confirmed =
      window.confirm(
        `${invoice.number} numaralı fatura onaylansın mı?

Bu işlem muhasebe ve stok hareketlerini oluşturacaktır.`,
      );

    if (!confirmed) return;

    setError("");

    try {
      await api.post(
        `/companies/${activeCompanyId}/invoices/${invoice.id}/approve`,
        {
          version:
            invoice.version,

          idempotencyKey:
            `invoice-approve-${invoice.id}-${crypto.randomUUID()}`,
        },
      );

      await loadData();
    } catch (error) {
      setError(
        error.response?.data?.message ??
          "Fatura onaylanamadı.",
      );
    }
  }

  async function downloadPdf(invoice) {
    try {
      const response = await api.get(
        `/companies/${activeCompanyId}/invoices/${invoice.id}/pdf`,
        {
          responseType: "blob",
        },
      );

      const blob = new Blob(
        [response.data],
        {
          type: "application/pdf",
        },
      );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `fatura-${invoice.number}.pdf`;

      document.body.appendChild(link);

      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      setError(
        error.response?.data?.message ??
          "PDF indirilemedi.",
      );
    }
  }

  if (
    !activeCompany ||
    !activePeriod
  ) {
    return (
      <section className="container py-4">
        <div className="alert alert-warning">
          Fatura işlemleri için aktif
          şirket ve mali dönem
          seçmelisiniz.
        </div>
      </section>
    );
  }

  return (
    <section className="container-fluid px-lg-4 py-4">
      <header className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="h3">
            Fatura Yönetimi
          </h1>

          <p className="text-body-secondary mb-0">
            {activeCompany.name} ·{" "}
            {activePeriod.name}
          </p>
        </div>

        <div
          className="btn-group"
          role="group"
        >
          <button
            type="button"
            className={`btn ${
              type === InvoiceType.Sales
                ? "btn-primary"
                : "btn-outline-primary"
            }`}
            onClick={() =>
              setType(
                InvoiceType.Sales,
              )
            }
          >
            Satış Faturası
          </button>

          {canManageAccounting && (
            <button
              type="button"
              className={`btn ${
                type ===
                InvoiceType.Purchase
                  ? "btn-primary"
                  : "btn-outline-primary"
              }`}
              onClick={() =>
                setType(
                  InvoiceType.Purchase,
                )
              }
            >
              Alış Faturası
            </button>
          )}
        </div>
      </header>

      {activePeriod.status !== 1 && (
        <div className="alert alert-warning">
          Aktif mali dönem kilitlidir.
          Yeni fatura oluşturulamaz.
        </div>
      )}

      {error && (
        <div
          className="alert alert-danger"
          role="alert"
        >
          {error}
        </div>
      )}

      {canCreate &&
        activePeriod.status === 1 && (
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h2 className="h5 mb-0">
                Yeni{" "}
                {invoiceTypeLabel(type)}{" "}
                Faturası
              </h2>

              <span className="badge text-bg-secondary">
                Taslak
              </span>
            </div>

            <div className="card-body">
              <div className="row g-3 mb-4">
                <div className="col-lg-4">
                  <label className="form-label">
                    Cari
                  </label>

                  <select
                    className="form-select"
                    value={
                      counterpartyId
                    }
                    onChange={(event) => {
                      const value =
                        event.target.value;

                      setCounterpartyId(
                        value,
                      );

                      setPreview(null);

                      const party =
                        suitableParties.find(
                          (item) =>
                            item.id ===
                            Number(value),
                        );

                      if (party) {
                        setDueDate(
                          addDays(
                            date,
                            party.paymentTermDays,
                          ),
                        );
                      }
                    }}
                    required
                  >
                    <option value="">
                      Cari seçin
                    </option>

                    {suitableParties.map(
                      (party) => (
                        <option
                          key={party.id}
                          value={party.id}
                        >
                          {party.code} —{" "}
                          {party.name}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="col-md-6 col-lg-4">
                  <label className="form-label">
                    Fatura Tarihi
                  </label>

                  <input
                    type="date"
                    className="form-control"
                    min={
                      activePeriod.startDate
                    }
                    max={
                      activePeriod.endDate
                    }
                    value={date}
                    onChange={(event) => {
                      const nextDate =
                        event.target.value;

                      setDate(nextDate);

                      setPreview(null);

                      const party =
                        suitableParties.find(
                          (item) =>
                            item.id ===
                            Number(
                              counterpartyId,
                            ),
                        );

                      if (party) {
                        setDueDate(
                          addDays(
                            nextDate,
                            party.paymentTermDays,
                          ),
                        );
                      }
                    }}
                    required
                  />
                </div>

                <div className="col-md-6 col-lg-4">
                  <label className="form-label">
                    Vade Tarihi
                  </label>

                  <input
                    type="date"
                    className="form-control"
                    min={date}
                    value={dueDate}
                    onChange={(event) => {
                      setDueDate(
                        event.target.value,
                      );

                      setPreview(null);
                    }}
                    required
                  />
                </div>
              </div>

              <div className="table-responsive">
                <table className="table align-middle">
                  <thead>
                    <tr>
                      <th
                        style={{
                          minWidth: 260,
                        }}
                      >
                        Ürün
                      </th>

                      <th
                        style={{
                          minWidth: 120,
                        }}
                      >
                        Miktar
                      </th>

                      <th
                        style={{
                          minWidth: 150,
                        }}
                      >
                        Birim Fiyat
                      </th>

                      <th
                        style={{
                          minWidth: 140,
                        }}
                      >
                        İndirim
                      </th>

                      <th
                        style={{
                          minWidth: 100,
                        }}
                      >
                        KDV
                      </th>

                      <th
                        className="text-end"
                        style={{
                          minWidth: 150,
                        }}
                      >
                        Toplam
                      </th>

                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {lines.map(
                      (line, index) => {
                        const product =
                          products.find(
                            (item) =>
                              item.id ===
                              Number(
                                line.productId,
                              ),
                          );

                        const previewLine =
                          preview?.lines?.[
                            index
                          ];

                        return (
                          <tr key={index}>
                            <td>
                              <select
                                className="form-select"
                                value={
                                  line.productId
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateLine(
                                    index,
                                    "productId",
                                    event
                                      .target
                                      .value,
                                  )
                                }
                              >
                                <option value="">
                                  Ürün seçin
                                </option>

                                {products
                                  .filter(
                                    (
                                      product,
                                    ) =>
                                      product.isActive,
                                  )
                                  .map(
                                    (
                                      product,
                                    ) => (
                                      <option
                                        key={
                                          product.id
                                        }
                                        value={
                                          product.id
                                        }
                                      >
                                        {
                                          product.code
                                        }{" "}
                                        —{" "}
                                        {
                                          product.name
                                        }
                                      </option>
                                    ),
                                  )}
                              </select>
                            </td>

                            <td>
                              <input
                                type="number"
                                min="0.0001"
                                step="0.0001"
                                className="form-control text-end"
                                value={
                                  line.quantity
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateLine(
                                    index,
                                    "quantity",
                                    event
                                      .target
                                      .value,
                                  )
                                }
                              />
                            </td>

                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="form-control text-end"
                                value={
                                  line.unitPrice
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateLine(
                                    index,
                                    "unitPrice",
                                    event
                                      .target
                                      .value,
                                  )
                                }
                              />
                            </td>

                            <td>
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="form-control text-end"
                                value={
                                  line.discountAmount
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateLine(
                                    index,
                                    "discountAmount",
                                    event
                                      .target
                                      .value,
                                  )
                                }
                              />
                            </td>

                            <td>
                              {previewLine
                                ? `%${previewLine.taxRateSnapshot}`
                                : product
                                  ? "Otomatik"
                                  : "—"}
                            </td>

                            <td className="text-end fw-semibold">
                              {previewLine
                                ? money(
                                    previewLine.totalAmount,
                                  )
                                : "—"}
                            </td>

                            <td>
                              <button
                                type="button"
                                className="btn btn-outline-danger btn-sm"
                                disabled={
                                  lines.length ===
                                  1
                                }
                                onClick={() =>
                                  removeLine(
                                    index,
                                  )
                                }
                              >
                                <i className="bi bi-trash" />
                              </button>
                            </td>
                          </tr>
                        );
                      },
                    )}
                  </tbody>
                </table>
              </div>

              <button
                type="button"
                className="btn btn-outline-primary btn-sm"
                onClick={addLine}
              >
                <i className="bi bi-plus-lg me-1" />
                Satır Ekle
              </button>

              {preview && (
                <div className="row justify-content-end mt-4">
                  <div className="col-md-6 col-lg-4">
                    <div className="border rounded p-3">
                      <div className="d-flex justify-content-between mb-2">
                        <span>
                          Ara Toplam
                        </span>

                        <strong>
                          {money(
                            preview.netTotal,
                          )}
                        </strong>
                      </div>

                      <div className="d-flex justify-content-between mb-2">
                        <span>KDV</span>

                        <strong>
                          {money(
                            preview.taxTotal,
                          )}
                        </strong>
                      </div>

                      <hr />

                      <div className="d-flex justify-content-between fs-5">
                        <strong>
                          Genel Toplam
                        </strong>

                        <strong>
                          {money(
                            preview.grandTotal,
                          )}
                        </strong>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="card-footer d-flex flex-wrap justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-outline-secondary"
                onClick={resetForm}
              >
                Temizle
              </button>

              <button
                type="button"
                className="btn btn-outline-primary"
                disabled={
                  actionStatus ===
                  "loading"
                }
                onClick={
                  calculatePreview
                }
              >
                <i className="bi bi-calculator me-1" />
                Hesapla
              </button>

              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  actionStatus ===
                  "loading"
                }
                onClick={saveInvoice}
              >
                Taslak Faturayı Kaydet
              </button>
            </div>
          </div>
        )}

      <div className="card">
        <div className="card-header d-flex justify-content-between align-items-center">
          <h2 className="h5 mb-0">
            Faturalar
          </h2>

          <span className="text-body-secondary">
            {totalCount} kayıt
          </span>
        </div>

        {status === "loading" ? (
          <div className="card-body">
            Faturalar yükleniyor…
          </div>
        ) : invoices.length === 0 ? (
          <div className="card-body">
            Bu dönemde fatura
            bulunmuyor.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle mb-0">
              <thead>
                <tr>
                  <th>Fatura No</th>
                  <th>Tarih</th>
                  <th>Vade</th>
                  <th>Tür</th>
                  <th className="text-end">
                    Net
                  </th>
                  <th className="text-end">
                    KDV
                  </th>
                  <th className="text-end">
                    Genel Toplam
                  </th>
                  <th>Durum</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {invoices.map(
                  (invoice) => (
                    <tr key={invoice.id}>
                      <td className="fw-semibold">
                        {invoice.number}
                      </td>

                      <td>
                        {invoice.date}
                      </td>

                      <td>
                        {invoice.dueDate}
                      </td>

                      <td>
                        {invoiceTypeLabel(
                          invoice.type,
                        )}
                      </td>

                      <td className="text-end">
                        {money(
                          invoice.netTotal,
                        )}
                      </td>

                      <td className="text-end">
                        {money(
                          invoice.taxTotal,
                        )}
                      </td>

                      <td className="text-end fw-semibold">
                        {money(
                          invoice.grandTotal,
                        )}
                      </td>

                      <td>
                        <span
                          className={`badge ${statusBadge(
                            invoice.status,
                          )}`}
                        >
                          {invoiceStatusLabel(
                            invoice.status,
                          )}
                        </span>
                      </td>

                      <td className="text-end text-nowrap">
                        <button
                          type="button"
                          className="btn btn-outline-secondary btn-sm me-2"
                          onClick={() =>
                            downloadPdf(
                              invoice,
                            )
                          }
                        >
                          <i className="bi bi-file-earmark-pdf me-1" />
                          PDF
                        </button>

                        {canManageAccounting &&
                          invoice.status ===
                            InvoiceStatus.Draft && (
                            <button
                              type="button"
                              className="btn btn-success btn-sm"
                              onClick={() =>
                                approveInvoice(
                                  invoice,
                                )
                              }
                            >
                              <i className="bi bi-check-lg me-1" />
                              Onayla
                            </button>
                          )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}