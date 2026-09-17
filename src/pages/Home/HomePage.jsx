import { NavLink /*useSearchParams*/ } from "react-router";
import { PageHeader } from "../../components/PageHeader";

export function HomePage() {
  /*   const [searchParams] = useSearchParams();

  console.log("search params: ", searchParams);

  console.log("homepagedeyiz", localStorage.getItem("key"))
  let firstname = searchParams.get["name"];

  console.log(firstname); */

  return (
    <>
      <PageHeader
        className={"p-3"}
        title={"Ana Sayfa"}
        subTitle={"Cebinizi Yönetin"}
      ></PageHeader>
      <p className='lead text-danger'> Yavuz hoca ile react bir başka !</p>
      <div>
        <NavLink className={"btn btn-outline-primary"} to={"/categories"}>
          Kategorilere git
        </NavLink>{" "}
        ||
        <NavLink className={"btn btn-outline-success"} to={"/transactions"}>
          İşlemlere git
        </NavLink>
      </div>
    </>
  );
}
