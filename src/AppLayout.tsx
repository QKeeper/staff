import { Outlet } from "react-router";
import { Header } from "./widgets/Header";
import { Sidebar } from "./widgets/Sidebar";

function AppLayout() {
  return (
    <div>
      <Header />
      <div className="container mx-auto flex max-w-7xl flex-nowrap gap-4 px-4">
        <Sidebar />
        <Outlet />
      </div>
    </div>
  );
}

export { AppLayout };
