import { useState } from "react";

export function RegisterPage(changeUsername, changeActivePage) {
  const [registerData, setRegisterData] = useState({
    username: "",
    password: "",
    firstname: "",
    lastname: ""
  });
  return (
    <>
      <div className='mt-5'>
        <div className='w-75 mx-auto mt-5 shadow p-5'>
          <h5 className='text-center'>
            <i className='bi bi-box-arrow-in-right pe-3 fs-3'></i>
            Register Finans Takip
          </h5>

        <div className='form-floating mb-3'>
            <input
              name='firstname'
              onChange={(e) => {
                setRegisterData(prevState =>({
                  ...prevState,
                  firstname: e.target.value }));
              }}
              value={registerData.firstname}
              type='text'
              className='form-control'
              id='floatingInput'
              placeholder='Firstname'
            />
            <label htmlFor='floatingInput'>Firstname</label>
          </div>

          <div className='form-floating mb-3'>
            <input
              name='lastname'
              onChange={(e) => {
                setRegisterData(prevState =>({
                  ...prevState,
                  lastname: e.target.value }));
              }}
              value={registerData.lastname}
              type='text'
              className='form-control'
              id='floatingInput'
              placeholder='Lastname'
            />
            <label htmlFor='floatingInput'>Lastname</label>
          </div>
          
        <div className='form-floating mb-3'>
            <input
              name='username'
              onChange={(e) => {
                setRegisterData(prevState =>({
                  ...prevState,
                  username: e.target.value }));
              }}
              value={registerData.username}
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
                setRegisterData((prevState) => ({
                  ...prevState,
                  password: e.target.value,
                }));
              }}
              type='password'
              value={registerData.password}
              className='form-control'
              id='floatingPassword'
              placeholder='Password'
            />
            <label htmlFor='floatingPassword'>Password</label>
          </div>

          <div className='mt-3'>
            <button
              type='button'
              className='btn btn-outline-success w-100'
              onClick={() => {
                console.log("veri gönderildi ", registerData);
                changeUsername(registerData.username);
                changeActivePage("default");
              }}
            >
              Register
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
