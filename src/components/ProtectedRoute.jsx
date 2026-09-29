import { Navigate } from "react-router";
import { useAuth } from "../context/useAuth";

export default function ProtectedRoute({ children }) {
  const { isAuth, sessionStatus, retrySession, logout } = useAuth();
  if (isAuth && sessionStatus === "loading") return <p className='container py-5' role='status'>Oturum kontrol ediliyor…</p>;
  if (isAuth && sessionStatus === "error") return <div className='container py-5'>
    <p className='alert alert-danger' role='alert'>Oturum bilgileri alınamadı. Bağlantınızı kontrol edin.</p>
    <button type='button' className='btn btn-primary me-2' onClick={retrySession}>Tekrar dene</button>
    <button type='button' className='btn btn-outline-secondary' onClick={logout}>Çıkış yap</button>
  </div>;
  if (isAuth) {
    return children;
  }
  return <Navigate to='/login' replace />;
}
