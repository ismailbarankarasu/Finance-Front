export function PageHeader({ title, subTitle, className, header }) {
  return (
    <div className={className}>
      <div className='card'>
        {header && <div className='card-header'>{header}</div>}
        <div className='card-body'>
          <h1 className='card-title h5'>{title}</h1>
          <p className='card-text'>{subTitle}</p>
        </div>
      </div>
    </div>
  );
}
