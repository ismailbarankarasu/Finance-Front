import { Navigate } from "react-router";
import { useAuth } from "../context/useAuth";

export default function ProtectedRoute({ children }) {
  const { isAuth } = useAuth();
  if (isAuth) {
    return children;
  }
  return <Navigate to='/login' replace />;
}
