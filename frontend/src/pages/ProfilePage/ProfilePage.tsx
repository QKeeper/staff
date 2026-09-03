import { useTranslation } from "react-i18next";

const ProfilePage = () => {
  const { t } = useTranslation();

  return (
    <div>
      <p className="text-2xl font-medium">{t("profile.title")}</p>
    </div>
  );
};

export { ProfilePage };
