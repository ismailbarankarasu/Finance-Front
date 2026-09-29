import { useEffect, useRef, useState } from "react";
import api from "../../api/client";
import { EntryType } from "../../utils";
import { dateRangeLabel, dateRangeParams } from "../../utils/finance";
import { SummaryCards } from "../../components/SummaryCards";
import { ReportChart } from "../../components/ReportChart";
import {
  normalizeCategories,
  normalizeMonthly,
  normalizeSummary,
  reportSections,
} from "./reportData";
import { monthlyChartOption, categoryChartOption } from "./reportCharts";
import { ReportTable } from "./ReportTable";
import "./reports.css";

function initialFilters() {
  const year = new Date().getFullYear();
  return { from: `${year}-01-01`, to: `${year}-12-31`, year, type: "" };
}

export default function ReportsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [draft, setDraft] = useState(initialFilters);
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [refreshKey, setRefreshKey] = useState(0);
  const [filterError, setFilterError] = useState("");
  const [exportError, setExportError] = useState("");
  const [exportStatus, setExportStatus] = useState("");
  const [exporting, setExporting] = useState("");
  const exportingRef = useRef(false);
  const monthlyChart = useRef(null);
  const categoryChart = useRef(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadReports() {
      try {
        const params = dateRangeParams(filters);
        const [summary, categories, monthly] = await Promise.all([
          api.get("/reports/summary", { params, signal: controller.signal }),
          api.get("/reports/by-category", {
            params: {
              ...params,
              ...(filters.type !== "" ? { type: Number(filters.type) } : {}),
            },
            signal: controller.signal,
          }),
          api.get("/reports/monthly", {
            params: { year: filters.year },
            signal: controller.signal,
          }),
        ]);
        if (controller.signal.aborted) return;
        setData({
          summary: normalizeSummary(summary.data),
          categories: normalizeCategories(categories.data),
          monthly: normalizeMonthly(monthly.data),
        });
        setStatus("success");
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      }
    }
    loadReports();
    return () => controller.abort();
  }, [filters, refreshKey]);

  function updateDraft(field, value) {
    setDraft((previous) => ({ ...previous, [field]: value }));
    setFilterError("");
  }

  function applyFilters(event) {
    event.preventDefault();
    if (draft.from && draft.to && draft.from > draft.to) {
      setFilterError("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
      return;
    }
    const year = Number(draft.year);
    if (!Number.isInteger(year) || year < 1 || year > 9999) {
      setFilterError("1 ile 9999 arasında bir yıl girin.");
      return;
    }
    setStatus("loading");
    setExportError("");
    setExportStatus("");
    setFilters({ ...draft, year });
  }

  function resetFilters() {
    const defaults = initialFilters();
    setDraft(defaults);
    setFilters(defaults);
    setFilterError("");
    setExportError("");
    setExportStatus("");
    setStatus("loading");
  }

  async function downloadReport(format) {
    if (status !== "success" || exportingRef.current) return;
    exportingRef.current = true;
    setExporting(format);
    setExportError("");
    setExportStatus("");
    // Capture the loaded data and charts before loading the export libraries.
    try {
      const sections = reportSections(data, filters);
      const images =
        format === "pdf"
          ? {
              "Aylık karşılaştırma": monthlyChart.current?.getImage(),
              "Kategori dağılımı": categoryChart.current?.getImage(),
            }
          : {};
      const { downloadReportFile } = await import("./reportExport");
      await downloadReportFile(format, sections, images);
      setExportStatus(`${format.toUpperCase()} dosyası hazırlandı.`);
    } catch {
      setExportError("Dosya hazırlanamadı. Lütfen tekrar deneyin.");
    } finally {
      exportingRef.current = false;
      setExporting("");
    }
  }

  const sections = data ? reportSections(data, filters) : [];
  const hasMonthlyData = data?.monthly.some(
    (item) => item.income !== 0 || item.expense !== 0,
  );

  return (
    <section
      className='container py-4 reports-page'
      aria-labelledby='reportsTitle'
    >
      <header className='d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4'>
        <div>
          <h1 className='h3' id='reportsTitle'>
            Raporlar
          </h1>
          <p className='text-body-secondary mb-0'>
            Gelir, gider ve bakiyenin zaman içindeki değişimini incele.
          </p>
        </div>
        <div
          className='d-flex flex-wrap gap-2'
          aria-label='Rapor indirme seçenekleri'
        >
          {[
            ["csv", "CSV"],
            ["xlsx", "Excel (.xlsx)"],
            ["pdf", "PDF"],
          ].map(([format, label]) => (
            <button
              key={format}
              type='button'
              className='btn btn-outline-primary btn-sm'
              disabled={status !== "success" || Boolean(exporting)}
              onClick={() => downloadReport(format)}
            >
              <i className='bi bi-download me-1' aria-hidden='true' />
              {exporting === format ? "Hazırlanıyor…" : `${label} indir`}
            </button>
          ))}
        </div>
      </header>
      {exportError && (
        <p className='alert alert-danger' role='alert'>
          {exportError}
        </p>
      )}
      {exportStatus && (
        <p className='alert alert-success' role='status'>
          {exportStatus}
        </p>
      )}
      <form
        className='card card-body mb-4'
        onSubmit={applyFilters}
        aria-label='Rapor filtreleri'
      >
        <fieldset disabled={Boolean(exporting)}>
          <legend className='h6'>Rapor kapsamı</legend>
          <div className='row g-3 align-items-end'>
            <div className='col-sm-6 col-lg-3'>
              <label className='form-label' htmlFor='reportFrom'>
                Başlangıç tarihi
              </label>
              <input
                id='reportFrom'
                type='date'
                className='form-control'
                value={draft.from}
                onChange={(event) => updateDraft("from", event.target.value)}
              />
            </div>
            <div className='col-sm-6 col-lg-3'>
              <label className='form-label' htmlFor='reportTo'>
                Bitiş tarihi
              </label>
              <input
                id='reportTo'
                type='date'
                className='form-control'
                value={draft.to}
                onChange={(event) => updateDraft("to", event.target.value)}
              />
            </div>
            <div className='col-sm-6 col-lg-3'>
              <label className='form-label' htmlFor='reportType'>
                Kategori raporu türü
              </label>
              <select
                id='reportType'
                className='form-select'
                value={draft.type}
                onChange={(event) => updateDraft("type", event.target.value)}
              >
                <option value=''>Gelir ve gider</option>
                <option value={EntryType.Income}>Gelir</option>
                <option value={EntryType.Expense}>Gider</option>
              </select>
            </div>
            <div className='col-sm-6 col-lg-3'>
              <label className='form-label' htmlFor='reportYear'>
                Aylık rapor yılı
              </label>
              <input
                id='reportYear'
                type='number'
                min='1'
                max='9999'
                step='1'
                required
                className='form-control'
                value={draft.year}
                onChange={(event) => updateDraft("year", event.target.value)}
              />
            </div>
          </div>
          <p className='form-text mt-3'>
            Tarih aralığı özet ve kategori raporlarını etkiler. Aylık
            karşılaştırma seçilen yılın tamamını gösterir. Tür seçimi yalnızca
            kategori raporunu etkiler.
          </p>
          <div className='d-flex gap-2'>
            <button className='btn btn-primary' type='submit'>
              Uygula
            </button>
            <button
              className='btn btn-outline-secondary'
              type='button'
              onClick={resetFilters}
            >
              Sıfırla
            </button>
          </div>
          {filterError && (
            <p className='text-danger mt-3 mb-0' role='alert'>
              {filterError}
            </p>
          )}
        </fieldset>
      </form>
      {status === "loading" ? (
        <p className='text-center py-5' role='status'>
          <span
            className='spinner-border spinner-border-sm me-2'
            aria-hidden='true'
          />
          Raporlar yükleniyor…
        </p>
      ) : status === "error" ? (
        <div className='alert alert-danger' role='alert'>
          <p>Raporlar yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.</p>
          <button
            type='button'
            className='btn btn-outline-danger btn-sm'
            onClick={() => {
              setStatus("loading");
              setRefreshKey((previous) => previous + 1);
            }}
          >
            Tekrar dene
          </button>
        </div>
      ) : (
        <>
          <h2 className='h5'>Genel özet</h2>
          <p className='text-body-secondary small'>{sections[0].scope}</p>
          <SummaryCards summary={data.summary} />
          {data.summary.transactionCount === 0 && (
            <p className='alert alert-light border'>
              Seçilen tarih aralığında işlem bulunmuyor.
            </p>
          )}
          <div className='row g-4'>
            <div className='col-lg-7'>
              <article className='card h-100'>
                <div className='card-body'>
                  <h2 className='h5'>Aylık karşılaştırma</h2>
                  <p className='small text-body-secondary'>
                    {filters.year} yılı · Gelir, gider ve bakiye
                  </p>
                  {hasMonthlyData ? (
                    <ReportChart
                      ref={monthlyChart}
                      option={monthlyChartOption(data.monthly)}
                      label={`${filters.year} yılı aylık gelir, gider ve bakiye grafiği. Değerler aşağıdaki tabloda.`}
                    />
                  ) : (
                    <p className='report-empty'>
                      Seçilen yılda işlem bulunmuyor.
                    </p>
                  )}
                  <ReportTable section={sections[2]} />
                </div>
              </article>
            </div>
            <div className='col-lg-5'>
              <article className='card h-100'>
                <div className='card-body'>
                  <h2 className='h5'>Kategori dağılımı</h2>
                  <p className='small text-body-secondary'>
                    {sections[1].scope}
                  </p>
                  {data.categories.some((item) => item.total > 0) ? (
                    <ReportChart
                      ref={categoryChart}
                      option={categoryChartOption(data.categories)}
                      label='Kategori toplamlarının dağılımı. Değerler aşağıdaki tabloda.'
                    />
                  ) : (
                    <p className='report-empty'>
                      Bu kapsamda kategori verisi bulunmuyor.
                    </p>
                  )}
                  <ReportTable section={sections[1]} />
                </div>
              </article>
            </div>
          </div>
          <p className='small text-body-secondary mt-3 mb-0'>
            İndirilen dosyalar uygulanan filtrelerdeki özet, kategori ve aylık
            rapor verilerini içerir. Özet dönemi: {dateRangeLabel(filters)}.
          </p>
        </>
      )}
    </section>
  );
}
