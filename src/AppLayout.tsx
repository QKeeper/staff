import { Outlet } from "react-router";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";

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
