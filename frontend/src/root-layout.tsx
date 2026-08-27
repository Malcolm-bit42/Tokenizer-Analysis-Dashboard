import { Outlet } from "react-router";
// Every common component should be placed here, etc, navbar, footer, etc..

const RootLayout: React.FC = (): React.ReactElement => {
  return (
    <>
      <main>
        <div>Hello World!</div>
        <Outlet />
      </main>
    </>
  );
};

export default RootLayout;