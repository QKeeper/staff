import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { LogOutIcon, Settings2Icon, UserIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { AuthModal } from "@/components/AuthModal";

const Profile = () => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  useEffect(() => {
    const handleOpen = () => setIsAuthOpen(true);
    window.addEventListener("open-auth-modal", handleOpen);
    return () => window.removeEventListener("open-auth-modal", handleOpen);
  }, []);

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
    <Dropdown.Link
      to={`/u/${user.username}`}
      icon={<UserIcon className="size-4" />}
    >
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
          className="shrink-0 gap-2 rounded-sm px-2"
        >
          <div className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-800 text-gray-300">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.username}
                className="size-full rounded-full object-cover"
              />
            ) : (
              <UserIcon className="size-3 text-gray-400" />
            )}
          </div>
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
