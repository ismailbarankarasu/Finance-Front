import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../context/useAuth";

export function LayoutPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.username || user?.fullName || user?.email || "Kullanıcı";

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <>
      <nav className='navbar navbar-expand-lg bg-primary' data-bs-theme='dark'>
        <div className='container'>
          <NavLink className='navbar-brand text-white fw-bold' to='/'>
            Finans Takip Sistemi
          </NavLink>

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
            <ul className='navbar-nav ms-auto gap-lg-2'>
              <li className='nav-item'>
                <NavLink className='nav-link text-white' to='/'>
                  Ana Sayfa
                </NavLink>
              </li>

              <li className='nav-item'>
                <a className='nav-link text-white' href='#islemler'>
                  İşlemler
                </a>
              </li>
            </ul>
          </div>
          {user ? (
            <div className='d-flex align-items-center gap-3 ms-lg-4'>
              <span className='navbar-text text-white' title={displayName}>
                <i className='bi bi-person-circle me-2' aria-hidden='true'></i>
                {displayName}
              </span>
              <button
                className='btn btn-outline-light btn-sm'
                type='button'
                onClick={handleLogout}
              >
                <i className='bi bi-box-arrow-right me-1' aria-hidden='true'></i>
                Çıkış Yap
              </button>
            </div>
          ) : (
            <NavLink className='btn btn-outline-light btn-sm ms-lg-4' to='/login'>
              Giriş Yap
            </NavLink>
          )}
        </div>
      </nav>
      <main>
        <Outlet></Outlet>
      </main>
    </>
  );
}
