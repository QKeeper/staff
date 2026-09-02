import { createBrowserRouter, RouterProvider } from "react-router";
import { AppLayout } from "./AppLayout";
import { HomePage } from "./widgets/Feed";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <HomePage />,
      },
    ],
  },
]);

function AppRouter() {
  return <RouterProvider router={router} />;
}

export { AppRouter };
