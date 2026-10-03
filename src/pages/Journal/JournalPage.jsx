import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../../api/client";
import { useAccounting } from "../../context/useAccounting";
import {
  CompanyRole,
  JournalStatus,
  journalStatusLabel,
} from "../../utils/accounting";
import { ConfirmModal } from "../../components/ConfirmModal";

import { EmptyState, PageError, PageLoading } from "../../components/PageState";
function localToday() {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function emptyLine() {
  return {
    accountId: "",
    debit: "",
    credit: "",
    counterpartyId: "",
    treasuryAccountId: "",
    description: "",
  };
}

function numberValue(value) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function money(value) {
  return Number(value).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function JournalPage() {
  const { activeCompany, activeCompanyId, activePeriod, activePeriodId } =
    useAccounting();

  const [accounts, setAccounts] = useState([]);
  const [counterparties, setCounterparties] = useState([]);
  const [treasuries, setTreasuries] = useState([]);

  const [journals, setJournals] = useState([]);

  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const [description, setDescription] = useState("");
  const [date, setDate] = useState(localToday());

  const [lines, setLines] = useState([emptyLine(), emptyLine()]);

  const [saveStatus, setSaveStatus] = useState("idle");
  const [saveError, setSaveError] = useState("");
  const [journalToPost, setJournalToPost] = useState(null);

  const [journalToReverse, setJournalToReverse] = useState(null);
  const canWrite =
    activeCompany?.role === CompanyRole.Admin ||
    activeCompany?.role === CompanyRole.Accountant;
  const reversedJournalIds = useMemo(
    () =>
      new Set(
        journals
          .filter((journal) => journal.reversalOfId != null)
          .map((journal) => journal.reversalOfId),
      ),
    [journals],
  );
  const postingAccounts = useMemo(
    () =>
      accounts.filter(
        (account) => account.isActive && account.isPostingAllowed,
      ),
    [accounts],
  );

  const debitTotal = useMemo(
    () => lines.reduce((total, line) => total + numberValue(line.debit), 0),
    [lines],
  );

  const creditTotal = useMemo(
    () => lines.reduce((total, line) => total + numberValue(line.credit), 0),
    [lines],
  );

  const difference = debitTotal - creditTotal;

  const linesValid = lines.every((line) => {
    if (!line.accountId) return false;

    const debit = numberValue(line.debit);
    const credit = numberValue(line.credit);

    if (debit < 0 || credit < 0) return false;

    if (debit > 0 === credit > 0) {
      return false;
    }

    const account = accounts.find((item) => item.id === Number(line.accountId));

    if (account?.requiredDimension === "Counterparty" && !line.counterpartyId) {
      return false;
    }

    if (account?.requiredDimension === "Treasury" && !line.treasuryAccountId) {
      return false;
    }

    return true;
  });

  const isBalanced =
    debitTotal > 0 && creditTotal > 0 && Math.abs(difference) < 0.000001;

  const canSave =
    canWrite &&
    activePeriod?.status === 1 &&
    lines.length >= 2 &&
    linesValid &&
    isBalanced &&
    saveStatus !== "loading";

  const loadData = useCallback(async (signal) => {
    if (!activeCompanyId) return;

    setStatus("loading");
    setError("");

    try {
      const requests = [
        api.get(`/companies/${activeCompanyId}/accounts`, { signal }),

        api.get(`/companies/${activeCompanyId}/counterparties`, {
          params: {
            page: 1,
            pageSize: 100,
          },
          signal,
        }),

        api.get(`/companies/${activeCompanyId}/treasury-accounts`, { signal }),
      ];

      if (activePeriodId) {
        requests.push(
          api.get(`/companies/${activeCompanyId}/journal-entries`, {
            params: {
              periodId: activePeriodId,
              page: 1,
              pageSize: 50,
            },
            signal,
          }),
        );
      }

      const results = await Promise.all(requests);

      if (signal?.aborted) return;

      setAccounts(results[0].data ?? []);

      setCounterparties(results[1].data?.items ?? []);

      setTreasuries(results[2].data ?? []);

      setJournals(results[3]?.data?.items ?? []);

      setStatus("success");
    } catch (error) {
      if (signal?.aborted) return;

      setStatus("error");

      setError(
        error.response?.data?.message ?? "Yevmiye bilgileri yüklenemedi.",
      );
    }
  }, [activeCompanyId, activePeriodId]);

  useEffect(() => {
    if (!activeCompanyId) return;

    const controller = new AbortController();

    const timeoutId = setTimeout(() => loadData(controller.signal), 0);

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
  }, [activeCompanyId, activePeriodId, loadData]);

  function updateLine(index, field, value) {
    setLines((previous) =>
      previous.map((line, lineIndex) => {
        if (lineIndex !== index) return line;

        const next = {
          ...line,
          [field]: value,
        };

        if (field === "debit" && numberValue(value) > 0) {
          next.credit = "";
        }

        if (field === "credit" && numberValue(value) > 0) {
          next.debit = "";
        }

        if (field === "accountId") {
          next.counterpartyId = "";
          next.treasuryAccountId = "";
        }

        return next;
      }),
    );
  }

  function addLine() {
    setLines((previous) => [...previous, emptyLine()]);
  }

  function removeLine(index) {
    if (lines.length <= 2) return;

    setLines((previous) =>
      previous.filter((_, lineIndex) => lineIndex !== index),
    );
  }

  function resetForm() {
    setDescription("");
    setDate(localToday());
    setLines([emptyLine(), emptyLine()]);
    setSaveError("");
  }

  async function saveJournal(event) {
    event.preventDefault();

    if (!canSave) return;

    setSaveStatus("loading");
    setSaveError("");

    try {
      await api.post(`/companies/${activeCompanyId}/journal-entries`, {
        fiscalPeriodId: activePeriodId,
        date,
        description: description.trim() || null,

        lines: lines.map((line) => ({
          accountId: Number(line.accountId),

          debit: numberValue(line.debit),
          credit: numberValue(line.credit),

          counterpartyId: line.counterpartyId
            ? Number(line.counterpartyId)
            : null,

          treasuryAccountId: line.treasuryAccountId
            ? Number(line.treasuryAccountId)
            : null,

          description: line.description.trim() || null,
        })),

        version: 1,
      });

      resetForm();

      await loadData();

      setSaveStatus("success");
    } catch (error) {
      setSaveStatus("error");

      setSaveError(
        error.response?.data?.message ?? "Yevmiye fişi kaydedilemedi.",
      );
    }
  }

  async function postJournal(journal) {
    await api.post(
      `/companies/${activeCompanyId}/journal-entries/${journal.id}/post`,
      {
        version: journal.version,

        idempotencyKey: `journal-post-${journal.id}-${crypto.randomUUID()}`,
      },
    );

    await loadData();
  }
  async function reverseJournal(journal, reason) {
    await api.post(
      `/companies/${activeCompanyId}/journal-entries/${journal.id}/reverse`,
      {
        version: journal.version,

        idempotencyKey: `journal-reverse-${journal.id}-${crypto.randomUUID()}`,

        date: activePeriod.endDate,

        fiscalPeriodId: activePeriodId,

        reason: reason.trim(),
      },
    );

    await loadData();
  }
  if (!activeCompany || !activePeriod) {
    return (
      <section className='container py-4'>
        <div className='alert alert-warning'>
          Yevmiye işlemleri için aktif şirket ve mali dönem seçmelisiniz.
        </div>
      </section>
    );
  }

  return (
    <section className='container-fluid px-lg-4 py-4'>
      <header className='mb-4'>
        <h1 className='h3'>Yevmiye Fişleri</h1>

        <p className='text-body-secondary mb-0'>
          {activeCompany.name} · {activePeriod.name}
        </p>
      </header>

      {activePeriod.status !== 1 && (
        <div className='alert alert-warning'>
          Bu mali dönem kilitlidir. Yeni kayıt oluşturulamaz.
        </div>
      )}

      {saveError && <div className='alert alert-danger'>{saveError}</div>}

      {canWrite && (
        <form className='card mb-4' onSubmit={saveJournal}>
          <div className='card-header'>
            <h2 className='h5 mb-0'>Yeni Yevmiye Fişi</h2>
          </div>

          <div className='card-body'>
            <div className='row g-3 mb-4'>
              <div className='col-md-3'>
                <label className='form-label'>Tarih</label>

                <input
                  type='date'
                  className='form-control'
                  value={date}
                  min={activePeriod.startDate}
                  max={activePeriod.endDate}
                  onChange={(event) => setDate(event.target.value)}
                  required
                />
              </div>

              <div className='col-md-9'>
                <label className='form-label'>Açıklama</label>

                <input
                  className='form-control'
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder='Fiş açıklaması'
                />
              </div>
            </div>

            <div className='table-responsive'>
              <table className='table align-middle'>
                <thead>
                  <tr>
                    <th style={{ minWidth: 260 }}>Hesap</th>

                    <th style={{ minWidth: 140 }}>Borç</th>

                    <th style={{ minWidth: 140 }}>Alacak</th>

                    <th style={{ minWidth: 180 }}>Boyut</th>

                    <th style={{ minWidth: 200 }}>Açıklama</th>

                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {lines.map((line, index) => {
                    const account = accounts.find(
                      (item) => item.id === Number(line.accountId),
                    );

                    const matchingTreasuries = treasuries.filter(
                      (treasury) =>
                        treasury.isActive &&
                        treasury.ledgerAccountId === Number(line.accountId),
                    );

                    return (
                      <tr key={index}>
                        <td>
                          <select
                            className='form-select'
                            value={line.accountId}
                            required
                            onChange={(event) =>
                              updateLine(index, "accountId", event.target.value)
                            }
                          >
                            <option value=''>Hesap seçin</option>

                            {postingAccounts.map((account) => (
                              <option key={account.id} value={account.id}>
                                {account.code} — {account.name}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td>
                          <input
                            type='number'
                            min='0'
                            step='0.01'
                            className='form-control text-end'
                            value={line.debit}
                            disabled={numberValue(line.credit) > 0}
                            onChange={(event) =>
                              updateLine(index, "debit", event.target.value)
                            }
                          />
                        </td>

                        <td>
                          <input
                            type='number'
                            min='0'
                            step='0.01'
                            className='form-control text-end'
                            value={line.credit}
                            disabled={numberValue(line.debit) > 0}
                            onChange={(event) =>
                              updateLine(index, "credit", event.target.value)
                            }
                          />
                        </td>

                        <td>
                          {account?.requiredDimension === "Counterparty" ? (
                            <select
                              className='form-select'
                              value={line.counterpartyId}
                              onChange={(event) =>
                                updateLine(
                                  index,
                                  "counterpartyId",
                                  event.target.value,
                                )
                              }
                              required
                            >
                              <option value=''>Cari seçin</option>

                              {counterparties
                                .filter((item) => item.isActive)
                                .map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.code} — {item.name}
                                  </option>
                                ))}
                            </select>
                          ) : account?.requiredDimension === "Treasury" ? (
                            <select
                              className='form-select'
                              value={line.treasuryAccountId}
                              onChange={(event) =>
                                updateLine(
                                  index,
                                  "treasuryAccountId",
                                  event.target.value,
                                )
                              }
                              required
                            >
                              <option value=''>Kasa / banka seçin</option>

                              {matchingTreasuries.map((item) => (
                                <option key={item.id} value={item.id}>
                                  {item.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className='text-body-secondary'>—</span>
                          )}
                        </td>

                        <td>
                          <input
                            className='form-control'
                            value={line.description}
                            onChange={(event) =>
                              updateLine(
                                index,
                                "description",
                                event.target.value,
                              )
                            }
                          />
                        </td>

                        <td>
                          <button
                            type='button'
                            className='btn btn-outline-danger btn-sm'
                            disabled={lines.length <= 2}
                            onClick={() => removeLine(index)}
                          >
                            <i className='bi bi-trash' />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>

                <tfoot>
                  <tr className='fw-semibold'>
                    <td>Toplam</td>

                    <td className='text-end'>{money(debitTotal)}</td>

                    <td className='text-end'>{money(creditTotal)}</td>

                    <td colSpan={3}></td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <button
              type='button'
              className='btn btn-outline-primary btn-sm'
              onClick={addLine}
            >
              <i className='bi bi-plus-lg me-1' />
              Satır Ekle
            </button>

            <div
              className={`alert mt-4 ${
                isBalanced ? "alert-success" : "alert-danger"
              }`}
            >
              <div className='d-flex justify-content-between'>
                <strong>Yevmiye Dengesi</strong>

                <span>Fark: {money(difference)}</span>
              </div>

              <div className='small mt-1'>
                {isBalanced
                  ? "Borç ve alacak toplamları eşit."
                  : "Fiş kaydedilemez. Borç ve alacak toplamlarını eşitleyin."}
              </div>
            </div>
          </div>

          <div className='card-footer d-flex justify-content-end gap-2'>
            <button
              type='button'
              className='btn btn-outline-secondary'
              onClick={resetForm}
            >
              Temizle
            </button>

            <button
              type='submit'
              className='btn btn-primary'
              disabled={!canSave}
            >
              {saveStatus === "loading"
                ? "Kaydediliyor…"
                : "Taslak Fişi Kaydet"}
            </button>
          </div>
        </form>
      )}

      <div className='card'>
        <div className='card-header'>
          <h2 className='h5 mb-0'>Yevmiye Fişleri</h2>
        </div>

        {status === "loading" ? (
          <PageLoading text='Yevmiye fişleri yükleniyor…' />
        ) : status === "error" ? (
          <div className='card-body'>
            <PageError message={error} onRetry={() => loadData()} />
          </div>
        ) : journals.length === 0 ? (
          <div className='card-body'>
            <EmptyState
              icon='bi-journal-text'
              title='Henüz yevmiye fişi yok'
              text='Bu mali dönemde henüz bir yevmiye fişi oluşturulmamış.'
            />
          </div>
        ) : (
          <div className='table-responsive'>
            <table className='table table-hover align-middle mb-0'>
              <thead>
                <tr>
                  <th>Fiş No</th>
                  <th>Tarih</th>
                  <th>Açıklama</th>
                  <th>Kaynak</th>
                  <th>Durum</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {journals.map((journal) => (
                  <tr key={journal.id}>
                    <td className='fw-semibold'>{journal.number}</td>

                    <td>{journal.date}</td>

                    <td>{journal.description || "—"}</td>

                    <td>{journal.sourceType}</td>

                    <td>
                      <span
                        className={`badge ${
                          journal.status === JournalStatus.Posted
                            ? "text-bg-success"
                            : "text-bg-warning"
                        }`}
                      >
                        {journalStatusLabel(journal.status)}
                      </span>
                    </td>

                    <td className='text-end text-nowrap'>
                      {canWrite && journal.status === JournalStatus.Draft && (
                        <button
                          type='button'
                          className='btn btn-success btn-sm'
                          onClick={() => setJournalToPost(journal)}
                        >
                          <i className='bi bi-check-lg me-1' />
                          Onayla
                        </button>
                      )}

                      {canWrite &&
                        journal.status === JournalStatus.Posted &&
                        journal.sourceType === "Manual" &&
                        !journal.reversalOfId &&
                        !reversedJournalIds.has(journal.id) && (
                          <button
                            type='button'
                            className='btn btn-outline-danger btn-sm ms-2'
                            onClick={() => setJournalToReverse(journal)}
                          >
                            <i className='bi bi-arrow-counterclockwise me-1' />
                            Tersle
                          </button>
                        )}

                      {journal.sourceType === "Reversal" && (
                        <span className='badge text-bg-secondary ms-2'>
                          Ters Kayıt
                        </span>
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
        show={journalToPost !== null}
        title='Yevmiye fişi onaylansın mı?'
        body={
          journalToPost
            ? `${journalToPost.number} numaralı fiş onaylanacaktır. Onaylanan fiş muhasebe kayıtlarına dahil edilir.`
            : ""
        }
        confirmText='Fişi Onayla'
        loadingText='Fiş onaylanıyor…'
        successTitle='Fiş Onaylandı'
        successText='Yevmiye fişi başarıyla muhasebeleştirildi.'
        errorTitle='Fiş Onaylanamadı'
        errorText='Yevmiye fişi onaylanırken bir hata oluştu.'
        onConfirm={() => postJournal(journalToPost)}
        onClose={() => setJournalToPost(null)}
      />

      <ConfirmModal
        show={journalToReverse !== null}
        title='Yevmiye fişi terslensin mi?'
        body={
          journalToReverse
            ? `${journalToReverse.number} numaralı fiş için ters kayıt oluşturulacaktır.`
            : ""
        }
        icon='warning'
        confirmText='Ters Kayıt Oluştur'
        confirmButtonColor='#dc3545'
        loadingText='Ters kayıt oluşturuluyor…'
        successTitle='Ters Kayıt Oluşturuldu'
        successText='Orijinal fiş silinmedi; ters muhasebe kaydı oluşturuldu.'
        errorTitle='Ters Kayıt Oluşturulamadı'
        input='textarea'
        inputLabel='Ters kayıt gerekçesi'
        inputPlaceholder='Örn. Test amacıyla oluşturulan fişin iptali'
        inputValidator={(value) => {
          if (!value || !value.trim()) {
            return "Ters kayıt gerekçesi zorunludur.";
          }

          if (value.trim().length > 500) {
            return "Gerekçe en fazla 500 karakter olabilir.";
          }

          return undefined;
        }}
        onConfirm={(reason) => reverseJournal(journalToReverse, reason)}
        onClose={() => setJournalToReverse(null)}
      />
    </section>
  );
}
