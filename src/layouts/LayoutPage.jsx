import { Link, NavLink, Outlet } from "react-router";

export function LayoutPage() {
  let loginData = localStorage.getItem("loginData");
  let userData;
  try {
    userData = JSON.parse(loginData);
  } catch {
    userData = null;
  }

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
          </div>
          {userData?.username ? (
            <>
              {" "}
              <span className='navbar-text'>{userData.username}</span>
              <Link className="text-white" onClick={() => {

                console.log("çıkışa tıklandı")
              }}>Çıkış Yap</Link>
            </>
          ) : (
            <NavLink to={"/login"}>Giriş Yap</NavLink>
          )}
        </div>
      </nav>
      <main>
        <Outlet></Outlet>
      </main>
    </>
  );
}
