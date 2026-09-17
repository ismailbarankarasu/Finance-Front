import { useCallback, useEffect, useRef, useState } from "react";
import { ConfirmModal } from "../../components/ConfirmModal";
import api from "../../api/client";
import { PageHeader } from "../../components/PageHeader";
import { EntryType } from "../../utils";
import CreateCategoryModal from "./CreateCategoryModal";
import { CategoryUpdateModal } from "./CategoryUpdateModal";

const categoryGroups = [
  {
    type: EntryType.Income,
    title: "Gelir Kategorileri",
    emptyText: "Henüz gelir kategorisi eklenmedi.",
  },
  {
    type: EntryType.Expense,
    title: "Gider Kategorileri",
    emptyText: "Henüz gider kategorisi eklenmedi.",
  },
];

export default function CategoryPage() {
  const [incomeData, setIncomeData] = useState([]);
  const [expenseData, setExpenseData] = useState([]);
  const [status, setStatus] = useState({});
  const loadController = useRef(null);
  const [deletingId, setDeletingId] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);
  const [categoryToUpdate, setCategoryToUpdate] = useState(null);

  const loadData = useCallback(async () => {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;

    async function getCategories(type, setData) {
      try {
        const { data } = await api.get("/categories", {
          params: { type },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (!Array.isArray(data)) throw new Error("Invalid category response");
        setData(data);
        setStatus((previous) => ({ ...previous, [type]: "success" }));
      } catch {
        if (controller.signal.aborted) return;
        setStatus((previous) => ({ ...previous, [type]: "error" }));
      }
    }

    await Promise.all([
      getCategories(EntryType.Income, setIncomeData),
      getCategories(EntryType.Expense, setExpenseData),
    ]);
  }, []);

  useEffect(() => {
    loadData();
    return () => loadController.current?.abort();
  }, [loadData]);

  function retryCategories() {
    setStatus({});
    return loadData();
  }

  async function handleDelete() {
    if (!categoryToDelete) return;
    const { id } = categoryToDelete;
    setDeletingId(id);
    try {
      await api.delete(`/categories/${id}`);
      setIncomeData((previous) => previous.filter((item) => item.id !== id));
      setExpenseData((previous) => previous.filter((item) => item.id !== id));
      setStatus({});
      await loadData();
    } finally {
      setDeletingId(null);
    }
  }
  return (
    <div className='container py-4'>
      <PageHeader
        className='mb-1'
        header='Finans App Gelir Gider Takibi'
        title='Kategori Listesi'
        subTitle='Gelir ve Gider Kategorilerinizi düzenleyin, yeni kategoriler ekleyin.'
      />
      <CreateCategoryModal onCreated={retryCategories} />
      <div className='accordion' id='categoryAccordion'>
        {categoryGroups.map(({ type, title, emptyText }) => {
          const categories =
            type === EntryType.Income ? incomeData : expenseData;

          return (
            <div className='accordion-item' key={type}>
              <h2 className='accordion-header'>
                <button
                  className='accordion-button collapsed'
                  type='button'
                  id={`category-heading-${type}`}
                  data-bs-toggle='collapse'
                  data-bs-target={`#category-panel-${type}`}
                  aria-expanded='false'
                  aria-controls={`category-panel-${type}`}
                >
                  {title}
                </button>
              </h2>
              <div
                id={`category-panel-${type}`}
                className='accordion-collapse collapse'
                role='region'
                aria-labelledby={`category-heading-${type}`}
                data-bs-parent='#categoryAccordion'
              >
                <div className='accordion-body'>
                  {!status[type] ? (
                    <p className='text-body-secondary mb-0' role='status'>
                      Kategoriler yükleniyor...
                    </p>
                  ) : status[type] === "error" ? (
                    <div className='alert alert-danger mb-0' role='alert'>
                      <p>Kategoriler yüklenemedi. Lütfen tekrar deneyin.</p>
                      <button
                        type='button'
                        className='btn btn-outline-danger btn-sm'
                        onClick={retryCategories}
                      >
                        Tekrar dene
                      </button>
                    </div>
                  ) : categories.length === 0 ? (
                    <p className='text-body-secondary mb-0'>{emptyText}</p>
                  ) : (
                    <ul className='list-group list-group-flush'>
                      {categories.map((category) => (
                        <li
                          className='list-group-item d-flex flex-wrap align-items-center justify-content-between gap-2'
                          key={category.id}
                        >
                          <span className='text-break'>{category.name}</span>
                          <div className='d-flex gap-2 ms-auto flex-shrink-0'>
                            <button
                              type='button'
                              className='btn btn-outline-primary btn-sm'
                              aria-label={`${category.name} kategorisini düzenle`}
                              onClick={() => setCategoryToUpdate(category)}
                              disabled={categoryToDelete !== null || categoryToUpdate !== null}
                            >
                              <i
                                className='bi bi-pencil-square me-1'
                                aria-hidden='true'
                              ></i>
                              Düzenle
                            </button>
                            <button
                              type='button'
                              className='btn btn-outline-danger btn-sm'
                              aria-label={`${category.name} kategorisini sil`}
                              onClick={() => setCategoryToDelete(category)}
                              disabled={categoryToDelete !== null || categoryToUpdate !== null}
                              aria-busy={deletingId === category.id}
                            >
                              <i
                                className='bi bi-trash3-fill fs-5'
                                aria-hidden='true'
                              ></i>
                              <span className='visually-hidden'>
                                {deletingId === category.id ? "Siliniyor..." : "Sil"}
                              </span>
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <ConfirmModal
        show={categoryToDelete !== null}
        title='Kategoriyi silmek istiyor musunuz?'
        body={`"${categoryToDelete?.name ?? ""}" kategorisi silinecek. Bu işlem geri alınamaz.`}
        confirmText='Evet, sil'
        confirmButtonColor='#dc3545'
        loadingText='Siliniyor...'
        successTitle='Silindi!'
        successText='Kategori başarıyla silindi.'
        errorTitle='Kategori silinemedi'
        errorText='Kategori silinemedi. Lütfen tekrar deneyin.'
        onConfirm={handleDelete}
        onClose={() => setCategoryToDelete(null)}
      />
      {categoryToUpdate && (
        <CategoryUpdateModal
          key={categoryToUpdate.id}
          category={categoryToUpdate}
          onClose={() => setCategoryToUpdate(null)}
          onUpdated={retryCategories}
        />
      )}
    </div>
  );
}
