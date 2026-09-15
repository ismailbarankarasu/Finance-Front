import { Navigate } from "react-router";

export default function ProtectedRoute(children) {
  const isAuth = localStorage.getItem("isAuth");
  if (isAuth === "true") {
    return children;
  }
  return <Navigate to={"/login"}></Navigate>;
}
