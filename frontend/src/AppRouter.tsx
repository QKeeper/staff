import { createBrowserRouter, RouterProvider } from "react-router";
import { AppLayout } from "./AppLayout";
import { HomePage } from "@/pages/HomePage";
import { ProfilePage } from "@/pages/ProfilePage";
import { CommunityPage, communityLoader } from "@/pages/CommunityPage";
import { ExplorePage } from "@/pages/ExplorePage";
import { SettingsPage } from "@/pages/SettingsPage";

import { CreatePostPage } from "@/pages/CreatePostPage";

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
        path: "submit",
        element: <CreatePostPage />,
      },
      {
        path: "r/:communityName",
        element: <CommunityPage />,
        loader: communityLoader,
      },
    ],
  },
]);

function AppRouter() {
  return <RouterProvider router={router} />;
}

export { AppRouter };
