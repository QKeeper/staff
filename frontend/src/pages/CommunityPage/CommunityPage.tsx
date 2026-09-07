import { api, type Community } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { PlusIcon, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router";

const CommunityPage = () => {
  const { communityName } = useParams<{ communityName: string }>();
  const { t } = useTranslation();
  const [community, setCommunity] = useState<Community | null>(null);

  useEffect(() => {
    if (!communityName) return;
    let isMounted = true;
    api.communities
      .getByName(communityName)
      .then((data) => {
        if (isMounted) setCommunity(data);
      })
      .catch(() => {
        if (isMounted) setCommunity(null);
      });

    return () => {
      isMounted = false;
    };
  }, [communityName]);

  return (
    <div className="flex-1 space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-md border border-gray-800 bg-gray-900/60 p-6 backdrop-blur-sm sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/20 text-blue-400">
            <Users className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">
              {community?.displayName || `r/${communityName}`}
            </h1>
            <p className="text-sm text-gray-400">r/{communityName}</p>
            {community?.description && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-300">
                {community.description}
              </p>
            )}
          </div>
        </div>

        <Link
          to={`/submit?community=${encodeURIComponent(communityName || "")}`}
          className="shrink-0"
        >
          <Button
            variant="accent"
            size="medium"
            icon={<PlusIcon className="size-4" />}
          >
            {t("community.createPost")}
          </Button>
        </Link>
      </div>
    </div>
  );
};

export { CommunityPage };
