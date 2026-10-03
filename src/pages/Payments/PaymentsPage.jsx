import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { useAccounting } from "../../context/useAccounting";
import { ConfirmModal } from "../../components/ConfirmModal";
import {
  CompanyRole,
  InvoiceStatus,
  InvoiceType,
  PaymentDirection,
  PartyType,
  paymentDirectionLabel,
} from "../../utils/accounting";

function localToday() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function money(value) {
  return Number(value ?? 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function PaymentsPage() {
  const { activeCompany, activeCompanyId, activePeriod, activePeriodId } =
    useAccounting();

  const [direction, setDirection] = useState(PaymentDirection.Collection);
  const [paymentToReverse, setPaymentToReverse] = useState(null);
  const [counterparties, setCounterparties] = useState([]);

  const [treasuries, setTreasuries] = useState([]);

  const [payments, setPayments] = useState([]);

  const [openInvoices, setOpenInvoices] = useState([]);

  const [counterpartyId, setCounterpartyId] = useState("");

  const [treasuryAccountId, setTreasuryAccountId] = useState("");

  const [date, setDate] = useState(localToday());

  const [allocations, setAllocations] = useState({});

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const role = activeCompany?.role;

  const canManage =
    role === CompanyRole.Admin || role === CompanyRole.Accountant;

  const suitableParties = useMemo(() => {
    return counterparties.filter((party) => {
      if (!party.isActive) return false;

      if (direction === PaymentDirection.Collection) {
        return (
          party.type === PartyType.Customer || party.type === PartyType.Both
        );
      }

      return party.type === PartyType.Supplier || party.type === PartyType.Both;
    });
  }, [counterparties, direction]);

  const amount = useMemo(
    () =>
      Object.values(allocations).reduce(
        (total, value) => total + Number(value || 0),
        0,
      ),
    [allocations],
  );

  const loadBaseData = useCallback(async (signal) => {
    if (!activeCompanyId || !activePeriodId) {
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const [counterpartiesResponse, treasuryResponse, paymentResponse] =
        await Promise.all([
          api.get(`/companies/${activeCompanyId}/counterparties`, {
            params: {
              page: 1,
              pageSize: 100,
            },
            signal,
          }),

          api.get(`/companies/${activeCompanyId}/treasury-accounts`, {
            signal,
          }),

          api.get(`/companies/${activeCompanyId}/payments`, {
            params: {
              periodId: activePeriodId,
              page: 1,
              pageSize: 100,
            },
            signal,
          }),
        ]);

      if (signal?.aborted) return;

      setCounterparties(counterpartiesResponse.data?.items ?? []);

      setTreasuries(treasuryResponse.data ?? []);

      setPayments(paymentResponse.data?.items ?? []);

      setStatus("success");
    } catch (error) {
      if (signal?.aborted) return;

      setStatus("error");

      setError(
        error.response?.data?.message ??
          "Tahsilat/ödeme bilgileri yüklenemedi.",
      );
    }
  }, [activeCompanyId, activePeriodId]);

  useEffect(() => {
    if (!activeCompanyId || !activePeriodId) {
      return;
    }

    const controller = new AbortController();

    const timeoutId = setTimeout(() => loadBaseData(controller.signal), 0);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeCompanyId, activePeriodId, loadBaseData]);

  const paymentDirection = direction;
  const [previousPaymentDirection, setPreviousPaymentDirection] = useState(paymentDirection);

  if (previousPaymentDirection !== paymentDirection) {
    setPreviousPaymentDirection(paymentDirection);
    setCounterpartyId("");
    setOpenInvoices([]);
    setAllocations({});
  }

  async function loadOpenInvoices(partyId) {
    setCounterpartyId(partyId);
    setOpenInvoices([]);
    setAllocations({});
    setError("");

    if (!partyId) return;

    try {
      const invoiceType =
        direction === PaymentDirection.Collection
          ? InvoiceType.Sales
          : InvoiceType.Purchase;

      const { data } = await api.get(`/companies/${activeCompanyId}/invoices`, {
        params: {
          periodId: activePeriodId,
          counterpartyId: partyId,
          type: invoiceType,
          page: 1,
          pageSize: 100,
        },
      });

      const candidates = (data.items ?? []).filter(
        (invoice) =>
          invoice.status === InvoiceStatus.Approved ||
          invoice.status === InvoiceStatus.PartiallyPaid,
      );

      const detailResponses = await Promise.all(
        candidates.map((invoice) =>
          api.get(`/companies/${activeCompanyId}/invoices/${invoice.id}`),
        ),
      );

      setOpenInvoices(
        detailResponses
          .map((response) => ({
            ...response.data.invoice,

            paidAmount: response.data.paidAmount,

            remainingAmount: response.data.remainingAmount,
          }))
          .filter((invoice) => Number(invoice.remainingAmount) > 0),
      );
    } catch (error) {
      setError(error.response?.data?.message ?? "Açık faturalar yüklenemedi.");
    }
  }

  function updateAllocation(invoice, value) {
    const number = Number(value || 0);

    const limited = Math.min(
      Math.max(number, 0),
      Number(invoice.remainingAmount),
    );

    setAllocations((previous) => ({
      ...previous,
      [invoice.id]: limited,
    }));
  }

  function payFull(invoice) {
    setAllocations((previous) => ({
      ...previous,
      [invoice.id]: Number(invoice.remainingAmount),
    }));
  }

  async function createPayment(event) {
    event.preventDefault();

    const selectedAllocations = Object.entries(allocations)
      .filter(([, value]) => Number(value) > 0)
      .map(([invoiceId, value]) => ({
        invoiceId: Number(invoiceId),

        amount: Number(value),
      }));

    if (!counterpartyId || !treasuryAccountId) {
      setError("Cari ve kasa/banka seçmelisiniz.");
      return;
    }

    if (amount <= 0 || selectedAllocations.length === 0) {
      setError("En az bir faturaya ödeme dağıtmalısınız.");
      return;
    }

    setStatus("loading");
    setError("");

    try {
      await api.post(`/companies/${activeCompanyId}/payments`, {
        fiscalPeriodId: activePeriodId,

        counterpartyId: Number(counterpartyId),

        treasuryAccountId: Number(treasuryAccountId),

        direction: Number(direction),

        date,

        amount,

        allocations: selectedAllocations,

        idempotencyKey: `payment-${crypto.randomUUID()}`,
      });

      setAllocations({});
      setCounterpartyId("");
      setOpenInvoices([]);

      await loadBaseData();

      setStatus("success");
    } catch (error) {
      setStatus("error");

      setError(
        error.response?.data?.message ?? "Tahsilat/ödeme oluşturulamadı.",
      );
    }
  }

  async function reversePayment(payment, reason) {
    const reversalDate = date && date >= payment.date ? date : payment.date;

    await api.post(
      `/companies/${activeCompanyId}/payments/${payment.id}/reverse`,
      {
        version: payment.version,

        idempotencyKey: `payment-reverse-${payment.id}-${crypto.randomUUID()}`,

        date: reversalDate,

        fiscalPeriodId: activePeriodId,

        reason: reason.trim(),
      },
    );

    await loadBaseData();
  }
  function partyName(id) {
    const party = counterparties.find((item) => item.id === id);

    return party ? `${party.code} — ${party.name}` : `#${id}`;
  }

  function treasuryName(id) {
    return treasuries.find((item) => item.id === id)?.name ?? `#${id}`;
  }

  if (!activeCompany || !activePeriod) {
    return (
      <section className='container py-4'>
        <div className='alert alert-warning'>
          Tahsilat/ödeme işlemleri için aktif şirket ve dönem seçin.
        </div>
      </section>
    );
  }

  return (
    <section className='container-fluid px-lg-4 py-4'>
      <header className='d-flex flex-wrap justify-content-between gap-3 mb-4'>
        <div>
          <h1 className='h3'>Tahsilat ve Ödemeler</h1>

          <p className='text-body-secondary mb-0'>
            {activeCompany.name} · {activePeriod.name}
          </p>
        </div>

        {canManage && (
          <div className='btn-group'>
            <button
              type='button'
              className={`btn ${
                direction === PaymentDirection.Collection
                  ? "btn-success"
                  : "btn-outline-success"
              }`}
              onClick={() => setDirection(PaymentDirection.Collection)}
            >
              Tahsilat
            </button>

            <button
              type='button'
              className={`btn ${
                direction === PaymentDirection.Disbursement
                  ? "btn-danger"
                  : "btn-outline-danger"
              }`}
              onClick={() => setDirection(PaymentDirection.Disbursement)}
            >
              Ödeme
            </button>
          </div>
        )}
      </header>

      {error && <div className='alert alert-danger'>{error}</div>}

      {canManage && activePeriod.status === 1 && (
        <form className='card mb-4' onSubmit={createPayment}>
          <div className='card-header'>
            <h2 className='h5 mb-0'>Yeni {paymentDirectionLabel(direction)}</h2>
          </div>

          <div className='card-body'>
            <div className='row g-3 mb-4'>
              <div className='col-lg-4'>
                <label className='form-label'>Cari</label>

                <select
                  className='form-select'
                  value={counterpartyId}
                  onChange={(event) => loadOpenInvoices(event.target.value)}
                >
                  <option value=''>Cari seçin</option>

                  {suitableParties.map((party) => (
                    <option key={party.id} value={party.id}>
                      {party.code} — {party.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className='col-lg-4'>
                <label className='form-label'>Kasa / Banka</label>

                <select
                  className='form-select'
                  value={treasuryAccountId}
                  onChange={(event) => setTreasuryAccountId(event.target.value)}
                >
                  <option value=''>Hesap seçin</option>

                  {treasuries
                    .filter((item) => item.isActive)
                    .map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                </select>
              </div>

              <div className='col-lg-4'>
                <label className='form-label'>Tarih</label>

                <input
                  type='date'
                  className='form-control'
                  min={activePeriod.startDate}
                  max={activePeriod.endDate}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </div>
            </div>

            {!counterpartyId ? (
              <div className='alert alert-light border'>
                Açık faturaları görmek için cari seçin.
              </div>
            ) : openInvoices.length === 0 ? (
              <div className='alert alert-light border'>
                Bu cariye ait ödenebilir fatura bulunmuyor.
              </div>
            ) : (
              <div className='table-responsive'>
                <table className='table align-middle'>
                  <thead>
                    <tr>
                      <th>Fatura</th>
                      <th>Tarih</th>
                      <th>Vade</th>
                      <th className='text-end'>Toplam</th>
                      <th className='text-end'>Ödenen</th>
                      <th className='text-end'>Kalan</th>
                      <th
                        style={{
                          minWidth: 180,
                        }}
                      >
                        Dağıtım
                      </th>
                      <th></th>
                    </tr>
                  </thead>

                  <tbody>
                    {openInvoices.map((invoice) => (
                      <tr key={invoice.id}>
                        <td className='fw-semibold'>{invoice.number}</td>

                        <td>{invoice.date}</td>

                        <td>{invoice.dueDate}</td>

                        <td className='text-end'>
                          {money(invoice.grandTotal)}
                        </td>

                        <td className='text-end'>
                          {money(invoice.paidAmount)}
                        </td>

                        <td className='text-end fw-semibold'>
                          {money(invoice.remainingAmount)}
                        </td>

                        <td>
                          <input
                            type='number'
                            min='0'
                            max={invoice.remainingAmount}
                            step='0.01'
                            className='form-control text-end'
                            value={allocations[invoice.id] ?? ""}
                            onChange={(event) =>
                              updateAllocation(invoice, event.target.value)
                            }
                          />
                        </td>

                        <td>
                          <button
                            type='button'
                            className='btn btn-outline-primary btn-sm'
                            onClick={() => payFull(invoice)}
                          >
                            Tamamı
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>

                  <tfoot>
                    <tr>
                      <th colSpan={6}>Toplam</th>

                      <th className='text-end fs-5'>{money(amount)}</th>

                      <th></th>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          <div className='card-footer text-end'>
            <button
              className={`btn ${
                direction === PaymentDirection.Collection
                  ? "btn-success"
                  : "btn-danger"
              }`}
              disabled={amount <= 0 || status === "loading"}
            >
              {paymentDirectionLabel(direction)} Oluştur
            </button>
          </div>
        </form>
      )}

      <div className='card'>
        <div className='card-header'>
          <h2 className='h5 mb-0'>Tahsilat / Ödeme Geçmişi</h2>
        </div>

        {payments.length === 0 ? (
          <div className='card-body'>Henüz kayıt bulunmuyor.</div>
        ) : (
          <div className='table-responsive'>
            <table className='table align-middle mb-0'>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tarih</th>
                  <th>Tür</th>
                  <th>Cari</th>
                  <th>Kasa/Banka</th>
                  <th className='text-end'>Tutar</th>
                  <th>Durum</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id}>
                    <td>#{payment.id}</td>

                    <td>{payment.date}</td>

                    <td>{paymentDirectionLabel(payment.direction)}</td>

                    <td>{partyName(payment.counterpartyId)}</td>

                    <td>{treasuryName(payment.treasuryAccountId)}</td>

                    <td className='text-end fw-semibold'>
                      {money(payment.amount)}
                    </td>

                    <td>
                      {payment.isReversed ? (
                        <span className='badge text-bg-secondary'>
                          Terslendi
                        </span>
                      ) : (
                        <span className='badge text-bg-success'>Aktif</span>
                      )}
                    </td>

                    <td className='text-end'>
                      {canManage && !payment.isReversed && (
                        <button
                          type='button'
                          className='btn btn-outline-danger btn-sm'
                          onClick={() => setPaymentToReverse(payment)}
                        >
                          Tersle
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <ConfirmModal
        show={paymentToReverse !== null}
        title='Tahsilat / ödeme terslensin mi?'
        body={
          paymentToReverse
            ? `#${paymentToReverse.id} numaralı ${paymentDirectionLabel(
                paymentToReverse.direction,
              ).toLowerCase()} kaydı terslenecektir. Orijinal kayıt silinmeyecektir.`
            : ""
        }
        icon='warning'
        confirmText='Ters Kayıt Oluştur'
        confirmButtonColor='#dc3545'
        loadingText='Ters kayıt oluşturuluyor…'
        successTitle='İşlem Terslendi'
        successText='Muhasebe ve fatura bakiyeleri ters kayıt ile güncellendi.'
        errorTitle='İşlem Terslenemedi'
        errorText='Tahsilat/ödeme terslenirken bir hata oluştu.'
        input='textarea'
        inputLabel='Ters kayıt gerekçesi'
        inputPlaceholder='Örn. Hatalı tahsilat kaydı'
        inputValidator={(value) => {
          if (!value || !value.trim()) {
            return "Ters kayıt gerekçesi zorunludur.";
          }

          if (value.trim().length > 500) {
            return "Gerekçe en fazla 500 karakter olabilir.";
          }

          return undefined;
        }}
        onConfirm={(reason) => reversePayment(paymentToReverse, reason)}
        onClose={() => setPaymentToReverse(null)}
      />
    </section>
  );
}
