export function PageLoading({ text = "Veriler yükleniyor…" }) {
  return (
    <div className='text-center py-5' role='status' aria-live='polite'>
      <div className='spinner-border text-primary' aria-hidden='true' />

      <p className='text-body-secondary mt-3 mb-0'>{text}</p>
    </div>
  );
}

export function PageError({ message = "Bir hata oluştu.", onRetry }) {
  return (
    <div className='alert alert-danger' role='alert'>
      <div className='d-flex align-items-start gap-3'>
        <i className='bi bi-exclamation-triangle-fill fs-5' />

        <div className='flex-grow-1'>
          <strong>İşlem tamamlanamadı</strong>

          <div className='mt-1'>{message}</div>

          {onRetry && (
            <button
              type='button'
              className='btn btn-outline-danger btn-sm mt-3'
              onClick={onRetry}
            >
              <i className='bi bi-arrow-clockwise me-1' />
              Tekrar Dene
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function EmptyState({
  icon = "bi-inbox",
  title = "Kayıt bulunamadı",
  text,
  action,
}) {
  return (
    <div className='text-center py-5 px-3'>
      <div
        className='rounded-circle bg-body-tertiary d-inline-flex align-items-center justify-content-center mb-3'
        style={{
          width: 64,
          height: 64,
        }}
      >
        <i className={`bi ${icon} fs-3 text-body-secondary`} />
      </div>

      <h3 className='h6'>{title}</h3>

      {text && <p className='text-body-secondary mb-3'>{text}</p>}

      {action}
    </div>
  );
}
