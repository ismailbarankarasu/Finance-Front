import { createRoot } from "react-dom/client";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import "bootstrap-icons/font/bootstrap-icons.css";

import { App } from "./App";
import { AuthProvider } from "./context/AuthContext";
import { AccountingProvider } from "./context/AccountingContext";

createRoot(document.getElementById("root")).render(
  <AuthProvider>
    <AccountingProvider>
      <App />
    </AccountingProvider>
  </AuthProvider>,
);