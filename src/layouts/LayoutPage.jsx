import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router";

import { useAuth } from "../context/useAuth";
import { useAccounting } from "../context/useAccounting";

import { CompanyRole, companyRoleLabel } from "../utils/accounting";

import "./layout.css";

function NavigationItem({
  to,
  icon,
  children,
  end = false,
  onNavigate,
}) {
  return (
    <NavLink
      to={to}
      end={end}
      onClick={onNavigate}
      className={({ isActive }) =>
        [
          "app-nav-link",
          isActive ? "active" : "",
        ]
          .filter(Boolean)
          .join(" ")
      }
    >
      <i className={`bi ${icon}`} aria-hidden='true' />

      <span>{children}</span>
    </NavLink>
  );
}

function NavigationSection({ title, children }) {
  return (
    <div className='app-nav-section'>
      <div className='app-nav-title'>{title}</div>

      {children}
    </div>
  );
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

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const displayName =
    user?.username || user?.fullName || user?.email || "Kullanıcı";

  const role = activeCompany?.role;

  const canManageAccounting =
    role === CompanyRole.Admin || role === CompanyRole.Accountant;

  const canOpenAdministration = canManageAccounting;

  function closeSidebar() {
    setSidebarOpen(false);
  }

  function handleLogout() {
    logout();

    navigate("/login", {
      replace: true,
    });
  }

  function handleCompanyChange(event) {
    setActiveCompanyId(event.target.value);
  }

  function handlePeriodChange(event) {
    setActivePeriodId(event.target.value);
  }

  return (
    <div className='app-shell'>
      {sidebarOpen && (
        <button
          type='button'
          className='app-sidebar-backdrop border-0'
          aria-label='Menüyü kapat'
          onClick={closeSidebar}
        />
      )}

      <aside className={`app-sidebar ${sidebarOpen ? "app-sidebar-open" : ""}`}>
        <NavLink to='/' className='app-sidebar-brand' onClick={closeSidebar}>
          <span className='app-sidebar-brand-icon'>
            <i className='bi bi-calculator' />
          </span>

          <span>
            <span className='app-sidebar-title'>Finans Muhasebe</span>

            <span className='app-sidebar-subtitle'>Ön Muhasebe Sistemi</span>
          </span>
        </NavLink>

        <nav className='app-sidebar-nav'>
          <NavigationSection title='Genel'>
            <NavigationItem
              to='/'
              icon='bi-grid-1x2-fill'
              end
              onNavigate={closeSidebar}
            >
              Ana Sayfa
            </NavigationItem>
          </NavigationSection>

          <NavigationSection title='Muhasebe'>
            <NavigationItem
              to='/accounts'
              icon='bi-diagram-3'
              onNavigate={closeSidebar}
            >
              Hesap Planı
            </NavigationItem>

            <NavigationItem
              to='/journal'
              icon='bi-journal-text'
              onNavigate={closeSidebar}
            >
              Yevmiye
            </NavigationItem>

            <NavigationItem
              to='/counterparties'
              icon='bi-people'
              onNavigate={closeSidebar}
            >
              Cariler
            </NavigationItem>
          </NavigationSection>

          <NavigationSection title='Satış & Stok'>
            <NavigationItem
              to='/products'
              icon='bi-box-seam'
              onNavigate={closeSidebar}
            >
              Ürünler
            </NavigationItem>

            <NavigationItem
              to='/inventory'
              icon='bi-boxes'
              onNavigate={closeSidebar}
            >
              Stok
            </NavigationItem>

            <NavigationItem
              to='/invoices'
              icon='bi-receipt'
              onNavigate={closeSidebar}
            >
              Faturalar
            </NavigationItem>
          </NavigationSection>

          <NavigationSection title='Finans'>
            <NavigationItem
              to='/treasury'
              icon='bi-bank'
              onNavigate={closeSidebar}
            >
              Kasa / Banka
            </NavigationItem>

            <NavigationItem
              to='/payments'
              icon='bi-cash-stack'
              onNavigate={closeSidebar}
            >
              Tahsilat / Ödeme
            </NavigationItem>

            <NavigationItem
              to='/transfers'
              icon='bi-arrow-left-right'
              onNavigate={closeSidebar}
            >
              Virman
            </NavigationItem>
          </NavigationSection>

          <NavigationSection title='Raporlama'>
            <NavigationItem
              to='/reports'
              icon='bi-bar-chart-line'
              onNavigate={closeSidebar}
            >
              Mali Raporlar
            </NavigationItem>

            {canManageAccounting && (
              <NavigationItem
                to='/closing'
                icon='bi-calendar-check'
                onNavigate={closeSidebar}
              >
                Dönem Kapanışı
              </NavigationItem>
            )}
          </NavigationSection>

          <NavigationSection title='Yönetim'>
            <NavigationItem
              to='/companies'
              icon='bi-buildings'
              onNavigate={closeSidebar}
            >
              Şirketler
            </NavigationItem>

            <NavigationItem
              to='/periods'
              icon='bi-calendar3'
              onNavigate={closeSidebar}
            >
              Mali Dönemler
            </NavigationItem>

            {canOpenAdministration && (
              <NavigationItem
                to='/administration'
                icon='bi-shield-lock'
                onNavigate={closeSidebar}
              >
                Yönetim Merkezi
              </NavigationItem>
            )}
          </NavigationSection>

        </nav>

        <div className='app-sidebar-footer'>
          <div className='app-sidebar-user'>
            <div className='app-sidebar-avatar'>
              <i className='bi bi-person-fill' />
            </div>

            <div className='flex-grow-1 overflow-hidden'>
              <div className='app-sidebar-user-name'>{displayName}</div>

              <div className='app-sidebar-user-role'>
                {activeCompany
                  ? companyRoleLabel(activeCompany.role)
                  : "Kullanıcı"}
              </div>
            </div>

            <button
              type='button'
              className='btn btn-sm btn-outline-light'
              title='Çıkış yap'
              aria-label='Çıkış yap'
              onClick={handleLogout}
            >
              <i className='bi bi-box-arrow-right' />
            </button>
          </div>
        </div>
      </aside>

      <div className='app-content-wrapper'>
        <header className='app-topbar'>
          <div className='app-topbar-inner'>
            <button
              type='button'
              className='btn btn-outline-secondary app-mobile-menu-button'
              aria-label='Menüyü aç'
              onClick={() => setSidebarOpen(true)}
            >
              <i className='bi bi-list' />
            </button>

            <div className='app-context-select app-context-select-company'>
              <label htmlFor='activeCompany' className='app-context-label'>
                Aktif Şirket
              </label>

              <select
                id='activeCompany'
                className='form-select form-select-sm'
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
                    {!company.isActive ? " — Pasif" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className='app-context-select'>
              <label htmlFor='activePeriod' className='app-context-label'>
                Aktif Mali Dönem
              </label>

              <select
                id='activePeriod'
                className='form-select form-select-sm'
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

            <div className='app-topbar-status'>
              {activeCompany && (
                <span className='badge text-bg-primary'>
                  {companyRoleLabel(activeCompany.role)}
                </span>
              )}

              {activePeriod && (
                <span
                  className={`badge ${
                    activePeriod.status === 1
                      ? "text-bg-success"
                      : "text-bg-secondary"
                  }`}
                >
                  <i
                    className={`bi ${
                      activePeriod.status === 1 ? "bi-unlock" : "bi-lock"
                    } me-1`}
                  />

                  {activePeriod.status === 1 ? "Dönem Açık" : "Dönem Kilitli"}
                </span>
              )}
            </div>
          </div>
        </header>

        <main className='app-content'>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
