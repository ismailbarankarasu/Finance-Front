import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import api from "../../api/client";
import { useAccounting } from "../../context/useAccounting";

import {
  CompanyRole,
  InvoiceStatus,
  invoiceStatusLabel,
  invoiceTypeLabel,
  JournalStatus,
  journalStatusLabel,
} from "../../utils/accounting";

function money(value) {
  return Number(value ?? 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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

function DashboardCard({ title, value, subtitle, icon, to, tone = "primary" }) {
  const content = (
    <div className='card h-100 border-0 shadow-sm'>
      <div className='card-body'>
        <div className='d-flex justify-content-between align-items-start gap-3'>
          <div>
            <div className='text-body-secondary small mb-2'>{title}</div>

            <div className='fs-4 fw-bold'>{value}</div>

            {subtitle && (
              <div className='small text-body-secondary mt-2'>{subtitle}</div>
            )}
          </div>

          <div
            className={`rounded-3 bg-${tone}-subtle text-${tone} d-flex align-items-center justify-content-center`}
            style={{
              width: 46,
              height: 46,
              flex: "0 0 46px",
            }}
          >
            <i className={`bi ${icon} fs-5`} />
          </div>
        </div>
      </div>
    </div>
  );

  if (!to) {
    return content;
  }

  return (
    <Link to={to} className='text-decoration-none text-body'>
      {content}
    </Link>
  );
}

export function HomePage() {
  const { activeCompany, activeCompanyId, activePeriod, activePeriodId } =
    useAccounting();

  const [trialBalance, setTrialBalance] = useState([]);

  const [incomeStatement, setIncomeStatement] = useState(null);

  const [inventory, setInventory] = useState([]);

  const [overdue, setOverdue] = useState([]);

  const [invoices, setInvoices] = useState([]);

  const [journals, setJournals] = useState([]);

  const [status, setStatus] = useState("idle");

  const [error, setError] = useState("");

  const role = activeCompany?.role;

  const canReadReports =
    role === CompanyRole.Admin ||
    role === CompanyRole.Accountant ||
    role === CompanyRole.Reader;

  const canWriteAccounting =
    role === CompanyRole.Admin || role === CompanyRole.Accountant;

  const canCreateSales =
    role === CompanyRole.Admin ||
    role === CompanyRole.Accountant ||
    role === CompanyRole.Sales;

  useEffect(() => {
    if (!activeCompanyId || !activePeriodId) {
      return;
    }

    const controller = new AbortController();

    async function loadDashboard() {
      setStatus("loading");
      setError("");

      try {
        const requests = [
          api.get(`/companies/${activeCompanyId}/invoices`, {
            params: {
              periodId: activePeriodId,
              page: 1,
              pageSize: 5,
            },
            signal: controller.signal,
          }),
        ];

        if (role !== CompanyRole.Sales) {
          requests.push(
            api.get(`/companies/${activeCompanyId}/journal-entries`, {
              params: {
                periodId: activePeriodId,
                page: 1,
                pageSize: 5,
              },
              signal: controller.signal,
            }),
          );

          requests.push(
            api.get(`/companies/${activeCompanyId}/inventory/balances`, {
              params: {
                periodId: activePeriodId,
              },
              signal: controller.signal,
            }),
          );
        }

        if (canReadReports) {
          requests.push(
            api.get(`/companies/${activeCompanyId}/reports/trial-balance`, {
              params: {
                periodId: activePeriodId,
              },
              signal: controller.signal,
            }),
          );

          requests.push(
            api.get(`/companies/${activeCompanyId}/reports/income-statement`, {
              params: {
                periodId: activePeriodId,
              },
              signal: controller.signal,
            }),
          );

          requests.push(
            api.get(`/companies/${activeCompanyId}/reports/overdue`, {
              signal: controller.signal,
            }),
          );
        }

        const responses = await Promise.all(requests);

        let index = 0;

        const invoiceResponse = responses[index++];

        setInvoices(invoiceResponse.data?.items ?? []);

        if (role !== CompanyRole.Sales) {
          const journalResponse = responses[index++];

          const inventoryResponse = responses[index++];

          setJournals(journalResponse.data?.items ?? []);

          setInventory(inventoryResponse.data ?? []);
        } else {
          setJournals([]);
          setInventory([]);
        }

        if (canReadReports) {
          const trialResponse = responses[index++];

          const incomeResponse = responses[index++];

          const overdueResponse = responses[index++];

          setTrialBalance(trialResponse.data ?? []);

          setIncomeStatement(incomeResponse.data ?? null);

          setOverdue(
            (overdueResponse.data ?? []).filter(
              (item) => item.invoice?.fiscalPeriodId === activePeriodId,
            ),
          );
        } else {
          setTrialBalance([]);
          setIncomeStatement(null);
          setOverdue([]);
        }

        setStatus("success");
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        setStatus("error");

        setError(
          error.response?.data?.message ?? "Dashboard bilgileri yüklenemedi.",
        );
      }
    }

    loadDashboard();

    return () => controller.abort();
  }, [activeCompanyId, activePeriodId, role, canReadReports]);

  const treasuryBalance = useMemo(
    () =>
      trialBalance
        .filter(
          (row) => row.code.startsWith("100.") || row.code.startsWith("102."),
        )
        .reduce(
          (total, row) =>
            total + Number(row.debitBalance) - Number(row.creditBalance),
          0,
        ),
    [trialBalance],
  );

  const receivables = useMemo(
    () =>
      trialBalance
        .filter((row) => row.code.startsWith("120."))
        .reduce((total, row) => total + Number(row.debitBalance), 0),
    [trialBalance],
  );

  const payables = useMemo(
    () =>
      trialBalance
        .filter((row) => row.code.startsWith("320."))
        .reduce((total, row) => total + Number(row.creditBalance), 0),
    [trialBalance],
  );

  const inventoryValue = useMemo(
    () => inventory.reduce((total, item) => total + Number(item.value), 0),
    [inventory],
  );

  const overdueAmount = useMemo(
    () =>
      overdue.reduce((total, item) => total + Number(item.remainingAmount), 0),
    [overdue],
  );

  if (!activeCompany || !activePeriod) {
    return (
      <section className='container-fluid px-lg-4 py-4'>
        <div className='alert alert-warning'>
          Dashboard için aktif şirket ve mali dönem seçmelisiniz.
        </div>
      </section>
    );
  }

  return (
    <section className='container-fluid px-lg-4 py-4'>
      <header className='d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4'>
        <div>
          <h1 className='h3 mb-1'>Muhasebe Dashboard</h1>

          <p className='text-body-secondary mb-0'>
            {activeCompany.name} · {activePeriod.name}
          </p>
        </div>

        <div className='d-flex flex-wrap gap-2'>
          {canCreateSales && activePeriod.status === 1 && (
            <Link className='btn btn-primary' to='/invoices'>
              <i className='bi bi-plus-lg me-2' />
              Yeni Fatura
            </Link>
          )}

          <Link className='btn btn-outline-primary' to='/reports'>
            <i className='bi bi-bar-chart-line me-2' />
            Mali Raporlar
          </Link>
        </div>
      </header>

      {activePeriod.status === 2 && (
        <div className='alert alert-secondary d-flex align-items-center gap-2'>
          <i className='bi bi-lock-fill' />

          <span>
            Bu mali dönem kilitlidir. Dashboard yalnızca geçmiş verileri
            göstermektedir.
          </span>
        </div>
      )}

      {error && (
        <div className='alert alert-danger' role='alert'>
          {error}
        </div>
      )}

      {status === "loading" ? (
        <div className='text-center py-5'>
          <div className='spinner-border' role='status' />

          <p className='text-body-secondary mt-3'>Dashboard hazırlanıyor…</p>
        </div>
      ) : (
        <>
          {canReadReports ? (
            <div className='row g-3 mb-4'>
              <div className='col-sm-6 col-xl-3'>
                <DashboardCard
                  title='Kasa + Banka'
                  value={`${money(treasuryBalance)} ₺`}
                  subtitle='Dönem sonu bakiyesi'
                  icon='bi-bank'
                  to='/treasury'
                  tone='primary'
                />
              </div>

              <div className='col-sm-6 col-xl-3'>
                <DashboardCard
                  title='Alacaklar'
                  value={`${money(receivables)} ₺`}
                  subtitle='120 Alıcılar bakiyesi'
                  icon='bi-arrow-down-left-circle'
                  to='/counterparties'
                  tone='success'
                />
              </div>

              <div className='col-sm-6 col-xl-3'>
                <DashboardCard
                  title='Borçlar'
                  value={`${money(payables)} ₺`}
                  subtitle='320 Satıcılar bakiyesi'
                  icon='bi-arrow-up-right-circle'
                  to='/counterparties'
                  tone='danger'
                />
              </div>

              <div className='col-sm-6 col-xl-3'>
                <DashboardCard
                  title='Stok Değeri'
                  value={`${money(inventoryValue)} ₺`}
                  subtitle='Mevcut stok maliyeti'
                  icon='bi-boxes'
                  to='/inventory'
                  tone='warning'
                />
              </div>

              <div className='col-sm-6 col-xl-3'>
                <DashboardCard
                  title='Vadesi Geçen'
                  value={`${money(overdueAmount)} ₺`}
                  subtitle={`${overdue.length} açık fatura`}
                  icon='bi-exclamation-triangle'
                  to='/counterparties'
                  tone={overdue.length > 0 ? "danger" : "success"}
                />
              </div>

              <div className='col-sm-6 col-xl-3'>
                <DashboardCard
                  title='Dönem Geliri'
                  value={`${money(incomeStatement?.income)} ₺`}
                  icon='bi-graph-up-arrow'
                  to='/reports'
                  tone='success'
                />
              </div>

              <div className='col-sm-6 col-xl-3'>
                <DashboardCard
                  title='Dönem Gideri'
                  value={`${money(incomeStatement?.expense)} ₺`}
                  icon='bi-graph-down-arrow'
                  to='/reports'
                  tone='danger'
                />
              </div>

              <div className='col-sm-6 col-xl-3'>
                <DashboardCard
                  title={
                    Number(incomeStatement?.result) >= 0
                      ? "Dönem Kârı"
                      : "Dönem Zararı"
                  }
                  value={`${money(
                    Math.abs(Number(incomeStatement?.result ?? 0)),
                  )} ₺`}
                  icon='bi-pie-chart'
                  to='/reports'
                  tone={
                    Number(incomeStatement?.result) >= 0 ? "success" : "danger"
                  }
                />
              </div>
            </div>
          ) : (
            <div className='alert alert-info mb-4'>
              Satış rolü ile yalnızca satış operasyonları görüntülenebilir. Mali
              rapor kartları bu role kapalıdır.
            </div>
          )}

          <div className='row g-4'>
            <div className='col-xl-7'>
              <div className='card h-100 border-0 shadow-sm'>
                <div className='card-header bg-body d-flex justify-content-between align-items-center'>
                  <div>
                    <h2 className='h5 mb-0'>Son Faturalar</h2>

                    <small className='text-body-secondary'>
                      Aktif dönemdeki son 5 kayıt
                    </small>
                  </div>

                  <Link to='/invoices' className='small'>
                    Tümünü Gör
                  </Link>
                </div>

                {invoices.length === 0 ? (
                  <div className='card-body'>
                    <div className='text-center py-4'>
                      <i className='bi bi-receipt fs-2 text-body-secondary' />

                      <p className='text-body-secondary mt-3 mb-0'>
                        Bu dönemde henüz fatura bulunmuyor.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className='table-responsive'>
                    <table className='table table-hover align-middle mb-0'>
                      <thead>
                        <tr>
                          <th>Fatura</th>

                          <th>Tarih</th>

                          <th>Tür</th>

                          <th className='text-end'>Tutar</th>

                          <th>Durum</th>
                        </tr>
                      </thead>

                      <tbody>
                        {invoices.map((invoice) => (
                          <tr key={invoice.id}>
                            <td className='fw-semibold'>{invoice.number}</td>

                            <td>{invoice.date}</td>

                            <td>{invoiceTypeLabel(invoice.type)}</td>

                            <td className='text-end fw-semibold'>
                              {money(invoice.grandTotal)} ₺
                            </td>

                            <td>
                              <span
                                className={`badge ${statusBadge(
                                  invoice.status,
                                )}`}
                              >
                                {invoiceStatusLabel(invoice.status)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className='col-xl-5'>
              <div className='card h-100 border-0 shadow-sm'>
                <div className='card-header bg-body d-flex justify-content-between align-items-center'>
                  <div>
                    <h2 className='h5 mb-0'>Hızlı İşlemler</h2>

                    <small className='text-body-secondary'>
                      Sık kullanılan muhasebe işlemleri
                    </small>
                  </div>
                </div>

                <div className='card-body'>
                  <div className='row g-3'>
                    {canCreateSales && (
                      <div className='col-6'>
                        <Link
                          to='/invoices'
                          className='btn btn-outline-primary w-100 h-100 py-3'
                        >
                          <i className='bi bi-receipt fs-4 d-block mb-2' />
                          Fatura
                        </Link>
                      </div>
                    )}

                    {canWriteAccounting && (
                      <>
                        <div className='col-6'>
                          <Link
                            to='/payments'
                            className='btn btn-outline-success w-100 h-100 py-3'
                          >
                            <i className='bi bi-cash-stack fs-4 d-block mb-2' />
                            Tahsilat
                          </Link>
                        </div>

                        <div className='col-6'>
                          <Link
                            to='/journal'
                            className='btn btn-outline-secondary w-100 h-100 py-3'
                          >
                            <i className='bi bi-journal-text fs-4 d-block mb-2' />
                            Yevmiye
                          </Link>
                        </div>

                        <div className='col-6'>
                          <Link
                            to='/transfers'
                            className='btn btn-outline-info w-100 h-100 py-3'
                          >
                            <i className='bi bi-arrow-left-right fs-4 d-block mb-2' />
                            Virman
                          </Link>
                        </div>
                      </>
                    )}

                    <div className='col-6'>
                      <Link
                        to='/counterparties'
                        className='btn btn-outline-dark w-100 h-100 py-3'
                      >
                        <i className='bi bi-people fs-4 d-block mb-2' />
                        Cariler
                      </Link>
                    </div>

                    {canReadReports && (
                      <div className='col-6'>
                        <Link
                          to='/reports'
                          className='btn btn-outline-primary w-100 h-100 py-3'
                        >
                          <i className='bi bi-bar-chart-line fs-4 d-block mb-2' />
                          Raporlar
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {role !== CompanyRole.Sales && (
              <div className='col-xl-7'>
                <div className='card border-0 shadow-sm'>
                  <div className='card-header bg-body d-flex justify-content-between align-items-center'>
                    <div>
                      <h2 className='h5 mb-0'>Son Yevmiye Fişleri</h2>

                      <small className='text-body-secondary'>
                        Aktif dönemdeki son 5 fiş
                      </small>
                    </div>

                    <Link to='/journal' className='small'>
                      Tümünü Gör
                    </Link>
                  </div>

                  {journals.length === 0 ? (
                    <div className='card-body'>Yevmiye fişi bulunmuyor.</div>
                  ) : (
                    <div className='table-responsive'>
                      <table className='table table-hover align-middle mb-0'>
                        <thead>
                          <tr>
                            <th>Fiş No</th>

                            <th>Tarih</th>

                            <th>Kaynak</th>

                            <th>Durum</th>
                          </tr>
                        </thead>

                        <tbody>
                          {journals.map((journal) => (
                            <tr key={journal.id}>
                              <td className='fw-semibold'>{journal.number}</td>

                              <td>{journal.date}</td>

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
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {canReadReports && (
              <div className='col-xl-5'>
                <div className='card border-0 shadow-sm'>
                  <div className='card-header bg-body d-flex justify-content-between align-items-center'>
                    <div>
                      <h2 className='h5 mb-0'>Vadesi Geçen Faturalar</h2>

                      <small className='text-body-secondary'>
                        Takip gerektiren açık faturalar
                      </small>
                    </div>

                    <span
                      className={`badge ${
                        overdue.length > 0
                          ? "text-bg-danger"
                          : "text-bg-success"
                      }`}
                    >
                      {overdue.length}
                    </span>
                  </div>

                  {overdue.length === 0 ? (
                    <div className='card-body text-center py-4'>
                      <i className='bi bi-check-circle-fill text-success fs-3' />

                      <p className='mb-0 mt-2'>
                        Vadesi geçmiş açık fatura yok.
                      </p>
                    </div>
                  ) : (
                    <div className='list-group list-group-flush'>
                      {overdue.slice(0, 5).map((item) => (
                        <div key={item.invoice.id} className='list-group-item'>
                          <div className='d-flex justify-content-between gap-3'>
                            <div>
                              <div className='fw-semibold'>
                                {item.invoice.number}
                              </div>

                              <small className='text-danger'>
                                {item.daysOverdue} gün gecikmiş
                              </small>
                            </div>

                            <div className='text-end'>
                              <strong>{money(item.remainingAmount)} ₺</strong>

                              <div className='small text-body-secondary'>
                                Kalan
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
