import { Select } from "@/shared/ui/Select";
import type { SelectItem } from "@/shared/ui/Select/Select";
import { useState } from "react";
import { useTranslation } from "react-i18next";

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
