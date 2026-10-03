import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { useAccounting } from "../../context/useAccounting";
import { CompanyRole, treasuryTypeLabel } from "../../utils/accounting";
import { EmptyState, PageLoading } from "../../components/PageState";

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

export default function TransfersPage() {
  const { activeCompany, activeCompanyId, activePeriod, activePeriodId } =
    useAccounting();

  const [treasuries, setTreasuries] = useState([]);
  const [transfers, setTransfers] = useState([]);

  const [sourceAccountId, setSourceAccountId] = useState("");
  const [targetAccountId, setTargetAccountId] = useState("");
  const [date, setDate] = useState(localToday());
  const [amount, setAmount] = useState("");

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const role = activeCompany?.role;

  const canManage =
    role === CompanyRole.Admin || role === CompanyRole.Accountant;

  const activeTreasuries = useMemo(
    () => treasuries.filter((treasury) => treasury.isActive),
    [treasuries],
  );

  const loadData = useCallback(async (signal) => {
    if (!activeCompanyId || !activePeriodId) {
      return;
    }

    setStatus("loading");
    setError("");

    try {
      const [treasuryResponse, transferResponse] = await Promise.all([
        api.get(`/companies/${activeCompanyId}/treasury-accounts`, { signal }),

        api.get(`/companies/${activeCompanyId}/transfers`, {
          params: {
            periodId: activePeriodId,
          },
          signal,
        }),
      ]);

      if (signal?.aborted) return;

      setTreasuries(treasuryResponse.data ?? []);

      setTransfers(transferResponse.data ?? []);

      setStatus("success");
    } catch (error) {
      if (signal?.aborted) return;

      setStatus("error");

      setError(
        error.response?.data?.message ?? "Virman bilgileri yüklenemedi.",
      );
    }
  }, [activeCompanyId, activePeriodId]);

  useEffect(() => {
    if (!activeCompanyId || !activePeriodId) {
      return;
    }

    const controller = new AbortController();

    const timeoutId = setTimeout(() => loadData(controller.signal), 0);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeCompanyId, activePeriodId, loadData]);

  function treasuryName(id) {
    const treasury = treasuries.find((item) => item.id === id);

    return treasury ? treasury.name : `#${id}`;
  }

  async function createTransfer(event) {
    event.preventDefault();

    if (!sourceAccountId || !targetAccountId) {
      setError("Kaynak ve hedef hesap seçmelisiniz.");

      return;
    }

    if (sourceAccountId === targetAccountId) {
      setError("Kaynak ve hedef hesap farklı olmalıdır.");

      return;
    }

    const numericAmount = Number(amount);

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Virman tutarı sıfırdan büyük olmalıdır.");

      return;
    }

    setStatus("loading");
    setError("");

    try {
      await api.post(`/companies/${activeCompanyId}/transfers`, {
        fiscalPeriodId: activePeriodId,

        sourceAccountId: Number(sourceAccountId),

        targetAccountId: Number(targetAccountId),

        date,

        amount: numericAmount,

        idempotencyKey: `transfer-${crypto.randomUUID()}`,
      });

      setSourceAccountId("");
      setTargetAccountId("");
      setAmount("");

      await loadData();

      setStatus("success");
    } catch (error) {
      setStatus("error");

      setError(error.response?.data?.message ?? "Virman oluşturulamadı.");
    }
  }

  if (!activeCompany || !activePeriod) {
    return (
      <section className='container py-4'>
        <div className='alert alert-warning'>
          Virman işlemleri için aktif şirket ve mali dönem seçmelisiniz.
        </div>
      </section>
    );
  }

  return (
    <section className='container-fluid px-lg-4 py-4'>
      <header className='mb-4'>
        <h1 className='h3'>Kasa / Banka Virman</h1>

        <p className='text-body-secondary mb-0'>
          {activeCompany.name} · {activePeriod.name}
        </p>
      </header>

      {error && <div className='alert alert-danger'>{error}</div>}

      {canManage && activePeriod.status === 1 && (
        <form className='card mb-4' onSubmit={createTransfer}>
          <div className='card-header'>
            <h2 className='h5 mb-0'>Yeni Virman</h2>
          </div>

          <div className='card-body'>
            <div className='row g-3'>
              <div className='col-lg-3'>
                <label className='form-label'>Kaynak Hesap</label>

                <select
                  className='form-select'
                  value={sourceAccountId}
                  onChange={(event) => setSourceAccountId(event.target.value)}
                  required
                >
                  <option value=''>Kaynak seçin</option>

                  {activeTreasuries.map((treasury) => (
                    <option key={treasury.id} value={treasury.id}>
                      {treasury.name} — {treasuryTypeLabel(treasury.type)}
                    </option>
                  ))}
                </select>
              </div>

              <div className='col-lg-3'>
                <label className='form-label'>Hedef Hesap</label>

                <select
                  className='form-select'
                  value={targetAccountId}
                  onChange={(event) => setTargetAccountId(event.target.value)}
                  required
                >
                  <option value=''>Hedef seçin</option>

                  {activeTreasuries
                    .filter(
                      (treasury) => treasury.id !== Number(sourceAccountId),
                    )
                    .map((treasury) => (
                      <option key={treasury.id} value={treasury.id}>
                        {treasury.name} — {treasuryTypeLabel(treasury.type)}
                      </option>
                    ))}
                </select>
              </div>

              <div className='col-lg-3'>
                <label className='form-label'>Tarih</label>

                <input
                  type='date'
                  className='form-control'
                  min={activePeriod.startDate}
                  max={activePeriod.endDate}
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </div>

              <div className='col-lg-3'>
                <label className='form-label'>Tutar</label>

                <input
                  type='number'
                  min='0.01'
                  step='0.01'
                  className='form-control'
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div className='card-footer text-end'>
            <button className='btn btn-primary' disabled={status === "loading"}>
              {status === "loading" ? (
                <>
                  <span
                    className='spinner-border spinner-border-sm me-2'
                    aria-hidden='true'
                  />
                  Virman Yapılıyor…
                </>
              ) : (
                <>
                  <i className='bi bi-arrow-left-right me-2' />
                  Virman Oluştur
                </>
              )}
            </button>
          </div>
        </form>
      )}

      <div className='card'>
        <div className='card-header'>
          <h2 className='h5 mb-0'>Virman Geçmişi</h2>
        </div>

        {status === "loading" ? (
          <PageLoading text='Virman hareketleri yükleniyor…' />
        ) : transfers.length === 0 ? (
          <div className='card-body'>
            <EmptyState
              icon='bi-arrow-left-right'
              title='Virman hareketi bulunmuyor'
              text='Bu mali dönemde kasa veya banka hesapları arasında henüz virman yapılmamış.'
            />
          </div>
        ) : (
          <div className='table-responsive'>
            <table className='table align-middle mb-0'>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Tarih</th>
                  <th>Kaynak</th>
                  <th>Hedef</th>
                  <th className='text-end'>Tutar</th>
                  <th>Yevmiye</th>
                </tr>
              </thead>

              <tbody>
                {transfers.map((transfer) => (
                  <tr key={transfer.id}>
                    <td>#{transfer.id}</td>

                    <td>{transfer.date}</td>

                    <td>{treasuryName(transfer.sourceAccountId)}</td>

                    <td>{treasuryName(transfer.targetAccountId)}</td>

                    <td className='text-end fw-semibold'>
                      {money(transfer.amount)}
                    </td>

                    <td>#{transfer.journalEntryId}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
