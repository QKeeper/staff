import { useTranslation } from "react-i18next";

const SettingsPage = () => {
  const { t } = useTranslation();

  return (
    <div className="flex-1">
      <h1 className="text-2xl font-medium">{t("settings.title")}</h1>
    </div>
  );
};

export { SettingsPage };
