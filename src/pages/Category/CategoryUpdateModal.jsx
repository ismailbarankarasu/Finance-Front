import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import api from "../../api/client";
import { EntryType } from "../../utils";
import "./category-modal.css";

export function CategoryUpdateModal({ category, onClose, onUpdated }) {
  const dialogRef = useRef(null);
  const nameRef = useRef(null);
  const submittingRef = useRef(false);
  const [name, setName] = useState(category.name);
  const [type, setType] = useState(category.type);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog.showModal();
    nameRef.current.focus();
    return () => dialog.close();
  }, []);

  function handleClose() {
    if (submittingRef.current) return;
    dialogRef.current.close();
    onClose();
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
      await api.put(`/categories/${category.id}`, { name: trimmedName, type });
    } catch (err) {
      const message = err.response?.data?.message;
      setError(
        typeof message === "string" && message.trim()
          ? message
          : err.response?.status === 404
            ? "Kategori bulunamadı. Listeyi yenileyip tekrar deneyin."
            : "Kategori güncellenemedi. Lütfen tekrar deneyin.",
      );
      submittingRef.current = false;
      setIsSubmitting(false);
      return;
    }

    // Close the native dialog before displaying SweetAlert2.
    dialogRef.current.close();
    onClose();
    await onUpdated();
    await Swal.fire({
      titleText: "Güncellendi!",
      text: "Kategori başarıyla güncellendi.",
      icon: "success",
      confirmButtonText: "Tamam",
      confirmButtonColor: "#0d6efd",
    });
  }

  return (
    <dialog
      ref={dialogRef}
      className='category-modal rounded shadow'
      aria-labelledby='updateCategoryTitle'
      onCancel={(event) => {
        event.preventDefault();
        handleClose();
      }}
    >
      <form onSubmit={handleSubmit} aria-busy={isSubmitting}>
        <div className='modal-header border-bottom p-3'>
          <h2 className='modal-title fs-5' id='updateCategoryTitle'>Kategori Güncelle</h2>
          <button
            type='button'
            className='btn-close'
            aria-label='Kapat'
            disabled={isSubmitting}
            onClick={handleClose}
          />
        </div>
        <div className='modal-body p-3'>
          {error && <div className='alert alert-danger' role='alert'>{error}</div>}
          <div className='mb-3'>
            <label className='form-label' htmlFor='updateCategoryName'>Kategori Adı</label>
            <input
              ref={nameRef}
              id='updateCategoryName'
              className='form-control'
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              minLength={2}
              maxLength={80}
              disabled={isSubmitting}
            />
          </div>
          <label className='form-label' htmlFor='updateCategoryType'>Kategori Türü</label>
          <select
            id='updateCategoryType'
            className='form-select'
            value={type}
            onChange={(event) => setType(Number(event.target.value))}
            disabled={isSubmitting}
          >
            <option value={EntryType.Income}>Gelir</option>
            <option value={EntryType.Expense}>Gider</option>
          </select>
        </div>
        <div className='modal-footer border-top p-3 gap-2'>
          <button type='button' className='btn btn-secondary' disabled={isSubmitting} onClick={handleClose}>
            Vazgeç
          </button>
          <button type='submit' className='btn btn-primary' disabled={isSubmitting}>
            <i className='bi bi-check-lg me-1' aria-hidden='true'></i>
            {isSubmitting ? "Güncelleniyor..." : "Güncelle"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
