import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router";
import api from "../../api/client";
import { useAuth } from "../../context/useAuth";

export function LoginPage() {
  const { isAuth, login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginData, setLoginData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    if (!error) return;
    const timeout = setTimeout(() => setError(""), 3000);
    return () => clearTimeout(timeout);
  }, [error]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);
    try {
      const { data } = await api.post("/auth/login", { ...loginData, email: loginData.email.trim() });
      login(data);
      navigate("/", { replace: true });
    } catch {
      setError("Giriş yapılamadı. E-posta, şifre ve bağlantınızı kontrol edin.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isAuth) return <Navigate to='/' replace />;

  return (
    <>
      <div className='mt-5'>
        <form className='w-75 mx-auto mt-5 shadow p-5' onSubmit={handleSubmit}>
          <h5 className='text-center'>
            <i className='bi bi-box-arrow-in-right pe-3 fs-3'></i>
            Finans Takip · Giriş yap
          </h5>
          <div className='form-floating mb-3'>
            <input
              name='email'
              autoComplete='username'
              required
              onChange={(e) => {
                setLoginData((prevState) => ({
                  ...prevState,
                  email: e.target.value,
                }));
              }}
              value={loginData.email}
              type='email'
              className='form-control'
              id='floatingInput'
              placeholder='Email'
            />
            <label htmlFor='floatingInput'>E-posta</label>
          </div>
          <div className='form-floating'>
            <input
              onChange={(e) => {
                setLoginData((prevState) => ({
                  ...prevState,
                  password: e.target.value,
                }));
              }}
              type='password'
              name='password'
              autoComplete='current-password'
              required
              value={loginData.password}
              className='form-control'
              id='floatingPassword'
              placeholder='Password'
            />
            <label htmlFor='floatingPassword'>Şifre</label>
          </div>

          {error && <div className='alert alert-danger mt-3' role='alert'>{error}</div>}
          <div className='mt-3'>
            <button
              type='submit'
              disabled={isSubmitting}
              className='btn btn-outline-primary w-100'
            >
              {isSubmitting ? "Giriş yapılıyor..." : "Giriş yap"}
            </button>
          </div>
          <p className='mt-3 mb-0 text-center'>Hesabın yok mu? <Link to='/register'>Kayıt ol</Link></p>
        </form>
      </div>
    </>
  );
}
