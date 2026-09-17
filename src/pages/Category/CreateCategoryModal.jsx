import { useRef, useState } from "react";
import api from "../../api/client";
import { EntryType } from "../../utils";
import "./category-modal.css";

export default function CreateCategoryModal({ onCreated }) {
  const dialogRef = useRef(null);
  const submittingRef = useRef(false);
  const [name, setName] = useState("");
  const [type, setType] = useState(EntryType.Income);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function openModal() {
    setName("");
    setType(EntryType.Income);
    setError("");
    dialogRef.current.showModal();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submittingRef.current) return;
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setError("Kategori adı 2 ile 80 karakter arasında olmalıdır.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);
    setError("");
    try {
      await api.post("/categories", { name: trimmedName, type });
      dialogRef.current.close();
      onCreated();
    } catch (err) {
      const message = err.response?.data?.message;
      setError(typeof message === "string" ? message : "Kategori kaydedilemedi. Lütfen tekrar deneyin.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button type='button' className='btn btn-outline-primary mb-1 mt-3' onClick={openModal}>
        <i className='bi bi-plus-lg me-1' aria-hidden='true'></i>
        Yeni Kategori Ekle
      </button>
      <dialog
        ref={dialogRef}
        className='category-modal rounded shadow'
        aria-labelledby='createCategoryTitle'
        onCancel={(event) => { if (isSubmitting) event.preventDefault(); }}
      >
        <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
          <div className='modal-header border-bottom p-3'>
            <h2 className='modal-title fs-5' id='createCategoryTitle'>Yeni Kategori Ekle</h2>
            <button type='button' className='btn-close' aria-label='Kapat' disabled={isSubmitting} onClick={() => dialogRef.current.close()} />
          </div>
          <div className='modal-body p-3'>
            {error && <div className='alert alert-danger' role='alert'>{error}</div>}
            <div className='mb-3'>
              <label className='form-label' htmlFor='categoryName'>Kategori Adı</label>
              <input
                id='categoryName'
                className='form-control'
                placeholder='Örn. Maaş veya Market'
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                minLength={2}
                maxLength={80}
                disabled={isSubmitting}
              />
            </div>
            <label className='form-label' htmlFor='categoryType'>Kategori Türü</label>
            <select id='categoryType' className='form-select' value={type} onChange={(event) => setType(Number(event.target.value))} disabled={isSubmitting}>
              <option value={EntryType.Income}>Gelir</option>
              <option value={EntryType.Expense}>Gider</option>
            </select>
          </div>
          <div className='modal-footer border-top p-3 gap-2'>
            <button type='button' className='btn btn-secondary' disabled={isSubmitting} onClick={() => dialogRef.current.close()}>Vazgeç</button>
            <button type='submit' className='btn btn-primary' disabled={isSubmitting}>
              <i className='bi bi-check-lg me-1' aria-hidden='true'></i>
              {isSubmitting ? "Kaydediliyor..." : "Kaydet"}
            </button>
          </div>
        </form>
      </dialog>
    </>
  );
}
