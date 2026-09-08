import { Outlet, useNavigation } from "react-router";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import type { MyCommunity, User } from "@/api/client";
import { store } from "@/app/store";
import { usersApiSlice } from "@/features/users/usersApiSlice";
import { communitiesApiSlice } from "@/features/communities/communitiesApiSlice";

export interface LayoutLoaderData {
  user: User | null;
  communities: MyCommunity[];
}

export const layoutLoader = async (): Promise<LayoutLoaderData> => {
  const meRes = await store.dispatch(usersApiSlice.endpoints.getMe.initiate());
  const user = meRes.data?.user ?? null;
  let communities: MyCommunity[] = [];
  if (user) {
    const commRes = await store.dispatch(
      communitiesApiSlice.endpoints.getMyCommunities.initiate(),
    );
    communities = commRes.data ?? [];
  }
  return { user, communities };
};

function AppLayout() {
  const navigation = useNavigation();
  const isNavigating = navigation.state === "loading";

  return (
    <div className="relative min-h-screen">
      {isNavigating && (
        <div className="fixed top-0 right-0 left-0 z-50 h-0.5 overflow-hidden bg-blue-500/20">
          <div className="h-full w-full animate-pulse bg-blue-500" />
        </div>
      )}
      <Header />
      <div className="container mx-auto flex max-w-7xl flex-nowrap gap-4 px-4">
        <Sidebar />
        <Outlet />
      </div>
    </div>
  );
}

export { AppLayout };
