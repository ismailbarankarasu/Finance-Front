import { useEffect, useState } from "react";
import { AuthContext } from "./useAuth";
import api from "../api/client";

function normalizeToken(value) {
  if (typeof value !== "string") return null;
  const token = value.trim();
  return token && !["undefined", "null"].includes(token) ? token : null;
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() =>
    normalizeToken(localStorage.getItem("token")),
  );
  const [user, setUser] = useState(() => {
    if (!token) return null;
    try {
      return JSON.parse(localStorage.getItem("user")) ?? null;
    } catch {
      return null;
    }
  });
  const isAuth = Boolean(token);
  const [sessionStatus, setSessionStatus] = useState(() => token ? "loading" : "idle");
  const [sessionRetry, setSessionRetry] = useState(0);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    async function loadUser() {
      try {
        const { data } = await api.get("/auth/me", { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (!data || typeof data.fullName !== "string" || typeof data.email !== "string") throw new Error("Invalid user response");
        localStorage.setItem("user", JSON.stringify(data));
        setUser(data);
        setSessionStatus("success");
      } catch {
        if (!controller.signal.aborted) setSessionStatus("error");
      }
    }
    loadUser();
    return () => controller.abort();
  }, [token, sessionRetry]);

  function retrySession() {
    setSessionStatus("loading");
    setSessionRetry((previous) => previous + 1);
  }

  function login(data) {
    const nextToken = normalizeToken(data?.token);
    if (!nextToken) throw new Error("Login response must contain a token");
    const nextUser = data.user ?? null;
    localStorage.setItem("token", nextToken);
    localStorage.setItem("user", JSON.stringify(nextUser));
    localStorage.removeItem("isAuth");
    setToken(nextToken);
    setUser(nextUser);
    setSessionStatus("success");
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("isAuth");
    setToken(null);
    setUser(null);
    setSessionStatus("idle");
  }

  return (
    <AuthContext.Provider value={{ isAuth, token, user, login, logout, sessionStatus, retrySession }}>
      {children}
    </AuthContext.Provider>
  );
}
