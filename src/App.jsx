import { lazy, Suspense } from "react";
import { LoginPage } from "./pages/Auth/LoginPage";
import { RegisterPage } from "./pages/Auth/RegisterPage";
import { LayoutPage } from "./layouts/LayoutPage";
import { HomePage } from "./pages/Home/HomePage";
import { createBrowserRouter, RouterProvider } from "react-router";
import ProtectedRoute from "./components/ProtectedRoute";
import CategoryPage from "./pages/Category/CategoryPage";
import { TransactionPage } from "./pages/Transaction/TransactionPage";
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
      { path: "/categories", Component: CategoryPage },
      { path: "/transactions", Component: TransactionPage },
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
          <div className='container py-5'>
            <h1 className='h4'>Sayfa bulunamadı</h1>
            <p>Üst menüden bir sayfa seçebilirsiniz.</p>
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
