import { useEffect, useState } from "react";
import api from "../../api/client";
import { EntryType } from "../../utils";
import { dateRangeParams } from "../../utils/finance";
import CreateTransactionModal from "./CreateTransactionModal";
import { ConfirmModal } from "../../components/ConfirmModal";
import { TransactionUpdateModal } from "./TransactionUpdateModal";
import "./transaction-page.css";

const amountFormatter = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const emptyFilters = { type: "", categoryId: "", from: "", to: "", q: "" };

function buildParams(filters, page, pageSize) {
  const params = { page, pageSize, ...dateRangeParams(filters) };
  if (filters.type !== "") params.type = Number(filters.type);
  if (filters.categoryId !== "") params.categoryId = Number(filters.categoryId);
  if (filters.q.trim()) params.q = filters.q.trim();
  return params;
}

function formatDate(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("tr-TR", { day: "numeric", month: "short", year: "numeric" });
}

export function TransactionPage() {
  const [draftFilters, setDraftFilters] = useState(emptyFilters);
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [categories, setCategories] = useState([]);
  const [categoryStatus, setCategoryStatus] = useState("loading");
  const [categoryRetry, setCategoryRetry] = useState(0);
  const [filterError, setFilterError] = useState("");
  const [paginatedData, setPaginatedData] = useState({
    items: [],
    page: 1,
    pageSize: 10,
    totalCount: 0,
  });

  const [status, setStatus] = useState("loading");
  const [refreshKey, setRefreshKey] = useState(0);
  const [transactionToDelete, setTransactionToDelete] = useState(null);
  const [transactionToUpdate, setTransactionToUpdate] = useState(null);
  const actionsDisabled = transactionToDelete !== null || transactionToUpdate !== null;
  const totalPages = Math.max(1, Math.ceil(paginatedData.totalCount / pageSize));
  const hasFilters = Object.values(filters).some((value) => value !== "");
  const availableCategories = categories.filter((category) => draftFilters.type === "" || category.type === Number(draftFilters.type));

  function updateFilter(field, value) {
    setDraftFilters((previous) => ({ ...previous, [field]: value, ...(field === "type" ? { categoryId: "" } : {}) }));
    setFilterError("");
  }

  function applyFilters(event) {
    event.preventDefault();
    if (draftFilters.from && draftFilters.to && draftFilters.from > draftFilters.to) {
      setFilterError("Başlangıç tarihi bitiş tarihinden sonra olamaz.");
      return;
    }
    setFilters({ ...draftFilters, q: draftFilters.q.trim() });
    setPage(1);
    refreshTransactions();
  }

  function clearFilters() {
    setDraftFilters(emptyFilters);
    setFilters(emptyFilters);
    setFilterError("");
    setPage(1);
    refreshTransactions();
  }

  function changePage(nextPage) {
    setStatus("loading");
    setPage(nextPage);
  }

  useEffect(() => {
    const controller = new AbortController();
    async function loadCategories() {
      try {
        const { data } = await api.get("/categories", { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!Array.isArray(data)) throw new Error("Invalid category response");
        setCategories(data);
        setCategoryStatus("success");
      } catch {
        if (!controller.signal.aborted) setCategoryStatus("error");
      }
    }
    loadCategories();
    return () => controller.abort();
  }, [categoryRetry]);

  function refreshTransactions() {
    setStatus("loading");
    setRefreshKey((previous) => previous + 1);
  }

  async function handleDelete() {
    if (!transactionToDelete) return;
    await api.delete(`/transactions/${transactionToDelete.id}`);
    refreshTransactions();
  }

  useEffect(() => {
    const controller = new AbortController();

    const getData = async () => {
      try {
        const { data } = await api.get("/transactions", {
          params: buildParams(filters, page, pageSize),
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!data || !Array.isArray(data.items)) {
          throw new Error("Invalid transaction response");
        }
        const lastPage = Math.max(1, Math.ceil(data.totalCount / pageSize));
        if (page > lastPage) {
          setPage(lastPage);
          return;
        }
        setPaginatedData({ ...data, totalCount: Number(data.totalCount), page: Number(data.page), pageSize: Number(data.pageSize) });
        setStatus("success");
      } catch {
        if (!controller.signal.aborted) setStatus("error");
      }
    };

    getData();
    return () => controller.abort();
  }, [refreshKey, filters, page, pageSize]);
  return (
    <section className='transactions-page' aria-labelledby='transactionPageTitle'>
      <header className='transactions-page-header'>
        <div className='transactions-page-heading'>
          <span className='transactions-eyebrow'>GELİR & GİDER TAKİBİ</span>
          <h1 id='transactionPageTitle'>İşlem geçmişi</h1>
          <p>Gelir ve giderlerini tek bir yerden takip et, kolayca düzenle.</p>
        </div>
        <CreateTransactionModal
          onLoad={refreshTransactions}
          disabled={actionsDisabled}
          buttonClassName='btn btn-primary transactions-create-button'
        />
      </header>
      <form className='transactions-filters' onSubmit={applyFilters} aria-label='İşlem filtreleri'>
        <div className='transactions-filter-field transactions-filter-search'>
          <label htmlFor='filterQuery'>Ara</label>
          <input id='filterQuery' type='search' className='form-control' placeholder='İşlemlerde ara…'
            value={draftFilters.q} onChange={(event) => updateFilter("q", event.target.value)} />
        </div>
        <div className='transactions-filter-field'>
          <label htmlFor='filterType'>İşlem türü</label>
          <select id='filterType' className='form-select' value={draftFilters.type} onChange={(event) => updateFilter("type", event.target.value)}>
            <option value=''>Tüm türler</option>
            <option value={EntryType.Income}>Gelir</option>
            <option value={EntryType.Expense}>Gider</option>
          </select>
        </div>
        <div className='transactions-filter-field'>
          <label htmlFor='filterCategory'>Kategori</label>
          <select id='filterCategory' className='form-select' value={draftFilters.categoryId}
            disabled={categoryStatus !== "success"} onChange={(event) => updateFilter("categoryId", event.target.value)}>
            <option value=''>{categoryStatus === "loading" ? "Yükleniyor…" : "Tüm kategoriler"}</option>
            {availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          {categoryStatus === "error" && <div role='alert'>
            Kategoriler yüklenemedi.
            <button type='button' className='btn btn-link btn-sm' onClick={() => {
              setCategoryStatus("loading");
              setCategoryRetry((previous) => previous + 1);
            }}>Tekrar dene</button>
          </div>}
        </div>
        <div className='transactions-filter-field'>
          <label htmlFor='filterFrom'>Başlangıç tarihi</label>
          <input id='filterFrom' type='date' className='form-control' value={draftFilters.from}
            onChange={(event) => updateFilter("from", event.target.value)} />
        </div>
        <div className='transactions-filter-field'>
          <label htmlFor='filterTo'>Bitiş tarihi</label>
          <input id='filterTo' type='date' className='form-control' value={draftFilters.to}
            onChange={(event) => updateFilter("to", event.target.value)} />
        </div>
        <div className='transactions-filter-buttons'>
          <button type='submit' className='btn btn-primary'>Uygula</button>
          <button type='button' className='btn btn-outline-secondary' onClick={clearFilters}>Temizle</button>
        </div>
        {filterError && <p className='transactions-filter-error text-danger' role='alert'>{filterError}</p>}
      </form>
      <div className='transactions-card'>
        <div className='transactions-card-header'>
          <h2>Tüm işlemler</h2>
          {status === "success" && (
            <span className='transactions-count'>{paginatedData.totalCount} kayıt</span>
          )}
        </div>
        <div className='transactions-table-scroll' role='region' aria-label='İşlem listesi' tabIndex={0}>
        <table className='table align-middle mb-0 transactions-table'>
          <caption className='visually-hidden'>Gelir ve gider işlemleri; kategori, tür, tutar ve düzenleme seçenekleri.</caption>
          <thead>
            <tr>
              <th scope='col' className='transactions-number'>#</th>
              <th scope='col'>Kategori</th>
              <th scope='col'>Tip</th>
              <th scope='col' className='transactions-amount'>Tutar</th>
              <th scope='col' className='transactions-actions-heading'>İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {status === "loading" ? (
              <tr>
                <td colSpan={5} className='transactions-state' role='status'>
                  <div className='transactions-state-content'>
                    <span className='spinner-border spinner-border-sm text-primary' aria-hidden='true'></span>
                    <p>İşlemler yükleniyor...</p>
                  </div>
                </td>
              </tr>
            ) : status === "error" ? (
              <tr>
                <td colSpan={5} className='transactions-state' role='alert'>
                  <div className='transactions-state-content'>
                    <i className='bi bi-exclamation-circle text-danger' aria-hidden='true'></i>
                    <h3>İşlemler yüklenemedi</h3>
                    <p>Lütfen tekrar deneyin.</p>
                    <button type='button' className='btn btn-outline-primary btn-sm' onClick={refreshTransactions}>
                      <i className='bi bi-arrow-clockwise me-1' aria-hidden='true'></i>
                      Tekrar dene
                    </button>
                  </div>
                </td>
              </tr>
            ) : paginatedData.items.length === 0 ? (
              <tr>
                <td colSpan={5} className='transactions-state'>
                  <div className='transactions-state-content'>
                    <i className='bi bi-receipt' aria-hidden='true'></i>
                    <h3>{hasFilters ? "Filtrelere uygun işlem bulunamadı" : "Henüz işlem bulunmuyor"}</h3>
                    <p>{hasFilters ? "Filtreleri değiştirerek tekrar deneyin." : "Yeni İşlem Ekle butonuyla ilk gelir veya giderini kaydet."}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.items.map((transaction, index) => {
                const isIncome = transaction.type === EntryType.Income;
                const isExpense = transaction.type === EntryType.Expense;
                const typeClass = isIncome ? "is-income" : isExpense ? "is-expense" : "";
                const categoryName = transaction.categoryName ?? transaction.category?.name ?? "-";
                const dateLabel = formatDate(transaction.date);

                return (
                <tr key={transaction.id}>
                  <td className='transactions-number'>{String((page - 1) * pageSize + index + 1).padStart(2, "0")}</td>
                  <td>
                    <div className='transactions-category'>
                      <span className={`transactions-category-icon ${typeClass}`} aria-hidden='true'>
                        <i className={`bi ${isIncome ? "bi-arrow-down-left" : isExpense ? "bi-arrow-up-right" : "bi-arrow-left-right"}`}></i>
                      </span>
                      <div className='transactions-category-copy'>
                        <strong>{categoryName}</strong>
                        {dateLabel && <time dateTime={transaction.date}>{dateLabel}</time>}
                        {transaction.description && <span className='small text-body-secondary'>{transaction.description}</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`transactions-type ${typeClass}`}>
                      {isIncome ? "Gelir" : isExpense ? "Gider" : "-"}
                    </span>
                  </td>
                  <td className='transactions-amount'>{amountFormatter.format(transaction.amount)}</td>
                  <td>
                    <div className='transactions-actions'>
                      <button type='button' className='transactions-action transactions-action--edit'
                        disabled={actionsDisabled} onClick={() => setTransactionToUpdate(transaction)}
                        aria-label={`${categoryName} işlemini güncelle`} title='Güncelle'>
                        <i className='bi bi-pencil-square' aria-hidden='true'></i>
                        <span className='transactions-action-label'>Güncelle</span>
                      </button>
                      <button type='button' className='transactions-action transactions-action--delete'
                        disabled={actionsDisabled} onClick={() => setTransactionToDelete(transaction)}
                        aria-label={`${categoryName} işlemini sil`} title='Sil'>
                        <i className='bi bi-trash3' aria-hidden='true'></i>
                        <span className='transactions-action-label'>Sil</span>
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
        </div>
          <div className='transactions-card-footer'>
            <span role='status'>{status === "success" && (paginatedData.totalCount === 0
              ? "0 kayıt"
              : `Toplam ${paginatedData.totalCount} kaydın ${(page - 1) * pageSize + 1}–${(page - 1) * pageSize + paginatedData.items.length} arası gösteriliyor.`)}</span>
            <div className='transactions-pagination'>
              <label htmlFor='transactionPageSize'>Sayfa başına</label>
              <select id='transactionPageSize' className='form-select form-select-sm' value={pageSize}
                onChange={(event) => { setPageSize(Number(event.target.value)); changePage(1); }}>
                {[10, 25, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
              </select>
              <nav aria-label='İşlem sayfaları'>
                <button type='button' className='btn btn-outline-secondary btn-sm' disabled={status !== "success" || page <= 1}
                  onClick={() => changePage(page - 1)}>Önceki</button>
                <span aria-current='page'>Sayfa {page} / {totalPages}</span>
                <button type='button' className='btn btn-outline-secondary btn-sm' disabled={status !== "success" || page >= totalPages}
                  onClick={() => changePage(page + 1)}>Sonraki</button>
              </nav>
            </div>
          </div>
      </div>
      <ConfirmModal
        show={transactionToDelete !== null}
        title='İşlemi silmek istiyor musunuz?'
        body={`"${transactionToDelete?.categoryName ?? ""}" kategorisindeki ${transactionToDelete?.amount ?? ""} tutarındaki işlem silinecek. Bu işlem geri alınamaz.`}
        confirmText='Evet, sil'
        confirmButtonColor='#dc3545'
        loadingText='Siliniyor...'
        successTitle='Silindi!'
        successText='İşlem başarıyla silindi.'
        errorTitle='İşlem silinemedi'
        errorText='İşlem silinemedi. Lütfen tekrar deneyin.'
        onConfirm={handleDelete}
        onClose={() => setTransactionToDelete(null)}
      />
      {transactionToUpdate && (
        <TransactionUpdateModal
          key={transactionToUpdate.id}
          transaction={transactionToUpdate}
          onClose={() => setTransactionToUpdate(null)}
          onUpdated={refreshTransactions}
        />
      )}
    </section>
  );
}
