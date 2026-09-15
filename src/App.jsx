import { useState } from "react";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { LayoutPage } from "./layouts/LayoutPage";
import { HomePage } from "./pages/HomePage";
export function App() {
  const [activePage, setActivePage] = useState("register");
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
    return <RegisterPage changeActivePage={setActivePage} changeUsername={setUsername}></RegisterPage>;
  }
  return (
    <LayoutPage username={username}>
      <HomePage></HomePage>
    </LayoutPage>
  );
}
