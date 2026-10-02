import { useEffect, useState } from "react";
import api from "../../api/client";
import { useAccounting } from "../../context/useAccounting";
import {
  CompanyRole,
} from "../../utils/accounting";

const REPORT_TYPES = {
  trial: "trial-balance",
  vat: "vat-summary",
  income: "income-statement",
  balance: "balance-sheet",
  reconciliation: "reconciliation",
};

function money(value) {
  return Number(value ?? 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function ReportsPage() {
  const {
    activeCompany,
    activeCompanyId,
    activePeriod,
    activePeriodId,
  } = useAccounting();

  const [reportType, setReportType] =
    useState(REPORT_TYPES.trial);

  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const [data, setData] = useState(null);

  const [status, setStatus] =
    useState("idle");

  const [error, setError] = useState("");

  const role = activeCompany?.role;

  const canReadReports =
    role === CompanyRole.Admin ||
    role === CompanyRole.Accountant ||
    role === CompanyRole.Reader;

  useEffect(() => {
    if (!activePeriod) return;

    setFrom(activePeriod.startDate);
    setTo(activePeriod.endDate);

    setData(null);
  }, [activePeriodId]);

  async function loadReport() {
    if (
      !activeCompanyId ||
      !activePeriodId
    ) {
      return;
    }

    if (
      from &&
      to &&
      from > to
    ) {
      setError(
        "Başlangıç tarihi bitiş tarihinden sonra olamaz.",
      );

      return;
    }

    setStatus("loading");
    setError("");

    try {
      const params = {
        periodId:
          activePeriodId,
      };

      if (
        reportType !==
        REPORT_TYPES.reconciliation
      ) {
        if (
          reportType !==
          REPORT_TYPES.balance
        ) {
          params.from =
            from || undefined;
        }

        params.to =
          to || undefined;
      }

      const { data } = await api.get(
        `/companies/${activeCompanyId}/reports/${reportType}`,
        {
          params,
        },
      );

      setData(data);

      setStatus("success");
    } catch (error) {
      setStatus("error");

      setError(
        error.response?.data?.message ??
          "Rapor alınamadı.",
      );
    }
  }

  useEffect(() => {
    if (
      !activeCompanyId ||
      !activePeriodId ||
      !canReadReports
    ) {
      return;
    }

    loadReport();
  }, [
    activeCompanyId,
    activePeriodId,
    reportType,
  ]);

  async function downloadPdf() {
    try {
      const params = {
        periodId:
          activePeriodId,
      };

      if (
        reportType !==
        REPORT_TYPES.reconciliation
      ) {
        if (
          reportType !==
          REPORT_TYPES.balance
        ) {
          params.from =
            from || undefined;
        }

        params.to =
          to || undefined;
      }

      const response = await api.get(
        `/companies/${activeCompanyId}/reports/${reportType}/pdf`,
        {
          params,
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
        `${reportType}-${activePeriodId}.pdf`;

      document.body.appendChild(link);

      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch {
      setError(
        "PDF raporu indirilemedi.",
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
          Raporlar için aktif şirket ve
          mali dönem seçmelisiniz.
        </div>
      </section>
    );
  }

  if (!canReadReports) {
    return (
      <section className="container py-4">
        <div className="alert alert-warning">
          Bu kullanıcı rolünün mali raporları
          görüntüleme yetkisi bulunmuyor.
        </div>
      </section>
    );
  }

  return (
    <section className="container-fluid px-lg-4 py-4">
      <header className="d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4">
        <div>
          <h1 className="h3">
            Mali Raporlar
          </h1>

          <p className="text-body-secondary mb-0">
            {activeCompany.name} ·{" "}
            {activePeriod.name}
          </p>
        </div>

        <button
          type="button"
          className="btn btn-outline-danger"
          disabled={
            status !== "success"
          }
          onClick={downloadPdf}
        >
          <i className="bi bi-file-earmark-pdf me-2" />

          PDF İndir
        </button>
      </header>

      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-end">
            <div className="col-lg-4">
              <label className="form-label">
                Rapor
              </label>

              <select
                className="form-select"
                value={reportType}
                onChange={(event) => {
                  setReportType(
                    event.target.value,
                  );

                  setData(null);
                }}
              >
                <option
                  value={
                    REPORT_TYPES.trial
                  }
                >
                  Mizan
                </option>

                <option
                  value={
                    REPORT_TYPES.vat
                  }
                >
                  KDV Özeti
                </option>

                <option
                  value={
                    REPORT_TYPES.income
                  }
                >
                  Gelir Tablosu
                </option>

                <option
                  value={
                    REPORT_TYPES.balance
                  }
                >
                  Bilanço
                </option>

                <option
                  value={
                    REPORT_TYPES.reconciliation
                  }
                >
                  Mutabakat
                </option>
              </select>
            </div>

            {reportType !==
              REPORT_TYPES.reconciliation && (
              <>
                {reportType !==
                  REPORT_TYPES.balance && (
                  <div className="col-md-4 col-lg-3">
                    <label className="form-label">
                      Başlangıç
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
                      value={from}
                      onChange={(event) =>
                        setFrom(
                          event.target.value,
                        )
                      }
                    />
                  </div>
                )}

                <div className="col-md-4 col-lg-3">
                  <label className="form-label">
                    Bitiş
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
                    value={to}
                    onChange={(event) =>
                      setTo(
                        event.target.value,
                      )
                    }
                  />
                </div>
              </>
            )}

            <div className="col-lg-2">
              <button
                type="button"
                className="btn btn-primary w-100"
                onClick={loadReport}
                disabled={
                  status === "loading"
                }
              >
                Raporla
              </button>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
        </div>
      )}

      {status === "loading" ? (
        <div className="text-center py-5">
          <div
            className="spinner-border"
            role="status"
          />

          <p className="mt-3">
            Rapor hazırlanıyor…
          </p>
        </div>
      ) : data ? (
        <>
          {reportType ===
            REPORT_TYPES.trial && (
            <TrialBalance data={data} />
          )}

          {reportType ===
            REPORT_TYPES.vat && (
            <VatSummary data={data} />
          )}

          {reportType ===
            REPORT_TYPES.income && (
            <IncomeStatement data={data} />
          )}

          {reportType ===
            REPORT_TYPES.balance && (
            <BalanceSheet data={data} />
          )}

          {reportType ===
            REPORT_TYPES.reconciliation && (
            <Reconciliation data={data} />
          )}
        </>
      ) : null}
    </section>
  );
}

function TrialBalance({ data }) {
  if (!data.length) {
    return (
      <div className="alert alert-light border">
        Seçilen dönemde muhasebe hareketi
        bulunmuyor.
      </div>
    );
  }

  const debit = data.reduce(
    (sum, item) =>
      sum + Number(item.debit),
    0,
  );

  const credit = data.reduce(
    (sum, item) =>
      sum + Number(item.credit),
    0,
  );

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="h5 mb-0">
          Mizan
        </h2>
      </div>

      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead>
            <tr>
              <th>Kod</th>
              <th>Hesap</th>

              <th className="text-end">
                Borç
              </th>

              <th className="text-end">
                Alacak
              </th>

              <th className="text-end">
                Borç Bakiyesi
              </th>

              <th className="text-end">
                Alacak Bakiyesi
              </th>
            </tr>
          </thead>

          <tbody>
            {data.map((row) => (
              <tr key={row.accountId}>
                <td>
                  <code>{row.code}</code>
                </td>

                <td>{row.name}</td>

                <td className="text-end">
                  {money(row.debit)}
                </td>

                <td className="text-end">
                  {money(row.credit)}
                </td>

                <td className="text-end">
                  {money(
                    row.debitBalance,
                  )}
                </td>

                <td className="text-end">
                  {money(
                    row.creditBalance,
                  )}
                </td>
              </tr>
            ))}
          </tbody>

          <tfoot>
            <tr className="fw-bold">
              <td colSpan={2}>
                Toplam
              </td>

              <td className="text-end">
                {money(debit)}
              </td>

              <td className="text-end">
                {money(credit)}
              </td>

              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="card-footer">
        <span
          className={`badge ${
            Math.abs(debit - credit) <
            0.01
              ? "text-bg-success"
              : "text-bg-danger"
          }`}
        >
          Fark:{" "}
          {money(debit - credit)}
        </span>
      </div>
    </div>
  );
}

function VatSummary({ data }) {
  return (
    <div className="row g-4">
      <ReportCard
        title="İndirilecek KDV"
        value={data.inputVat}
      />

      <ReportCard
        title="Hesaplanan KDV"
        value={data.outputVat}
      />

      <ReportCard
        title="Net KDV"
        value={data.netVat}
      />

      <div className="col-12">
        <div className="card">
          <div className="card-header">
            <h2 className="h5 mb-0">
              KDV Mutabakatı
            </h2>
          </div>

          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-6">
                <strong>
                  İndirilecek KDV Farkı
                </strong>

                <div
                  className={
                    Number(
                      data.inputDifference,
                    ) === 0
                      ? "text-success"
                      : "text-danger"
                  }
                >
                  {money(
                    data.inputDifference,
                  )}
                </div>
              </div>

              <div className="col-md-6">
                <strong>
                  Hesaplanan KDV Farkı
                </strong>

                <div
                  className={
                    Number(
                      data.outputDifference,
                    ) === 0
                      ? "text-success"
                      : "text-danger"
                  }
                >
                  {money(
                    data.outputDifference,
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function IncomeStatement({ data }) {
  return (
    <div className="row g-4">
      <ReportCard
        title="Gelirler"
        value={data.income}
      />

      <ReportCard
        title="Giderler"
        value={data.expense}
      />

      <ReportCard
        title={
          Number(data.result) >= 0
            ? "Dönem Kârı"
            : "Dönem Zararı"
        }
        value={Math.abs(
          Number(data.result),
        )}
      />
    </div>
  );
}

function BalanceSheet({ data }) {
  return (
    <>
      <div className="row g-4">
        <ReportCard
          title="Varlıklar"
          value={data.assets}
        />

        <ReportCard
          title="Yükümlülükler"
          value={data.liabilities}
        />

        <ReportCard
          title="Özkaynak"
          value={data.equity}
        />
      </div>

      <div className="card mt-4">
        <div className="card-body d-flex flex-wrap justify-content-between gap-3">
          <div>
            <div className="text-body-secondary">
              Kapanmamış Dönem Sonucu
            </div>

            <strong>
              {money(
                data.currentUnclosedResult,
              )}
            </strong>
          </div>

          <div>
            <div className="text-body-secondary">
              Bilanço Farkı
            </div>

            <strong
              className={
                Math.abs(
                  Number(data.difference),
                ) < 0.01
                  ? "text-success"
                  : "text-danger"
              }
            >
              {money(data.difference)}
            </strong>
          </div>
        </div>
      </div>
    </>
  );
}

function Reconciliation({ data }) {
  if (!data.length) {
    return (
      <div className="alert alert-light border">
        Mutabakat kontrolü bulunmuyor.
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="h5 mb-0">
          Sistem Mutabakatı
        </h2>
      </div>

      <div className="table-responsive">
        <table className="table align-middle mb-0">
          <thead>
            <tr>
              <th>Kontrol</th>

              <th className="text-end">
                Beklenen
              </th>

              <th className="text-end">
                Gerçekleşen
              </th>

              <th>Sonuç</th>
            </tr>
          </thead>

          <tbody>
            {data.map(
              (item, index) => (
                <tr key={index}>
                  <td>{item.name}</td>

                  <td className="text-end">
                    {money(
                      item.expected,
                    )}
                  </td>

                  <td className="text-end">
                    {money(
                      item.actual,
                    )}
                  </td>

                  <td>
                    {item.passed ? (
                      <span className="badge text-bg-success">
                        Başarılı
                      </span>
                    ) : (
                      <span className="badge text-bg-danger">
                        Fark Var
                      </span>
                    )}
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ReportCard({ title, value }) {
  return (
    <div className="col-md-4">
      <div className="card h-100">
        <div className="card-body">
          <div className="text-body-secondary">
            {title}
          </div>

          <div className="fs-3 fw-bold mt-2">
            {money(value)} ₺
          </div>
        </div>
      </div>
    </div>
  );
}