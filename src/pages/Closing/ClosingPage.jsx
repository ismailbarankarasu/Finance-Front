import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import { ConfirmModal } from "../../components/ConfirmModal";
import api from "../../api/client";
import { useAccounting } from "../../context/useAccounting";
import { CompanyRole, PeriodStatus } from "../../utils/accounting";

function money(value) {
  return Number(value ?? 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDateTime(value) {
  if (!value) {
    return "—";
  }

  return new Date(value).toLocaleString("tr-TR");
}

function nextDate(dateText) {
  if (!dateText) {
    return "";
  }

  const date = new Date(`${dateText}T12:00:00`);

  date.setDate(date.getDate() + 1);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export default function ClosingPage() {
  const {
    activeCompany,
    activeCompanyId,
    periods,
    activePeriod,
    activePeriodId,
    refreshPeriods,
    setActivePeriodId,
  } = useAccounting();

  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [targetPeriodId, setTargetPeriodId] = useState("");
  const [preview, setPreview] = useState(null);
  const [carryForwardResult, setCarryForwardResult] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const role = activeCompany?.role;

  const canClose =
    role === CompanyRole.Admin || role === CompanyRole.Accountant;

  const expectedTargetStart = useMemo(
    () => nextDate(activePeriod?.endDate),
    [activePeriod?.endDate],
  );

  const eligibleTargets = useMemo(() => {
    if (!activePeriod) {
      return [];
    }

    return periods.filter(
      (period) =>
        period.id !== activePeriod.id &&
        period.status === PeriodStatus.Open &&
        period.startDate === expectedTargetStart,
    );
  }, [periods, activePeriod, expectedTargetStart]);

  const selectedTarget = useMemo(
    () =>
      periods.find((period) => period.id === Number(targetPeriodId)) ?? null,
    [periods, targetPeriodId],
  );

  const closingScope = JSON.stringify([activeCompanyId, activePeriodId, eligibleTargets.map((period) => period.id)]);
  const [previousClosingScope, setPreviousClosingScope] = useState(null);

  if (previousClosingScope !== closingScope) {
    setPreviousClosingScope(closingScope);
    setPreview(null);
    setCarryForwardResult(null);
    setShowCloseConfirm(false);
    setError("");
    setSuccess("");

    if (eligibleTargets.length === 1) {
      setTargetPeriodId(String(eligibleTargets[0].id));
    } else {
      setTargetPeriodId("");
    }
  }

  useEffect(() => {
    if (!activeCompanyId || !activePeriodId || !canClose) {
      return;
    }

    const controller = new AbortController();

    async function loadResult() {
      try {
        const { data } = await api.get(
          `/companies/${activeCompanyId}/periods/${activePeriodId}/carry-forward-result`,
          {
            signal: controller.signal,
          },
        );

        if (!controller.signal.aborted && data) {
          setCarryForwardResult(data);
          setTargetPeriodId(String(data.targetPeriodId));
        }
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(
            requestError.response?.data?.message ??
              "Devir sonucu kontrol edilemedi.",
          );
        }
      }
    }

    loadResult();

    return () => controller.abort();
  }, [activeCompanyId, activePeriodId, canClose]);

  async function runPreview() {
    if (!activeCompanyId || !activePeriodId || !targetPeriodId) {
      setError("Hedef mali dönem seçmelisiniz.");
      return;
    }

    setStatus("loading");
    setError("");
    setSuccess("");
    setPreview(null);

    try {
      const { data } = await api.get(
        `/companies/${activeCompanyId}/periods/${activePeriodId}/closing-preview`,
        {
          params: {
            targetPeriodId: Number(targetPeriodId),
          },
        },
      );

      setPreview(data);
      setStatus("success");
    } catch (requestError) {
      setStatus("error");

      setError(
        requestError.response?.data?.message ??
          "Kapanış ön kontrolü gerçekleştirilemedi.",
      );
    }
  }

  async function closePeriod() {
    if (!preview?.canClose || !targetPeriodId) {
      return;
    }

    setStatus("loading");
    setError("");
    setSuccess("");

    try {
      const { data } = await api.post(
        `/companies/${activeCompanyId}/periods/${activePeriodId}/close-and-carry-forward`,
        {
          targetPeriodId: Number(targetPeriodId),
          version: activePeriod.version,
          idempotencyKey: `period-close-${activePeriodId}-${targetPeriodId}-${crypto.randomUUID()}`,
        },
      );

      setCarryForwardResult(data);

      setSuccess(
        "Dönem başarıyla kapatıldı ve bakiyeler hedef döneme devredildi.",
      );

      await refreshPeriods();

      setStatus("success");
    } catch (requestError) {
      setStatus("error");

      setError(
        requestError.response?.data?.message ??
          "Dönem kapatılamadı veya devir işlemi tamamlanamadı.",
      );

      throw requestError;
    }
  }

  if (!activeCompany || !activePeriod) {
    return (
      <section className='container py-4'>
        <div className='alert alert-warning'>
          Dönem kapanışı için aktif şirket ve mali dönem seçmelisiniz.
        </div>
      </section>
    );
  }

  if (!canClose) {
    return (
      <section className='container py-4'>
        <div className='alert alert-warning'>
          Bu kullanıcı rolünün dönem kapatma yetkisi bulunmuyor.
        </div>
      </section>
    );
  }

  return (
    <section className='container-fluid px-lg-4 py-4'>
      <header className='mb-4'>
        <h1 className='h3'>Dönem Kapanışı ve Devir</h1>

        <p className='text-body-secondary mb-0'>
          {activeCompany.name} · {activePeriod.name}
        </p>
      </header>

      {error && (
        <div className='alert alert-danger' role='alert'>
          {error}
        </div>
      )}

      {success && (
        <div className='alert alert-success' role='status'>
          {success}
        </div>
      )}

      <div className='row g-4 mb-4'>
        <div className='col-md-6 col-xl-3'>
          <div className='card h-100'>
            <div className='card-body'>
              <div className='text-body-secondary small'>Kaynak Dönem</div>

              <div className='fs-5 fw-semibold mt-1'>{activePeriod.name}</div>

              <div className='small mt-2'>
                {activePeriod.startDate}
                {" → "}
                {activePeriod.endDate}
              </div>
            </div>
          </div>
        </div>

        <div className='col-md-6 col-xl-3'>
          <div className='card h-100'>
            <div className='card-body'>
              <div className='text-body-secondary small'>Kaynak Durum</div>

              <div className='mt-2'>
                {activePeriod.status === PeriodStatus.Open ? (
                  <span className='badge text-bg-success'>Açık</span>
                ) : (
                  <span className='badge text-bg-secondary'>Kilitli</span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className='col-md-6 col-xl-3'>
          <div className='card h-100'>
            <div className='card-body'>
              <div className='text-body-secondary small'>Sonraki Tarih</div>

              <div className='fs-5 fw-semibold mt-1'>{expectedTargetStart}</div>

              <div className='small text-body-secondary mt-2'>
                Hedef dönem bu tarihte başlamalıdır.
              </div>
            </div>
          </div>
        </div>

        <div className='col-md-6 col-xl-3'>
          <div className='card h-100'>
            <div className='card-body'>
              <div className='text-body-secondary small'>Uygun Hedef</div>

              <div className='fs-5 fw-semibold mt-1'>
                {eligibleTargets.length}
              </div>

              <div className='small text-body-secondary mt-2'>
                Açık ve ardışık mali dönem
              </div>
            </div>
          </div>
        </div>
      </div>

      {carryForwardResult ? (
        <CarryForwardResult
          result={carryForwardResult}
          periods={periods}
          onOpenTarget={() =>
            setActivePeriodId(carryForwardResult.targetPeriodId)
          }
        />
      ) : activePeriod.status !== PeriodStatus.Open ? (
        <div className='alert alert-secondary'>
          Bu dönem kilitlidir ve yeniden kapatılamaz.
        </div>
      ) : (
        <>
          <div className='card mb-4'>
            <div className='card-header'>
              <h2 className='h5 mb-0'>Hedef Mali Dönem</h2>
            </div>

            <div className='card-body'>
              {eligibleTargets.length === 0 ? (
                <div className='alert alert-warning mb-0'>
                  <p className='mb-2'>
                    Kaynak dönemi izleyen açık bir hedef mali dönem bulunamadı.
                  </p>

                  <p className='mb-3'>
                    Hedef dönem <strong>{expectedTargetStart}</strong> tarihinde
                    başlamalı ve henüz muhasebe hareketi içermemelidir.
                  </p>

                  <Link className='btn btn-outline-primary' to='/periods'>
                    Mali Dönemlere Git
                  </Link>
                </div>
              ) : (
                <>
                  <label className='form-label'>Devir Yapılacak Dönem</label>

                  <select
                    className='form-select'
                    value={targetPeriodId}
                    onChange={(event) => {
                      setTargetPeriodId(event.target.value);
                      setPreview(null);
                      setShowCloseConfirm(false);
                    }}
                  >
                    <option value=''>Hedef dönem seçin</option>

                    {eligibleTargets.map((period) => (
                      <option key={period.id} value={period.id}>
                        {period.name} — {period.startDate}
                        {" / "}
                        {period.endDate}
                      </option>
                    ))}
                  </select>

                  <div className='form-text'>
                    Hedef dönem açık, ardışık ve boş olmalıdır.
                  </div>
                </>
              )}
            </div>

            {eligibleTargets.length > 0 && (
              <div className='card-footer text-end'>
                <button
                  type='button'
                  className='btn btn-primary'
                  disabled={!targetPeriodId || status === "loading"}
                  onClick={runPreview}
                >
                  <i className='bi bi-clipboard-check me-2' />
                  Kapanış Ön Kontrolü
                </button>
              </div>
            )}
          </div>

          {preview && (
            <ClosingPreview
              preview={preview}
              onClose={() => setShowCloseConfirm(true)}
              status={status}
            />
          )}
        </>
      )}

      <ConfirmModal
        show={showCloseConfirm}
        title='Mali dönem kapatılsın mı?'
        body={`${activePeriod.name} dönemi kapatılacak ve ${
          selectedTarget?.name ?? "hedef dönem"
        } dönemine devredilecektir. Bu işlem sonrasında kaynak dönem normal muhasebe işlemlerine kapatılır.`}
        icon='warning'
        confirmText='Dönemi Kapat ve Devret'
        confirmButtonColor='#dc3545'
        loadingText='Dönem kapatılıyor ve bakiyeler devrediliyor…'
        successTitle='Dönem Kapanışı Tamamlandı'
        successText='Bakiyeler hedef mali döneme başarıyla devredildi.'
        errorTitle='Dönem Kapatılamadı'
        errorText='Kapanış işlemi sırasında bir hata oluştu.'
        input='text'
        inputLabel={`Onaylamak için "${activePeriod.name}" yazın.`}
        inputPlaceholder={activePeriod.name}
        inputValidator={(value) => {
          if (value?.trim() !== activePeriod.name) {
            return `Devam etmek için "${activePeriod.name}" yazmalısınız.`;
          }

          return undefined;
        }}
        onConfirm={() => closePeriod()}
        onClose={() => setShowCloseConfirm(false)}
      />
    </section>
  );
}

function ClosingPreview({ preview, onClose, status }) {
  return (
    <>
      <div
        className={`alert ${
          preview.canClose ? "alert-success" : "alert-danger"
        }`}
      >
        <div className='d-flex align-items-start gap-3'>
          <i
            className={`bi ${
              preview.canClose ? "bi-check-circle-fill" : "bi-x-circle-fill"
            } fs-4`}
          />

          <div>
            <strong>
              {preview.canClose
                ? "Dönem kapanışa hazır."
                : "Dönem henüz kapatılamaz."}
            </strong>

            <div className='small mt-1'>
              {preview.canClose
                ? "Tüm ön kontroller ve mutabakatlar başarılı."
                : "Aşağıdaki engelleri giderdikten sonra kontrolü yeniden çalıştırın."}
            </div>
          </div>
        </div>
      </div>

      {preview.blockers?.length > 0 && (
        <div className='card mb-4 border-danger'>
          <div className='card-header'>
            <h2 className='h5 mb-0 text-danger'>Kapanış Engelleri</h2>
          </div>

          <div className='list-group list-group-flush'>
            {preview.blockers.map((blocker, index) => (
              <div
                className='list-group-item d-flex align-items-start gap-2'
                key={index}
              >
                <i className='bi bi-exclamation-triangle-fill text-danger' />

                <span>{blocker}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className='card mb-4'>
        <div className='card-header d-flex justify-content-between align-items-center'>
          <h2 className='h5 mb-0'>Mutabakat Kontrolleri</h2>

          <span
            className={`badge ${
              preview.checks?.every((check) => check.passed)
                ? "text-bg-success"
                : "text-bg-danger"
            }`}
          >
            {preview.checks?.filter((check) => check.passed).length ?? 0}
            {" / "}
            {preview.checks?.length ?? 0}
          </span>
        </div>

        {!preview.checks?.length ? (
          <div className='card-body'>Mutabakat kontrolü bulunmuyor.</div>
        ) : (
          <div className='table-responsive'>
            <table className='table align-middle mb-0'>
              <thead>
                <tr>
                  <th>Kontrol</th>
                  <th className='text-end'>Beklenen</th>
                  <th className='text-end'>Gerçekleşen</th>
                  <th className='text-end'>Fark</th>
                  <th>Sonuç</th>
                </tr>
              </thead>

              <tbody>
                {preview.checks.map((check, index) => {
                  const difference =
                    Number(check.actual) - Number(check.expected);

                  return (
                    <tr key={index}>
                      <td>{check.name}</td>
                      <td className='text-end'>{money(check.expected)}</td>
                      <td className='text-end'>{money(check.actual)}</td>
                      <td className='text-end'>{money(difference)}</td>

                      <td>
                        {check.passed ? (
                          <span className='badge text-bg-success'>
                            Başarılı
                          </span>
                        ) : (
                          <span className='badge text-bg-danger'>Fark Var</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className='card border-warning'>
        <div className='card-body'>
          <h2 className='h5'>Dönemi Kapat</h2>

          <p className='mb-3'>
            Kapanış sonrasında kaynak mali dönem kilitlenecektir. Gelir ve gider
            hesapları kapatılacak, bilanço bakiyeleri ve stoklar hedef döneme
            açılış olarak taşınacaktır.
          </p>

          <button
            type='button'
            className='btn btn-danger'
            disabled={!preview.canClose || status === "loading"}
            onClick={onClose}
          >
            <i className='bi bi-lock-fill me-2' />
            Dönemi Kapat ve Devret
          </button>
        </div>
      </div>
    </>
  );
}

function CarryForwardResult({ result, periods, onOpenTarget }) {
  const source = periods.find((period) => period.id === result.sourcePeriodId);

  const target = periods.find((period) => period.id === result.targetPeriodId);

  return (
    <div className='card border-success'>
      <div className='card-header bg-success-subtle'>
        <h2 className='h5 mb-0'>
          <i className='bi bi-check-circle-fill text-success me-2' />
          Devir Tamamlandı
        </h2>
      </div>

      <div className='card-body'>
        <div className='row g-4'>
          <div className='col-md-6 col-xl-3'>
            <div className='text-body-secondary small'>Kaynak Dönem</div>

            <div className='fw-semibold'>
              {source?.name ?? `#${result.sourcePeriodId}`}
            </div>
          </div>

          <div className='col-md-6 col-xl-3'>
            <div className='text-body-secondary small'>Hedef Dönem</div>

            <div className='fw-semibold'>
              {target?.name ?? `#${result.targetPeriodId}`}
            </div>
          </div>

          <div className='col-md-6 col-xl-3'>
            <div className='text-body-secondary small'>Kapanış Fişi</div>

            <div className='fw-semibold'>
              {result.closingJournalEntryId
                ? `#${result.closingJournalEntryId}`
                : "Fiş gerekmedi"}
            </div>
          </div>

          <div className='col-md-6 col-xl-3'>
            <div className='text-body-secondary small'>Açılış Fişi</div>

            <div className='fw-semibold'>
              {result.openingJournalEntryId
                ? `#${result.openingJournalEntryId}`
                : "Fiş gerekmedi"}
            </div>
          </div>
        </div>

        <hr />

        <div className='row g-3'>
          <div className='col-md-6'>
            <div className='text-body-secondary small'>İşlem Zamanı</div>

            <div>{formatDateTime(result.createdAtUtc)}</div>
          </div>

          <div className='col-md-6'>
            <div className='text-body-secondary small'>
              İşlemi Yapan Kullanıcı
            </div>

            <div>#{result.actorUserId}</div>
          </div>
        </div>
      </div>

      <div className='card-footer d-flex flex-wrap gap-2 justify-content-end'>
        <button
          type='button'
          className='btn btn-primary'
          onClick={onOpenTarget}
        >
          <i className='bi bi-arrow-right-circle me-2' />
          Hedef Döneme Geç
        </button>
      </div>
    </div>
  );
}
