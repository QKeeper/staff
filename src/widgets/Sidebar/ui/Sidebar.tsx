import { cn } from "@/shared/utils/cn";
import { CreateCommunityModal } from "@/widgets/CreateCommunityModal";
import { NavLink, type NavLinkProps } from "react-router";
import { useTranslation } from "react-i18next";

const baseStyle =
  "inline-block w-full rounded-sm px-2 py-1 whitespace-nowrap hover:bg-gray-900";
const activeLinkStyle = cn(baseStyle, "border-l rounded-l-none bg-gray-900");
const inactiveLinkStyle = cn(baseStyle, "text-gray-400");

const linkStyle = ({ isActive }: { isActive: boolean }) =>
  isActive ? activeLinkStyle : inactiveLinkStyle;

const Link = ({ className, ...props }: NavLinkProps) => {
  return (
    <li>
      <NavLink {...props} className={linkStyle} />
    </li>
  );
};

const Sidebar = () => {
  const { t } = useTranslation();

  return (
    <div className="w-52 shrink-0">
      <ul>
        <Link to="/">{t("sidebar.home")}</Link>
        <Link to="/explore">{t("sidebar.explore")}</Link>
        <li>
          <CreateCommunityModal />
        </li>
      </ul>
    </div>
  );
};

export { Sidebar };
