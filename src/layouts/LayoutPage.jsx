import { NavLink, Outlet, useNavigate } from "react-router";
import { useAuth } from "../context/useAuth";
import { useAccounting } from "../context/useAccounting";
import { companyRoleLabel } from "../utils/accounting";

function navLinkClassName({ isActive }) {
  return `nav-link rounded px-3 ${
    isActive ? "active bg-white text-primary fw-semibold" : "text-white"
  }`;
}

export function LayoutPage() {
  const { user, logout } = useAuth();

  const {
    companies,
    periods,

    activeCompany,
    activeCompanyId,

    activePeriod,
    activePeriodId,

    companiesStatus,
    periodsStatus,

    setActiveCompanyId,
    setActivePeriodId,
  } = useAccounting();

  const navigate = useNavigate();

  const displayName =
    user?.username || user?.fullName || user?.email || "Kullanıcı";

  function handleLogout() {
    logout();

    navigate("/login", {
      replace: true,
    });
  }

  function handleCompanyChange(event) {
    const companyId = event.target.value;

    setActiveCompanyId(companyId);
  }

  function handlePeriodChange(event) {
    const periodId = event.target.value;

    setActivePeriodId(periodId);
  }

  return (
    <>
      <nav className='navbar navbar-expand-xl bg-primary' data-bs-theme='dark'>
        <div className='container-fluid px-lg-4'>
          <NavLink className='navbar-brand text-white fw-bold' to='/'>
            <i className='bi bi-calculator me-2' aria-hidden='true'></i>
            Finans Muhasebe
          </NavLink>

          <button
            className='navbar-toggler'
            type='button'
            data-bs-toggle='collapse'
            data-bs-target='#navbarMain'
            aria-controls='navbarMain'
            aria-expanded='false'
            aria-label='Menüyü aç veya kapat'
          >
            <span className='navbar-toggler-icon'></span>
          </button>

          <div className='collapse navbar-collapse' id='navbarMain'>
            <ul className='navbar-nav me-auto gap-lg-1'>
              <li className='nav-item'>
                <NavLink className={navLinkClassName} to='/' end>
                  Ana Sayfa
                </NavLink>
              </li>

              <li className='nav-item'>
                <NavLink className={navLinkClassName} to='/transactions'>
                  İşlemler
                </NavLink>
              </li>

              <li className='nav-item'>
                <NavLink className={navLinkClassName} to='/categories'>
                  Kategoriler
                </NavLink>
              </li>

              <li className='nav-item'>
                <NavLink className={navLinkClassName} to='/reports'>
                  Raporlar
                </NavLink>
              </li>

              <li className='nav-item'>
                <NavLink className={navLinkClassName} to='/companies'>
                  Şirketler
                </NavLink>
              </li>

              <li className='nav-item'>
                <NavLink className={navLinkClassName} to='/periods'>
                  Mali Dönemler
                </NavLink>
              </li>
              <li className='nav-item'>
                <NavLink className={navLinkClassName} to='/accounts'>
                  Hesap Planı
                </NavLink>
              </li>

              <li className='nav-item'>
                <NavLink className={navLinkClassName} to='/journal'>
                  Yevmiye
                </NavLink>
              </li>
              <li className='nav-item'>
                <NavLink className={navLinkClassName} to='/counterparties'>
                  Cariler
                </NavLink>
              </li>
              <li className='nav-item'>
                <NavLink className={navLinkClassName} to='/products'>
                  Ürün & Stok
                </NavLink>
              </li>
              <li className='nav-item'>
                <NavLink className={navLinkClassName} to='/inventory'>
                  Stok
                </NavLink>
              </li>
              <li className='nav-item'>
                <NavLink className={navLinkClassName} to='/invoices'>
                  Faturalar
                </NavLink>
              </li>
              <li className='nav-item'>
                <NavLink className={navLinkClassName} to='/treasury'>
                  Kasa / Banka
                </NavLink>
              </li>

              <li className='nav-item'>
                <NavLink className={navLinkClassName} to='/payments'>
                  Tahsilat / Ödeme
                </NavLink>
              </li>
              <li className='nav-item'>
                <NavLink className={navLinkClassName} to='/transfers'>
                  Virman
                </NavLink>
              </li>
              {(activeCompany?.role === 1 || activeCompany?.role === 2) && (
                <li className='nav-item'>
                  <NavLink className={navLinkClassName} to='/administration'>
                    Yönetim
                  </NavLink>
                </li>
              )}
            </ul>

            <div className='d-flex align-items-center gap-3'>
              <span className='navbar-text text-white text-nowrap'>
                <i className='bi bi-person-circle me-2' aria-hidden='true'></i>

                {displayName}
              </span>

              <button
                className='btn btn-outline-light btn-sm text-nowrap'
                type='button'
                onClick={handleLogout}
              >
                <i
                  className='bi bi-box-arrow-right me-1'
                  aria-hidden='true'
                ></i>
                Çıkış
              </button>
            </div>
          </div>
        </div>
      </nav>

      <section className='border-bottom bg-body-tertiary'>
        <div className='container-fluid px-lg-4 py-3'>
          <div className='row g-3 align-items-end'>
            <div className='col-md-5 col-lg-4'>
              <label
                htmlFor='activeCompany'
                className='form-label small fw-semibold mb-1'
              >
                Aktif Şirket
              </label>

              <select
                id='activeCompany'
                className='form-select'
                value={activeCompanyId ?? ""}
                onChange={handleCompanyChange}
                disabled={
                  companiesStatus === "loading" || companies.length === 0
                }
              >
                {companies.length === 0 && (
                  <option value=''>Şirket bulunamadı</option>
                )}

                {companies.map((company) => (
                  <option
                    key={company.id}
                    value={company.id}
                    disabled={!company.isActive}
                  >
                    {company.name}
                    {!company.isActive ? " (Pasif)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className='col-md-5 col-lg-4'>
              <label
                htmlFor='activePeriod'
                className='form-label small fw-semibold mb-1'
              >
                Aktif Mali Dönem
              </label>

              <select
                id='activePeriod'
                className='form-select'
                value={activePeriodId ?? ""}
                onChange={handlePeriodChange}
                disabled={
                  !activeCompanyId ||
                  periodsStatus === "loading" ||
                  periods.length === 0
                }
              >
                {periods.length === 0 && (
                  <option value=''>Mali dönem bulunamadı</option>
                )}

                {periods.map((period) => (
                  <option key={period.id} value={period.id}>
                    {period.name}
                    {period.status === 2 ? " — Kilitli" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className='col-md-2 col-lg-4'>
              {activeCompany && (
                <div className='d-flex flex-wrap gap-2'>
                  <span className='badge text-bg-primary'>
                    {companyRoleLabel(activeCompany.role)}
                  </span>

                  {activePeriod && (
                    <span
                      className={`badge ${
                        activePeriod.status === 1
                          ? "text-bg-success"
                          : "text-bg-secondary"
                      }`}
                    >
                      {activePeriod.status === 1
                        ? "Dönem Açık"
                        : "Dönem Kilitli"}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <main>
        <Outlet />
      </main>
    </>
  );
}
