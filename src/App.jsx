import { lazy, Suspense } from "react";
import { LoginPage } from "./pages/Auth/LoginPage";
import { RegisterPage } from "./pages/Auth/RegisterPage";
import { LayoutPage } from "./layouts/LayoutPage";
import { HomePage } from "./pages/Home/HomePage";
import { createBrowserRouter, RouterProvider } from "react-router";
import ProtectedRoute from "./components/ProtectedRoute";
import CompaniesPage from "./pages/Companies/CompaniesPage";
import PeriodsPage from "./pages/Periods/PeriodsPage";
import AccountsPage from "./pages/Accounts/AccountsPage";
import JournalPage from "./pages/Journal/JournalPage";
import CounterpartiesPage from "./pages/Counterparties/CounterpartiesPage";
import ProductsPage from "./pages/Products/ProductsPage";
import InventoryPage from "./pages/Inventory/InventoryPage";
import InvoicesPage from "./pages/Invoices/InvoicesPage";
import TreasuryPage from "./pages/Treasury/TreasuryPage";
import PaymentsPage from "./pages/Payments/PaymentsPage";
import TransfersPage from "./pages/Transfers/TransfersPage";
import AdministrationPage from "./pages/Administration/AdministrationPage";
import ClosingPage from "./pages/Closing/ClosingPage";

const ReportsPage = lazy(() => import("./pages/Reports/ReportsPage"));

const routes = createBrowserRouter([
  {
    element: (
      <ProtectedRoute>
        <LayoutPage></LayoutPage>
      </ProtectedRoute>
    ),
    children: [
      { path: "/", Component: HomePage },
      { path: "/companies", Component: CompaniesPage },
      { path: "/periods", Component: PeriodsPage },
      { path: "/accounts", Component: AccountsPage },
      { path: "/journal", Component: JournalPage },
      { path: "/counterparties", Component: CounterpartiesPage },
      { path: "/products", Component: ProductsPage },
      { path: "/inventory", Component: InventoryPage },
      { path: "/invoices", Component: InvoicesPage },
      { path: "/treasury", Component: TreasuryPage },
      { path: "/payments", Component: PaymentsPage },
      { path: "/transfers", Component: TransfersPage },
      { path: "/administration", Component: AdministrationPage },
      { path: "/closing", Component: ClosingPage },
      {
        path: "/reports",
        element: (
          <Suspense
            fallback={
              <p className='container py-5' role='status'>
                Raporlar hazırlanıyor…
              </p>
            }
          >
            <ReportsPage />
          </Suspense>
        ),
      },
      {
        path: "*",
        element: (
          <div className='container-fluid px-lg-4 py-5'>
            <div
              className='card border-0 shadow-sm mx-auto'
              style={{ maxWidth: 560 }}
            >
              <div className='card-body text-center py-5'>
                <div
                  className='rounded-circle bg-primary-subtle text-primary d-inline-flex align-items-center justify-content-center mb-4'
                  style={{
                    width: 72,
                    height: 72,
                  }}
                >
                  <i className='bi bi-compass fs-2' />
                </div>

                <h1 className='h4'>Sayfa bulunamadı</h1>

                <p className='text-body-secondary'>
                  Aradığınız sayfa kaldırılmış, taşınmış veya mevcut
                  olmayabilir.
                </p>

                <a href='/' className='btn btn-primary'>
                  <i className='bi bi-house me-2' />
                  Dashboard'a Dön
                </a>
              </div>
            </div>
          </div>
        ),
      },
    ],
  },
  { path: "/register", Component: RegisterPage },
  { path: "/login", Component: LoginPage },
]);
export function App() {
  return <RouterProvider router={routes} />;
}
