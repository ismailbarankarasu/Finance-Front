import { useEffect, useState } from "react";
import { Link } from "react-router";
import api from "../../api/client";
import { EntryType } from "../../utils";
import { formatAmount, formatDate } from "../../utils/finance";
import { SummaryCards } from "../../components/SummaryCards";
import { normalizeSummary } from "../Reports/reportData";

export function HomePage() {
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("loading");
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadDashboard() {
      try {
        const [summary, recent] = await Promise.all([
          api.get("/reports/summary", { signal: controller.signal }),
          api.get("/reports/recent", {
            params: { take: 5 },
            signal: controller.signal,
          }),
        ]);
        if (controller.signal.aborted) return;
        if (!Array.isArray(recent.data))
          throw new Error("Invalid recent transactions response");
        setData({
          summary: normalizeSummary(summary.data),
          recent: recent.data,
        });
        setStatus("success");
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      }
    }
    loadDashboard();
    return () => controller.abort();
  }, [refreshKey]);

  return (
    <section className='container py-4' aria-labelledby='homeTitle'>
      <header className='d-flex flex-wrap justify-content-between align-items-start gap-3 mb-4'>
        <div>
          <h1 className='h3' id='homeTitle'>
            Finans özeti
          </h1>
          <p className='text-body-secondary mb-0'>
            Tüm zamanlardaki gelir, gider ve son işlemlerin.
          </p>
        </div>
        <div className='d-flex flex-wrap gap-2'>
          <Link className='btn btn-primary' to='/transactions'>
            İşlemleri yönet
          </Link>
          <Link className='btn btn-outline-primary' to='/reports'>
            Raporları incele
          </Link>
        </div>
      </header>
      {status === "loading" ? (
        <p role='status' className='py-5 text-center'>
          Özet yükleniyor…
        </p>
      ) : status === "error" ? (
        <div className='alert alert-danger' role='alert'>
          <p>Finans özeti yüklenemedi.</p>
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
          <SummaryCards summary={data.summary} />
          <div className='card'>
            <div className='card-header d-flex justify-content-between align-items-center'>
              <h2 className='h5 mb-0'>Son 5 işlem</h2>
              <Link to='/transactions'>Tüm işlemler</Link>
            </div>
            {data.recent.length === 0 ? (
              <div className='card-body'>
                <p className='mb-0'>
                  Henüz işlem bulunmuyor. İşlemler sayfasından ilk kaydını
                  ekleyebilirsin.
                </p>
              </div>
            ) : (
              <div
                className='table-responsive'
                role='region'
                aria-label='Son işlemler tablosu'
                tabIndex={0}
              >
                <table className='table align-middle mb-0'>
                  <caption className='visually-hidden'>
                    Tüm zamanlardaki en son 5 işlem
                  </caption>
                  <thead>
                    <tr>
                      <th scope='col'>Tarih</th>
                      <th scope='col'>Kategori</th>
                      <th scope='col'>Tür</th>
                      <th scope='col'>Açıklama</th>
                      <th scope='col' className='text-end'>
                        Tutar
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((item) => (
                      <tr key={item.id}>
                        <td className='text-nowrap'>{formatDate(item.date)}</td>
                        <td>{item.categoryName}</td>
                        <td
                          className={
                            item.type === EntryType.Income
                              ? "text-success"
                              : "text-danger"
                          }
                        >
                          {item.type === EntryType.Income ? "Gelir" : "Gider"}
                        </td>
                        <td className='text-break'>
                          {item.description || "—"}
                        </td>
                        <td className='text-end text-nowrap'>
                          {formatAmount(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
