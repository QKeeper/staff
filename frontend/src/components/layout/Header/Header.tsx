import { IconS } from "@/components/ui/icons";
import { Select } from "@/components/ui/Select";
import { PlusIcon, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { Profile } from "./Profile";
import { NotificationsDropdown } from "./NotificationsDropdown";

const Header = () => {
  const { t, i18n } = useTranslation();

  const Logo = () => (
    <Link
      to="/"
      className="flex shrink-0 items-center gap-2 pr-4 text-lg font-medium select-none"
    >
      <IconS className="size-5" />
      <p>{t("header.logo")}</p>
    </Link>
  );

  const Searchbar = () => (
    <label className="flex h-8 w-full cursor-text items-center gap-2 rounded-sm pl-2 text-sm select-none focus-within:bg-gray-800 not-focus-within:hover:bg-gray-900">
      <Search className="size-3.5 shrink-0 text-gray-500" />
      <input
        placeholder={t("header.searchPlaceholder")}
        className="h-full w-full pr-6 text-sm placeholder:text-gray-400 focus-within:outline-none"
      />
    </label>
  );

  const CreatePost = () => (
    <Link
      to="/submit"
      className="flex h-8 shrink-0 items-center justify-center gap-1 rounded-sm px-2.5 text-sm hover:bg-gray-900"
    >
      <PlusIcon className="size-4" />
      {t("header.create")}
    </Link>
  );

  const LanguageSwitcher = () => {
    return (
      <Select
        variant="ghost"
        size="small"
        width={65}
        value={i18n.language}
        onValueChange={(item) => i18n.changeLanguage(item.value)}
        items={[
          { value: "ru", label: "RU" },
          { value: "en", label: "EN" },
        ]}
      />
    );
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-800/80 bg-gray-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-10 max-w-7xl items-center px-4 text-sm">
        <Logo />
        <Searchbar />
        <CreatePost />
        <LanguageSwitcher />
        <NotificationsDropdown />
        <Profile />
      </div>
    </header>
  );
};

export { Header };
