//import { useState } from "react";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { LayoutPage } from "./layouts/LayoutPage";
import { HomePage } from "./pages/HomePage";
import { createBrowserRouter, RouterProvider } from "react-router";
import ProtectedRoute from "./components/ProtectedRoute";
const routes = createBrowserRouter([
  {
    element: (
      <ProtectedRoute>
        <LayoutPage></LayoutPage>
      </ProtectedRoute>
    ),
    children: [{ path: "/", Component: HomePage }],
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
