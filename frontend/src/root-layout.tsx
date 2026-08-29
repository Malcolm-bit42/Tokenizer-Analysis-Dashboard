import { Outlet, useLocation } from "react-router";
import { Button } from "./components/button";
import { Hero } from "./components/hero";
import { Nav } from "./nav";
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


  return (
    <>
      <main>
        <Nav />
        <Hero pageName={getPageTitle(path)}/>
        {/* <Button text="Buttonlkfihwfihhdwh Vjdhd" action={(e) => alert("Hello World")}  /> */}
        <Outlet />
      </main>
    </>
  );
};

export default RootLayout;