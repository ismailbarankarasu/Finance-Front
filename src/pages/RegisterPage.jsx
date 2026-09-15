import { useState } from "react";
import { useNavigate } from "react-router";
import api from "../api/client";

export function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registerData, setRegisterData] = useState({
    fullName: "",
    email: "",
    password: ""
  });
  async function handleSubmit(event) {
    event.preventDefault();
    if (isSubmitting) return;

    setError("");
    setIsSubmitting(true);
    try {
      await api.post("/auth/register", registerData);
      navigate("/login", { replace: true });
    } catch (err) {
      const message = err.response?.data?.message;
      setError(
        typeof message === "string" && message.trim()
          ? message
          : "Kayıt oluşturulamadı. Bilgilerinizi ve bağlantınızı kontrol edin.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className='mt-5'>
        <form className='w-75 mx-auto mt-5 shadow p-5' onSubmit={handleSubmit}>
          <h5 className='text-center'>
            <i className='bi bi-box-arrow-in-right pe-3 fs-3'></i>
            Register Finans Takip
          </h5>

        <div className='form-floating mb-3'>
            <input
              name='fullName'
              autoComplete='name'
              required
              onChange={(e) => {
                setRegisterData(prevState =>({
                  ...prevState,
                  fullName: e.target.value }));
              }}
              value={registerData.fullName}
              type='text'
              className='form-control'
              id='registerFullName'
              placeholder='fullName'
            />
            <label htmlFor='registerFullName'>FullName</label>
          </div>
          
        <div className='form-floating mb-3'>
            <input
              name='email'
              autoComplete='email'
              required
              onChange={(e) => {
                setRegisterData(prevState =>({
                  ...prevState,
                  email: e.target.value }));
              }}
              value={registerData.email}
              type='email'
              className='form-control'
              id='registerEmail'
              placeholder='email'
            />
            <label htmlFor='registerEmail'>email</label>
          </div>

          <div className='form-floating'>
            <input
              onChange={(e) => {
                setRegisterData((prevState) => ({
                  ...prevState,
                  password: e.target.value,
                }));
              }}
              type='password'
              name='password'
              autoComplete='new-password'
              required
              value={registerData.password}
              className='form-control'
              id='floatingPassword'
              placeholder='Password'
            />
            <label htmlFor='floatingPassword'>Password</label>
          </div>

          {error && <div className='alert alert-danger mt-3' role='alert'>{error}</div>}
          <div className='mt-3'>
            <button
              type='submit'
              disabled={isSubmitting}
              className='btn btn-outline-success w-100'
            >
              {isSubmitting ? "Kayıt oluşturuluyor..." : "Register"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
