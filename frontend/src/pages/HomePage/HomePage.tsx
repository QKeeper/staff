import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Select, type SelectItem } from "@/components/ui/Select";
import { store } from "@/app/store";
import { communitiesApiSlice } from "@/features/communities/communitiesApiSlice";
import { usersApiSlice } from "@/features/users/usersApiSlice";
import { postsApiSlice } from "@/features/posts/postsApiSlice";

export const homeLoader = async () => {
  const meRes = await store.dispatch(usersApiSlice.endpoints.getMe.initiate());
  const promises: Promise<unknown>[] = [
    store.dispatch(postsApiSlice.endpoints.getPosts.initiate({ sort: "best" })),
  ];
  if (meRes.data?.user) {
    promises.push(
      store.dispatch(communitiesApiSlice.endpoints.getMyCommunities.initiate()),
    );
  }
  await Promise.all(promises);
  return null;
};

const HomePage = () => {
  const { t } = useTranslation();

  const sortItems: SelectItem[] = [
    { label: t("feed.sort.best"), value: "best" },
    { label: t("feed.sort.top"), value: "top" },
    { label: t("feed.sort.new"), value: "new" },
  ];

  const SortButton = () => {
    const [sortValue, setSortValue] = useState(() => "best");

    return (
      <Select
        size="small"
        label={t("feed.sortBy")}
        items={sortItems}
        value={sortValue}
        onValueChange={(item) => setSortValue(item.value)}
      />
    );
  };

  return (
    <div>
      <p className="text-2xl font-medium">{t("feed.home")}</p>
      <SortButton />
    </div>
  );
};

export { HomePage };
