import { cn } from "@/utils/cn";
import { CreateCommunityModal } from "@/components/CreateCommunityModal";
import { NavLink, type NavLinkProps } from "react-router";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import { api, type MyCommunity } from "@/api/client";

const baseStyle =
  "inline-block w-full rounded-sm px-2 py-1 whitespace-nowrap hover:bg-gray-900 transition-colors";
const activeLinkStyle = cn(baseStyle, "border-l rounded-l-none bg-gray-900");
const inactiveLinkStyle = cn(baseStyle, "text-gray-400");
const pendingLinkStyle = cn(
  baseStyle,
  "text-blue-400 animate-pulse bg-gray-900/40",
);

const linkStyle = ({
  isActive,
  isPending,
}: {
  isActive: boolean;
  isPending: boolean;
}) =>
  isActive ? activeLinkStyle : isPending ? pendingLinkStyle : inactiveLinkStyle;

const Link = ({ className, ...props }: NavLinkProps) => {
  return (
    <li>
      <NavLink {...props} className={linkStyle} />
    </li>
  );
};

const Sidebar = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [communities, setCommunities] = useState<MyCommunity[]>([]);

  const fetchCommunities = async () => {
    if (!user) {
      setCommunities([]);
      return;
    }
    try {
      const data = await api.communities.getMyCommunities();
      setCommunities(data);
    } catch {
      // Ignore background fetch error
    }
  };

  useEffect(() => {
    fetchCommunities();

    const handleCreated = () => {
      fetchCommunities();
    };

    window.addEventListener("community-created", handleCreated);
    return () => {
      window.removeEventListener("community-created", handleCreated);
    };
  }, [user]);

  return (
    <div className="w-52 shrink-0">
      <ul>
        <Link to="/">{t("sidebar.home")}</Link>
        <Link to="/explore">{t("sidebar.explore")}</Link>
        <li>
          <CreateCommunityModal />
        </li>

        {user && communities.length > 0 && (
          <>
            <li className="my-2 border-t border-gray-800" />
            <li className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">
              {t("sidebar.myCommunities")}
            </li>
            {communities.map((c) => (
              <Link key={c.id} to={`/r/${c.name}`}>
                r/{c.displayName || c.name}
              </Link>
            ))}
          </>
        )}
      </ul>
    </div>
  );
};

export { Sidebar };
