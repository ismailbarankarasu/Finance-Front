//import { useState } from "react";
import { LoginPage } from "./pages/Auth/LoginPage";
import { RegisterPage } from "./pages/Auth/RegisterPage";
import { LayoutPage } from "./layouts/LayoutPage";
import { HomePage } from "./pages/Home/HomePage";
import { createBrowserRouter, RouterProvider } from "react-router";
import ProtectedRoute from "./components/ProtectedRoute";
import CategoryPage from "./pages/Category/CategoryPage";
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
    ],
  },
  { path: "/register", Component: RegisterPage },
  { path: "/login", Component: LoginPage },
]);
export function App() {
  /*   const [activePage, setActivePage] = useState("register");
  const [username, setUsername] = useState("");

  if (activePage === "login") {
    return (
      <LoginPage
        changeUsername={setUsername}
        changeActivePage={setActivePage}
      ></LoginPage>
    );
  }

  if (activePage === "register") {
    return (
      <RegisterPage
        changeActivePage={setActivePage}
        changeUsername={setUsername}
      ></RegisterPage>
    );
  } */
  return (
    <RouterProvider router={routes}>
      <LayoutPage username={"ismail"}></LayoutPage>
    </RouterProvider>
  );
}
