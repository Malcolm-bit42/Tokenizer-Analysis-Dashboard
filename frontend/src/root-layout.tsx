import { Outlet, useLocation } from "react-router";
import { Hero } from "./components/hero";
import { Nav } from "./components/nav";
import { Footer } from "./components/footer";
// Every common component should be placed here, etc, navbar, footer, etc..

const RootLayout: React.FC = (): React.ReactElement => {
  const location = useLocation();
  const path = location.pathname;

  const getPageTitle = (currentPath: string): string => {
    let path: string = "";
    switch(currentPath) {
      case "/compare":
        path="compare"
        break;
      case "/leaderboard":
        path="leaderboard";
        break;
      default:
        path = "inspect";
        break;
    }

    return path;

  }

  const a: string[] = ["Paul Model Test 1", "test", "test again", "testity test"]


  return (
    <>
      <Nav path={path} />
      <main className="px-30">
        <Hero pageName={getPageTitle(path)}/>
        {/* <DropDown options={a} placeholder="Language" multiple={false}/> */}
        {/* <Button text="Buttonlkfihwfihhdwh Vjdhd" action={(e) => alert("Hello World")}  /> */}
        <Outlet />
      </main>
      <Footer />
    </>
  );
};

export default RootLayout;