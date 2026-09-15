import { useState } from "react";
import { AuthContext } from "./useAuth";

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

  function login(data) {
    const nextToken = normalizeToken(data?.token);
    if (!nextToken) throw new Error("Login response must contain a token");
    const nextUser = data.user ?? null;
    localStorage.setItem("token", nextToken);
    localStorage.setItem("user", JSON.stringify(nextUser));
    localStorage.removeItem("isAuth");
    setToken(nextToken);
    setUser(nextUser);
  }

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("isAuth");
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ isAuth, token, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
