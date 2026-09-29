import { lazy, Suspense } from "react";
import { LoginPage } from "./pages/Auth/LoginPage";
import { RegisterPage } from "./pages/Auth/RegisterPage";
import { LayoutPage } from "./layouts/LayoutPage";
import { HomePage } from "./pages/Home/HomePage";
import { createBrowserRouter, RouterProvider } from "react-router";
import ProtectedRoute from "./components/ProtectedRoute";
import CategoryPage from "./pages/Category/CategoryPage";
import { TransactionPage } from "./pages/Transaction/TransactionPage";
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
