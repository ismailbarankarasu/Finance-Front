export function LayoutPage({ children,username }) {
  return (
    <>
      <nav className='navbar navbar-expand-lg bg-primary' data-bs-theme='dark'>
        <div className='container'>
          <a className='navbar-brand text-white fw-bold' href='#'>
            Finans Takip Sistemi
          </a>

          <button
            className='navbar-toggler'
            type='button'
            data-bs-toggle='collapse'
            data-bs-target='#navbarNav'
            aria-controls='navbarNav'
            aria-expanded='false'
            aria-label='Menüyü aç veya kapat'
          >
            <span className='navbar-toggler-icon'></span>
          </button>

          <div className='collapse navbar-collapse' id='navbarNav'>
            <ul className='navbar-nav ms-auto'>
              <li className='nav-item'>
                <a
                  className='nav-link active text-white'
                  aria-current='page'
                  href='#'
                >
                  Ana Sayfa
                </a>
              </li>

              <li className='nav-item'>
                <a className='nav-link text-white' href='#'>
                  İşlemler
                </a>
              </li>
            </ul>
            <span class='navbar-text'>{username}</span>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </>
  );
}
