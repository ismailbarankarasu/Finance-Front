import { NavLink, /*useSearchParams*/ } from "react-router";

export function HomePage() {
/*   const [searchParams] = useSearchParams();

  console.log("search params: ", searchParams);

  console.log("homepagedeyiz", localStorage.getItem("key"))
  let firstname = searchParams.get["name"];

  console.log(firstname); */

  return (
    <>
      <p className='lead text-danger'> Yavuz hoca ile react bir başka !</p>
      <div>
        <NavLink to={"/login"}>Giriş Yap</NavLink> ||
        <NavLink to={"/register"}>Kayıt Ol</NavLink>
      </div>
    </>
  );
}
