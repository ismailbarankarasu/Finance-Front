import { useState } from "react";

export function LoginPage(changeUsername, changeActivePage) {
  const [loginData, setLoginData] = useState({
    username: "",
    password: "",
  });
  return (
    <>
      <div className='mt-5'>
        <div className='w-75 mx-auto mt-5 shadow p-5'>
          <h5 className='text-center'>
            <i className='bi bi-box-arrow-in-right pe-3 fs-3'></i>
            Login Finans Takip
          </h5>
          <div className='form-floating mb-3'>
            <input
              name='username'
              onChange={(e) => {
                setLoginData(prevState =>({
                  ...prevState,
                  username: e.target.value }));
              }}
              value={loginData.username}
              type='text'
              className='form-control'
              id='floatingInput'
              placeholder='Username'
            />
            <label htmlFor='floatingInput'>Username</label>
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
              value={loginData.password}
              className='form-control'
              id='floatingPassword'
              placeholder='Password'
            />
            <label htmlFor='floatingPassword'>Password</label>
          </div>

          <div className='mt-3'>
            <button
              type='button'
              className='btn btn-outline-primary w-100'
              onClick={() => {
                console.log("veri gönderildi ", loginData);
                changeUsername(loginData.username);
                changeActivePage("default");
              }}
            >
              Login
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
