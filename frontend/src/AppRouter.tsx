import { createBrowserRouter, RouterProvider } from "react-router";
import { AppLayout, layoutLoader } from "./AppLayout";
import { AuthLoadingScreen } from "@/components/layout/AuthLoadingScreen";
import { HomePage, homeLoader } from "@/pages/HomePage";
import { ProfilePage } from "@/pages/ProfilePage";
import { CommunityPage, communityLoader } from "@/pages/CommunityPage";
import { ExplorePage } from "@/pages/ExplorePage";
import { SettingsPage } from "@/pages/SettingsPage";

import { CreatePostPage } from "@/pages/CreatePostPage";
import { PostPage, postLoader } from "@/pages/PostPage";

const RootHydrateFallback = () => <AuthLoadingScreen isLoading={true} />;

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    loader: layoutLoader,
    HydrateFallback: RootHydrateFallback,
    children: [
      {
        index: true,
        element: <HomePage />,
        loader: homeLoader,
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
      {
        path: "r/:communityName/posts/:postId",
        element: <PostPage />,
        loader: postLoader,
      },
      {
        path: "posts/:postId",
        element: <PostPage />,
        loader: postLoader,
      },
    ],
  },
]);

function AppRouter() {
  return <RouterProvider router={router} />;
}

export { AppRouter };
