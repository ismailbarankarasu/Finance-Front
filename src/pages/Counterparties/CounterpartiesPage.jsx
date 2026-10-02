import { useEffect, useState } from "react";
import api from "../../api/client";
import { useAccounting } from "../../context/useAccounting";
import {
  CompanyRole,
  PartyType,
  partyTypeLabel,
} from "../../utils/accounting";

const initialForm = {
  code: "",
  name: "",
  type: PartyType.Customer,
  taxNumber: "",
  email: "",
  phone: "",
  address: "",
  paymentTermDays: 0,
};

function money(value) {
  return Number(value ?? 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function balanceLabel(value) {
  const amount = Number(value ?? 0);

  if (amount > 0) {
    return `${money(amount)} Borç`;
  }

  if (amount < 0) {
    return `${money(Math.abs(amount))} Alacak`;
  }

  return "0,00";
}

export default function CounterpartiesPage() {
  const {
    activeCompany,
    activeCompanyId,
    activePeriod,
    activePeriodId,
  } = useAccounting();

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const [appliedSearch, setAppliedSearch] =
    useState("");
  const [appliedType, setAppliedType] =
    useState("");

  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [selectedParty, setSelectedParty] =
    useState(null);

  const [statement, setStatement] =
    useState(null);

  const [statementStatus, setStatementStatus] =
    useState("idle");

  const [statementError, setStatementError] =
    useState("");

  const [form, setForm] = useState(initialForm);

  const [submitStatus, setSubmitStatus] =
    useState("idle");

  const [submitError, setSubmitError] =
    useState("");

  const role = activeCompany?.role;

  const canCreateCustomer =
    role === CompanyRole.Admin ||
    role === CompanyRole.Accountant ||
    role === CompanyRole.Sales;

  const canCreateSupplier =
    role === CompanyRole.Admin ||
    role === CompanyRole.Accountant;

  const canDeactivate =
    role === CompanyRole.Admin ||
    role === CompanyRole.Accountant;

  const totalPages = Math.max(
    1,
    Math.ceil(totalCount / pageSize),
  );

  async function loadParties(signal) {
    if (!activeCompanyId) return;

    setStatus("loading");
    setError("");

    try {
      const { data } = await api.get(
        `/companies/${activeCompanyId}/counterparties`,
        {
          params: {
            q: appliedSearch || undefined,
            type: appliedType || undefined,
            page,
            pageSize,
          },
          signal,
        },
      );

      if (!Array.isArray(data?.items)) {
        throw new Error(
          "Cari listesi yanıtı geçersiz.",
        );
      }

      setRows(data.items);
      setTotalCount(
        Number(data.totalCount ?? 0),
      );

      setStatus("success");
    } catch (error) {
      if (signal?.aborted) return;

      setStatus("error");

      setError(
        error.response?.data?.message ??
          "Cari hesaplar yüklenemedi.",
      );
    }
  }

  useEffect(() => {
    if (!activeCompanyId) {
      setRows([]);
      setSelectedParty(null);
      setStatement(null);
      return;
    }

    const controller =
      new AbortController();

    loadParties(controller.signal);

    return () => controller.abort();
  }, [
    activeCompanyId,
    appliedSearch,
    appliedType,
    page,
  ]);

  useEffect(() => {
    setSelectedParty(null);
    setStatement(null);
  }, [activeCompanyId, activePeriodId]);

  function updateForm(field, value) {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  }

  function applyFilters(event) {
    event.preventDefault();

    setPage(1);
    setAppliedSearch(search.trim());
    setAppliedType(typeFilter);
  }

  function resetFilters() {
    setSearch("");
    setTypeFilter("");

    setAppliedSearch("");
    setAppliedType("");

    setPage(1);
  }

  async function loadStatement(party) {
    if (
      !activeCompanyId ||
      !activePeriodId
    ) {
      return;
    }

    setSelectedParty(party);

    setStatementStatus("loading");
    setStatementError("");
    setStatement(null);

    try {
      const { data } = await api.get(
        `/companies/${activeCompanyId}/counterparties/${party.id}/statement`,
        {
          params: {
            periodId: activePeriodId,
          },
        },
      );

      setStatement(data);
      setStatementStatus("success");
    } catch (error) {
      setStatementStatus("error");

      setStatementError(
        error.response?.data?.message ??
          "Cari ekstre alınamadı.",
      );
    }
  }

  async function createParty(event) {
    event.preventDefault();

    const code = form.code.trim();
    const name = form.name.trim();
    const email = form.email.trim();

    if (!code || !name) {
      setSubmitError(
        "Cari kodu ve adı zorunludur.",
      );
      return;
    }

    if (
      form.type !== PartyType.Customer &&
      !canCreateSupplier
    ) {
      setSubmitError(
        "Bu cari türünü oluşturmaya yetkiniz yok.",
      );
      return;
    }

    setSubmitStatus("loading");
    setSubmitError("");

    try {
      await api.post(
        `/companies/${activeCompanyId}/counterparties`,
        {
          code,
          name,

          type: Number(form.type),

          taxNumber:
            form.taxNumber.trim() || null,

          email: email || null,

          phone:
            form.phone.trim() || null,

          address:
            form.address.trim() || null,

          paymentTermDays: Number(
            form.paymentTermDays,
          ),

          isActive: true,

          version: 1,
        },
      );

      setForm({
        ...initialForm,
        type: PartyType.Customer,
      });

      await loadParties();

      setSubmitStatus("success");
    } catch (error) {
      setSubmitStatus("error");

      setSubmitError(
        error.response?.data?.message ??
          "Cari kart oluşturulamadı.",
      );
    }
  }

  async function deactivateParty(party) {
    const confirmed = window.confirm(
      `${party.name} cari kartı pasif hale getirilsin mi?`,
    );

    if (!confirmed) return;

    try {
      await api.delete(
        `/companies/${activeCompanyId}/counterparties/${party.id}`,
      );

      if (selectedParty?.id === party.id) {
        setSelectedParty(null);
        setStatement(null);
      }

      await loadParties();
    } catch (error) {
      setError(
        error.response?.data?.message ??
          "Cari kart pasif hale getirilemedi.",
      );
    }
  }

  if (!activeCompany) {
    return (
      <section className="container py-4">
        <div className="alert alert-warning">
          Cari hesapları görüntülemek için
          önce aktif şirket seçmelisiniz.
        </div>
      </section>
    );
  }

  return (
    <section className="container-fluid px-lg-4 py-4">
      <header className="mb-4">
        <h1 className="h3">
          Cari Hesaplar
        </h1>

        <p className="text-body-secondary mb-0">
          {activeCompany.name} şirketinin
          müşteri ve tedarikçi kartlarını
          yönetin.
        </p>
      </header>

      <div className="row g-4">
        <div
          className={
            canCreateCustomer
              ? "col-xl-8"
              : "col-12"
          }
        >
          <div className="card mb-4">
            <div className="card-body">
              <form onSubmit={applyFilters}>
                <div className="row g-3 align-items-end">
                  <div className="col-md-6">
                    <label className="form-label">
                      Ara
                    </label>

                    <input
                      type="search"
                      className="form-control"
                      placeholder="Cari kodu veya adı"
                      value={search}
                      onChange={(event) =>
                        setSearch(
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="col-md-3">
                    <label className="form-label">
                      Cari Türü
                    </label>

                    <select
                      className="form-select"
                      value={typeFilter}
                      onChange={(event) =>
                        setTypeFilter(
                          event.target.value,
                        )
                      }
                    >
                      <option value="">
                        Tümü
                      </option>

                      <option
                        value={
                          PartyType.Customer
                        }
                      >
                        Müşteri
                      </option>

                      {role !==
                        CompanyRole.Sales && (
                        <>
                          <option
                            value={
                              PartyType.Supplier
                            }
                          >
                            Tedarikçi
                          </option>

                          <option
                            value={
                              PartyType.Both
                            }
                          >
                            Müşteri / Tedarikçi
                          </option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="col-md-3">
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-primary flex-grow-1"
                        type="submit"
                      >
                        Uygula
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={resetFilters}
                      >
                        Sıfırla
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </div>
          </div>

          <div className="card">
            <div className="card-header d-flex justify-content-between">
              <h2 className="h5 mb-0">
                Cari Kartlar
              </h2>

              <span className="text-body-secondary">
                {totalCount} kayıt
              </span>
            </div>

            {status === "loading" ? (
              <div className="card-body">
                <p
                  className="mb-0"
                  role="status"
                >
                  Cari hesaplar yükleniyor…
                </p>
              </div>
            ) : status === "error" ? (
              <div className="card-body">
                <div className="alert alert-danger mb-0">
                  {error}
                </div>
              </div>
            ) : rows.length === 0 ? (
              <div className="card-body">
                <p className="mb-0">
                  Cari kart bulunamadı.
                </p>
              </div>
            ) : (
              <>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Kod</th>
                        <th>Cari</th>
                        <th>Tür</th>
                        <th>Vergi No</th>
                        <th>Vade</th>
                        <th>Durum</th>
                        <th></th>
                      </tr>
                    </thead>

                    <tbody>
                      {rows.map((party) => (
                        <tr
                          key={party.id}
                          className={
                            selectedParty?.id ===
                            party.id
                              ? "table-primary"
                              : ""
                          }
                        >
                          <td>
                            <code>
                              {party.code}
                            </code>
                          </td>

                          <td>
                            <div className="fw-semibold">
                              {party.name}
                            </div>

                            {party.email && (
                              <div className="small text-body-secondary">
                                {party.email}
                              </div>
                            )}
                          </td>

                          <td>
                            {partyTypeLabel(
                              party.type,
                            )}
                          </td>

                          <td>
                            {party.taxNumber ||
                              "—"}
                          </td>

                          <td>
                            {party.paymentTermDays}{" "}
                            gün
                          </td>

                          <td>
                            <span
                              className={`badge ${
                                party.isActive
                                  ? "text-bg-success"
                                  : "text-bg-secondary"
                              }`}
                            >
                              {party.isActive
                                ? "Aktif"
                                : "Pasif"}
                            </span>
                          </td>

                          <td className="text-end text-nowrap">
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm me-2"
                              disabled={
                                !activePeriodId
                              }
                              onClick={() =>
                                loadStatement(
                                  party,
                                )
                              }
                            >
                              Ekstre
                            </button>

                            {canDeactivate &&
                              party.isActive && (
                                <button
                                  type="button"
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() =>
                                    deactivateParty(
                                      party,
                                    )
                                  }
                                >
                                  Pasif Yap
                                </button>
                              )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="card-footer d-flex justify-content-between align-items-center">
                  <span className="small text-body-secondary">
                    Sayfa {page} /{" "}
                    {totalPages}
                  </span>

                  <div className="btn-group">
                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      disabled={page <= 1}
                      onClick={() =>
                        setPage(
                          (previous) =>
                            previous - 1,
                        )
                      }
                    >
                      Önceki
                    </button>

                    <button
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      disabled={
                        page >= totalPages
                      }
                      onClick={() =>
                        setPage(
                          (previous) =>
                            previous + 1,
                        )
                      }
                    >
                      Sonraki
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {canCreateCustomer && (
          <div className="col-xl-4">
            <div className="card">
              <div className="card-header">
                <h2 className="h5 mb-0">
                  Yeni Cari Kart
                </h2>
              </div>

              <div className="card-body">
                <form onSubmit={createParty}>
                  <div className="mb-3">
                    <label className="form-label">
                      Cari Kodu
                    </label>

                    <input
                      className="form-control"
                      maxLength={30}
                      required
                      placeholder="Örn. MUS-001"
                      value={form.code}
                      onChange={(event) =>
                        updateForm(
                          "code",
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      Cari Adı
                    </label>

                    <input
                      className="form-control"
                      required
                      value={form.name}
                      onChange={(event) =>
                        updateForm(
                          "name",
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      Tür
                    </label>

                    <select
                      className="form-select"
                      value={form.type}
                      onChange={(event) =>
                        updateForm(
                          "type",
                          Number(
                            event.target
                              .value,
                          ),
                        )
                      }
                    >
                      <option
                        value={
                          PartyType.Customer
                        }
                      >
                        Müşteri
                      </option>

                      {canCreateSupplier && (
                        <>
                          <option
                            value={
                              PartyType.Supplier
                            }
                          >
                            Tedarikçi
                          </option>

                          <option
                            value={
                              PartyType.Both
                            }
                          >
                            Müşteri / Tedarikçi
                          </option>
                        </>
                      )}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      Vergi Numarası
                    </label>

                    <input
                      className="form-control"
                      value={form.taxNumber}
                      onChange={(event) =>
                        updateForm(
                          "taxNumber",
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      E-posta
                    </label>

                    <input
                      type="email"
                      className="form-control"
                      value={form.email}
                      onChange={(event) =>
                        updateForm(
                          "email",
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      Telefon
                    </label>

                    <input
                      className="form-control"
                      value={form.phone}
                      onChange={(event) =>
                        updateForm(
                          "phone",
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      Adres
                    </label>

                    <textarea
                      className="form-control"
                      rows={2}
                      value={form.address}
                      onChange={(event) =>
                        updateForm(
                          "address",
                          event.target.value,
                        )
                      }
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">
                      Varsayılan Vade
                    </label>

                    <div className="input-group">
                      <input
                        type="number"
                        min="0"
                        max="3650"
                        className="form-control"
                        value={
                          form.paymentTermDays
                        }
                        onChange={(event) =>
                          updateForm(
                            "paymentTermDays",
                            event.target.value,
                          )
                        }
                      />

                      <span className="input-group-text">
                        gün
                      </span>
                    </div>
                  </div>

                  {submitError && (
                    <div className="alert alert-danger">
                      {submitError}
                    </div>
                  )}

                  {submitStatus ===
                    "success" && (
                    <div className="alert alert-success">
                      Cari kart oluşturuldu.
                    </div>
                  )}

                  <button
                    className="btn btn-primary w-100"
                    type="submit"
                    disabled={
                      submitStatus ===
                      "loading"
                    }
                  >
                    {submitStatus ===
                    "loading"
                      ? "Kaydediliyor…"
                      : "Cari Kart Oluştur"}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>

      {selectedParty && (
        <div className="card mt-4">
          <div className="card-header d-flex flex-wrap justify-content-between gap-3">
            <div>
              <h2 className="h5 mb-1">
                {selectedParty.code} —{" "}
                {selectedParty.name}
              </h2>

              <span className="text-body-secondary">
                {activePeriod?.name} Cari
                Ekstresi
              </span>
            </div>

            {statement && (
              <div className="text-end">
                <div className="small text-body-secondary">
                  Güncel Bakiye
                </div>

                <strong
                  className={
                    Number(
                      statement.closingBalance,
                    ) > 0
                      ? "text-danger"
                      : Number(
                            statement.closingBalance,
                          ) < 0
                        ? "text-success"
                        : ""
                  }
                >
                  {balanceLabel(
                    statement.closingBalance,
                  )}
                </strong>
              </div>
            )}
          </div>

          {statementStatus === "loading" ? (
            <div className="card-body">
              <p
                className="mb-0"
                role="status"
              >
                Cari ekstre yükleniyor…
              </p>
            </div>
          ) : statementStatus === "error" ? (
            <div className="card-body">
              <div className="alert alert-danger mb-0">
                {statementError}
              </div>
            </div>
          ) : statement ? (
            <>
              <div className="card-body border-bottom">
                <div className="row g-3">
                  <div className="col-md-4">
                    <div className="border rounded p-3 h-100">
                      <div className="text-body-secondary small">
                        Açılış Bakiyesi
                      </div>

                      <div className="fs-5 fw-semibold">
                        {balanceLabel(
                          statement.openingBalance,
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="border rounded p-3 h-100">
                      <div className="text-body-secondary small">
                        Kapanış Bakiyesi
                      </div>

                      <div className="fs-5 fw-semibold">
                        {balanceLabel(
                          statement.closingBalance,
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="col-md-4">
                    <div className="border rounded p-3 h-100">
                      <div className="text-body-secondary small">
                        Açık Fatura
                      </div>

                      <div className="fs-5 fw-semibold">
                        {
                          (
                            statement.currentOutstandingInvoices ??
                            []
                          ).length
                        }
                      </div>
                    </div>
                  </div>
                </div>

                <p className="small text-body-secondary mb-0 mt-3">
                  {
                    statement.balanceConvention
                  }
                </p>
              </div>

              <div className="card-header border-top-0">
                <h3 className="h6 mb-0">
                  Hesap Hareketleri
                </h3>
              </div>

              {statement.items?.length ? (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Tarih</th>
                        <th>Fiş No</th>
                        <th>Hesap</th>
                        <th>Kaynak</th>

                        <th className="text-end">
                          Borç
                        </th>

                        <th className="text-end">
                          Alacak
                        </th>

                        <th className="text-end">
                          Bakiye
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {statement.items.map(
                        (item, index) => (
                          <tr
                            key={`${item.entry.journalEntryId}-${item.entry.accountId}-${index}`}
                          >
                            <td>
                              {item.entry.date}
                            </td>

                            <td>
                              {
                                item.entry
                                  .number
                              }
                            </td>

                            <td>
                              {
                                item.entry
                                  .accountCode
                              }{" "}
                              —{" "}
                              {
                                item.entry
                                  .accountName
                              }
                            </td>

                            <td>
                              {
                                item.entry
                                  .sourceType
                              }
                            </td>

                            <td className="text-end">
                              {money(
                                item.entry
                                  .debit,
                              )}
                            </td>

                            <td className="text-end">
                              {money(
                                item.entry
                                  .credit,
                              )}
                            </td>

                            <td className="text-end fw-semibold">
                              {balanceLabel(
                                item.balance,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="card-body">
                  <p className="mb-0">
                    Bu dönemde cari hareket
                    bulunmuyor.
                  </p>
                </div>
              )}

              <div className="card-header border-top">
                <h3 className="h6 mb-0">
                  Açık ve Vadesi Geçen
                  Faturalar
                </h3>
              </div>

              {statement
                .currentOutstandingInvoices
                ?.length ? (
                <div className="table-responsive">
                  <table className="table table-sm align-middle mb-0">
                    <thead>
                      <tr>
                        <th>Fatura No</th>
                        <th>Tür</th>
                        <th>Vade</th>
                        <th>Durum</th>
                        <th className="text-end">
                          Kalan
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {statement.currentOutstandingInvoices.map(
                        (invoice) => (
                          <tr key={invoice.id}>
                            <td>
                              {invoice.number}
                            </td>

                            <td>
                              {invoice.type ===
                              1
                                ? "Satış"
                                : "Alış"}
                            </td>

                            <td>
                              {invoice.dueDate}
                            </td>

                            <td>
                              {invoice.isOverdue ? (
                                <span className="badge text-bg-danger">
                                  Vadesi Geçti
                                </span>
                              ) : (
                                <span className="badge text-bg-warning">
                                  Açık
                                </span>
                              )}
                            </td>

                            <td className="text-end fw-semibold">
                              {money(
                                invoice.remainingAmount,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="card-body">
                  <p className="mb-0">
                    Açık fatura bulunmuyor.
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}