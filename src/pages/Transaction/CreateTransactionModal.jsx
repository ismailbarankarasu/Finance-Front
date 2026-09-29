import { useEffect, useRef, useState } from "react";
import api from "../../api/client";
import { EntryType } from "../../utils";
import "../Category/category-modal.css";

export default function CreateTransactionModal({
  onLoad,
  disabled = false,
  buttonClassName = "btn btn-outline-primary mb-1 mt-3",
}) {
  const [formModel, setFormModel] = useState({
    name: "",
    type: EntryType.Income,
    categoryId: 0,
    date: "",
    amount: 0,
    description: "",
  });
  const dialogRef = useRef(null);
  const submittingRef = useRef(false);
  const loadController = useRef(null);
  const [categories, setCategories] = useState([]);
  const [categoryStatus, setCategoryStatus] = useState("loading");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const availableCategories = categories.filter((category) => category.type === formModel.type);

  function updateFormModel(field, value) {
    setFormModel((previous) => ({ ...previous, [field]: value }));
  }

  useEffect(() => () => loadController.current?.abort(), []);

  async function loadCategories() {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    setCategoryStatus("loading");
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

  function openModal() {
    setFormModel({
      name: "",
      type: EntryType.Income,
      categoryId: 0,
      date: "",
      amount: 0,
      description: "",
    });
    setError("");
    dialogRef.current.showModal();
    loadCategories();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) return;
    const { categoryId, type, amount, date, description } = formModel;
    if (categoryStatus !== "success" || !availableCategories.some((category) => Number(category.id) === Number(categoryId))) {
      setError("Lütfen işlem türüne uygun bir kategori seçin.");
      return;
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 0.01 || numericAmount > 100000000) {
      setError("Tutar 0,01 ile 100.000.000 arasında olmalıdır.");
      return;
    }
    if (!date || !Number.isFinite(Date.parse(date)) || description.trim().length > 250) {
      setError("Geçerli bir tarih girin. Açıklama en fazla 250 karakter olabilir.");
      return;
    }
    submittingRef.current = true;
    setIsSubmitting(true);
    setError("");
    try {
      await api.post("/transactions", {
        categoryId: Number(categoryId), type, amount: numericAmount,
        date: new Date(`${date}T00:00:00`).toISOString(), description: description.trim() || null,
      });
    } catch (err) {
      const message = err.response?.data?.message;
      setError(typeof message === "string" ? message : "İşlem kaydedilemedi. Lütfen tekrar deneyin.");
      return;
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
    dialogRef.current.close();
    onLoad?.();
  }

  return (
    <>
      <button type='button' className={buttonClassName} onClick={openModal} disabled={disabled}>
        <i className='bi bi-plus-lg me-1' aria-hidden='true'></i>
        Yeni İşlem Ekle
      </button>
      <dialog ref={dialogRef} className='category-modal rounded shadow' aria-labelledby='createTransactionTitle'
        onCancel={(event) => { if (isSubmitting) event.preventDefault(); }}>
        <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
          <div className='modal-header border-bottom p-3'>
            <h2 className='modal-title fs-5' id='createTransactionTitle'>Yeni İşlem Ekle</h2>
            <button type='button' className='btn-close' aria-label='Kapat' disabled={isSubmitting} onClick={() => dialogRef.current.close()} />
          </div>
          <div className='modal-body p-3'>
            {error && <div className='alert alert-danger' role='alert'>{error}</div>}
            <div className='mb-3'>
              <label className='form-label' htmlFor='transactionType'>İşlem Türü</label>
              <select id='transactionType' className='form-select' value={formModel.type} disabled={isSubmitting}
                onChange={(event) => {
                  const type = Number(event.target.value);
                  setFormModel((previous) => ({ ...previous, type, categoryId: 0 }));
                  setError("");
                }}>
                <option value={EntryType.Income}>Gelir</option>
                <option value={EntryType.Expense}>Gider</option>
              </select>
            </div>
            <div className='mb-3'>
              <label className='form-label' htmlFor='transactionCategory'>Kategori</label>
              <select id='transactionCategory' className='form-select' value={formModel.categoryId || ""} required
                disabled={isSubmitting || categoryStatus !== "success" || availableCategories.length === 0}
                onChange={(event) => updateFormModel("categoryId", Number(event.target.value))}>
                <option value=''>Kategori seçin</option>
                {availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              {categoryStatus === "loading" && <p className='form-text' role='status'>Kategoriler yükleniyor...</p>}
              {categoryStatus === "error" && <div className='text-danger mt-2' role='alert'>
                Kategoriler yüklenemedi.
                <button type='button' className='btn btn-link btn-sm' onClick={loadCategories}>Tekrar dene</button>
              </div>}
              {categoryStatus === "success" && availableCategories.length === 0 && <p className='form-text'>Bu işlem türü için önce Kategoriler sayfasından kategori ekleyin.</p>}
            </div>
            <div className='mb-3'>
              <label className='form-label' htmlFor='transactionAmount'>Tutar</label>
              <input id='transactionAmount' className='form-control' type='number' min='0.01' max='100000000' step='0.01'
                value={formModel.amount} onChange={(event) => updateFormModel("amount", event.target.value)} required disabled={isSubmitting} />
            </div>
            <div className='mb-3'>
              <label className='form-label' htmlFor='transactionDate'>Tarih</label>
              <input id='transactionDate' className='form-control' type='date' value={formModel.date}
                onChange={(event) => updateFormModel("date", event.target.value)} required disabled={isSubmitting} />
            </div>
            <div>
              <label className='form-label' htmlFor='transactionDescription'>Açıklama (isteğe bağlı)</label>
              <textarea id='transactionDescription' className='form-control' rows={3} maxLength={250}
                value={formModel.description} onChange={(event) => updateFormModel("description", event.target.value)} disabled={isSubmitting} />
            </div>
          </div>
          <div className='modal-footer border-top p-3 gap-2'>
            <button type='button' className='btn btn-secondary' disabled={isSubmitting} onClick={() => dialogRef.current.close()}>Vazgeç</button>
            <button type='submit' className='btn btn-primary' disabled={isSubmitting || categoryStatus !== "success" || availableCategories.length === 0}>
              <i className='bi bi-check-lg me-1' aria-hidden='true'></i>
              {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
