import { api, type MyCommunity } from "@/api/client";
import { Select, type SelectItem } from "@/components/ui/Select";
import { getAuthUser } from "@/context/AuthContext";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLoaderData } from "react-router";

export interface HomeLoaderData {
  myCommunities: MyCommunity[];
}

export const homeLoader = async (): Promise<HomeLoaderData> => {
  const user = await getAuthUser();
  if (!user) {
    return { myCommunities: [] };
  }
  const myCommunities = await api.communities.getMyCommunities();
  return { myCommunities };
};

const HomePage = () => {
  const { myCommunities } = useLoaderData<HomeLoaderData>();
  const { t } = useTranslation();
  void myCommunities;

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
