import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import api from "../../api/client";
import { EntryType } from "../../utils";
import { localDateValue } from "../../utils/finance";
import "../Category/category-modal.css";

export function TransactionUpdateModal({ transaction, onClose, onUpdated }) {
  const dialogRef = useRef(null);
  const submittingRef = useRef(false);
  const [formModel, setFormModel] = useState({
    type: transaction.type ?? EntryType.Income,
    categoryId: transaction.categoryId ?? transaction.category?.id ?? 0,
    date: localDateValue(transaction.date),
    amount: transaction.amount ?? 0,
    description: transaction.description ?? "",
  });
  const [categories, setCategories] = useState([]);
  const [categoryStatus, setCategoryStatus] = useState("loading");
  const [categoryRetry, setCategoryRetry] = useState(0);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const availableCategories = categories.filter((category) => category.type === formModel.type);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    return () => dialog.close();
  }, []);

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

  function updateFormModel(field, value) {
    setFormModel((previous) => ({ ...previous, [field]: value }));
  }

  function handleClose() {
    if (submittingRef.current) return;
    dialogRef.current.close();
    onClose();
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
      await api.put(`/transactions/${transaction.id}`, {
        categoryId: Number(categoryId),
        type,
        amount: numericAmount,
        date: date === localDateValue(transaction.date) ? transaction.date : new Date(`${date}T00:00:00`).toISOString(),
        description: description.trim() || null,
      });
    } catch (err) {
      const message = err.response?.data?.message;
      setError(
        typeof message === "string" && message.trim()
          ? message
          : err.response?.status === 404
            ? "İşlem bulunamadı. Listeyi yenileyip tekrar deneyin."
            : "İşlem güncellenemedi. Lütfen tekrar deneyin.",
      );
      submittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    dialogRef.current.close();
    onClose();
    await onUpdated();
    await Swal.fire({
      titleText: "Güncellendi!",
      text: "İşlem başarıyla güncellendi.",
      icon: "success",
      confirmButtonText: "Tamam",
      confirmButtonColor: "#0d6efd",
    });
  }

  return (
    <dialog
      ref={dialogRef}
      className='category-modal rounded shadow'
      aria-labelledby='updateTransactionTitle'
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
    >
      <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
        <div className='modal-header border-bottom p-3'>
          <h2 className='modal-title fs-5' id='updateTransactionTitle'>İşlem Güncelle</h2>
          <button type='button' className='btn-close' aria-label='Kapat' disabled={isSubmitting} onClick={handleClose} />
        </div>
        <div className='modal-body p-3'>
          {error && <div className='alert alert-danger' role='alert'>{error}</div>}
          <div className='mb-3'>
            <label className='form-label' htmlFor='updateTransactionType'>İşlem Türü</label>
            <select id='updateTransactionType' className='form-select' value={formModel.type} disabled={isSubmitting}
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
            <label className='form-label' htmlFor='updateTransactionCategory'>Kategori</label>
            <select id='updateTransactionCategory' className='form-select' value={formModel.categoryId || ""} required
              disabled={isSubmitting || categoryStatus !== "success" || availableCategories.length === 0}
              onChange={(event) => updateFormModel("categoryId", Number(event.target.value))}>
              <option value=''>Kategori seçin</option>
              {availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
            </select>
            {categoryStatus === "loading" && <p className='form-text' role='status'>Kategoriler yükleniyor...</p>}
            {categoryStatus === "error" && <div className='text-danger mt-2' role='alert'>
              Kategoriler yüklenemedi.
              <button type='button' className='btn btn-link btn-sm' onClick={() => {
                setCategoryStatus("loading");
                setCategoryRetry((previous) => previous + 1);
              }}>Tekrar dene</button>
            </div>}
            {categoryStatus === "success" && availableCategories.length === 0 && <p className='form-text'>Bu işlem türü için önce Kategoriler sayfasından kategori ekleyin.</p>}
          </div>
          <div className='mb-3'>
            <label className='form-label' htmlFor='updateTransactionAmount'>Tutar</label>
            <input id='updateTransactionAmount' className='form-control' type='number' min='0.01' max='100000000' step='0.01'
              value={formModel.amount} onChange={(event) => updateFormModel("amount", event.target.value)} required disabled={isSubmitting} />
          </div>
          <div className='mb-3'>
            <label className='form-label' htmlFor='updateTransactionDate'>Tarih</label>
            <input id='updateTransactionDate' className='form-control' type='date' value={formModel.date}
              onChange={(event) => updateFormModel("date", event.target.value)} required disabled={isSubmitting} />
          </div>
          <div>
            <label className='form-label' htmlFor='updateTransactionDescription'>Açıklama (isteğe bağlı)</label>
            <textarea id='updateTransactionDescription' className='form-control' rows={3} maxLength={250}
              value={formModel.description} onChange={(event) => updateFormModel("description", event.target.value)} disabled={isSubmitting} />
          </div>
        </div>
        <div className='modal-footer border-top p-3 gap-2'>
          <button type='button' className='btn btn-secondary' disabled={isSubmitting} onClick={handleClose}>Vazgeç</button>
          <button type='submit' className='btn btn-primary' disabled={isSubmitting || categoryStatus !== "success" || availableCategories.length === 0}>
            <i className='bi bi-check-lg me-1' aria-hidden='true'></i>
            {isSubmitting ? "Güncelleniyor..." : "Güncelle"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
