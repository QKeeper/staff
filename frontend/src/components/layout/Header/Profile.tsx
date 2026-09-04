import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { LogOutIcon, Settings2Icon, UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { AuthModal } from "@/components/AuthModal";

const Profile = () => {
  const { t } = useTranslation();
  const { user, logout, isLoading } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  if (isLoading) {
    return <div className="size-8 animate-pulse rounded-full bg-gray-800" />;
  }

  if (!user) {
    return (
      <>
        <Button
          variant="outline"
          size="small"
          className="shrink-0 rounded-sm px-3"
          onClick={() => setIsAuthOpen(true)}
        >
          <span>{t("header.login")}</span>
        </Button>
        <AuthModal open={isAuthOpen} onOpenChange={setIsAuthOpen} />
      </>
    );
  }

  const MyProfileItem = () => (
    <Dropdown.Link to="/profile" icon={<UserIcon className="size-4" />}>
      <span>{t("header.profile")}</span>
    </Dropdown.Link>
  );

  const SettingsItem = () => (
    <Dropdown.Link to="/settings" icon={<Settings2Icon className="size-4" />}>
      <span>{t("header.settings")}</span>
    </Dropdown.Link>
  );

  const LogOutItem = () => (
    <Dropdown.Button
      icon={<LogOutIcon className="size-4" />}
      onClick={() => logout()}
    >
      <span>{t("header.logout")}</span>
    </Dropdown.Button>
  );

  return (
    <Dropdown align="end">
      <Dropdown.Trigger asChild>
        <Button
          variant="ghost"
          size="small"
          className="shrink-0 rounded-sm px-3"
        >
          <span>{user.username}</span>
        </Button>
      </Dropdown.Trigger>

      <Dropdown.Content>
        <MyProfileItem />
        <SettingsItem />
        <LogOutItem />
      </Dropdown.Content>
    </Dropdown>
  );
};

export { Profile };
