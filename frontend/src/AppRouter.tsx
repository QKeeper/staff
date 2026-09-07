import { createBrowserRouter, RouterProvider } from "react-router";
import { AppLayout } from "./AppLayout";
import { HomePage } from "@/pages/HomePage";
import { ProfilePage } from "@/pages/ProfilePage";
import { CommunityPage } from "@/pages/CommunityPage";
import { ExplorePage } from "@/pages/ExplorePage";
import { SettingsPage } from "@/pages/SettingsPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
      {
        path: "profile",
        element: <ProfilePage />,
      },
      {
        path: "explore",
        element: <ExplorePage />,
      },
      {
        path: "settings",
        element: <SettingsPage />,
      },
      {
        path: "r/:communityName",
        element: <CommunityPage />,
      },
    ],
  },
]);

function AppRouter() {
  return <RouterProvider router={router} />;
}

export { AppRouter };
