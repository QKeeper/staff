import { store } from "@/app/store";
import {
  communitiesApiSlice,
  useGetCommunityByNameQuery,
} from "@/features/communities/communitiesApiSlice";
import {
  postsApiSlice,
  useGetPostsQuery,
} from "@/features/posts/postsApiSlice";
import { Button } from "@/components/ui/Button";
import { Select, type SelectItem } from "@/components/ui/Select";
import { PostCard } from "@/components/PostCard";
import { MessageSquarePlus, PlusIcon, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLoaderData, type LoaderFunctionArgs } from "react-router";

export interface CommunityLoaderData {
  communityName: string;
}

export const communityLoader = async ({
  params,
}: LoaderFunctionArgs): Promise<CommunityLoaderData> => {
  const communityName = params.communityName || "";
  if (!communityName) {
    return { communityName: "" };
  }

  await Promise.all([
    store.dispatch(
      communitiesApiSlice.endpoints.getCommunityByName.initiate(communityName, {
        forceRefetch: true,
      }),
    ),
    store.dispatch(
      postsApiSlice.endpoints.getPosts.initiate(
        {
          communityName,
          sort: "best",
        },
        { forceRefetch: true },
      ),
    ),
  ]);

  return { communityName };
};

const CommunityPage = () => {
  const { communityName } = useLoaderData<CommunityLoaderData>();
  const { t } = useTranslation();

  const [sortValue, setSortValue] = useState<"best" | "top" | "new">("best");

  const { data: community = null } = useGetCommunityByNameQuery(communityName, {
    skip: !communityName,
  });
  const { data: posts = [], isFetching: isLoadingPosts } = useGetPostsQuery(
    { communityName, sort: sortValue },
    { skip: !communityName },
  );

  const sortItems: SelectItem[] = useMemo(
    () => [
      { label: t("feed.sort.best"), value: "best" },
      { label: t("feed.sort.top"), value: "top" },
      { label: t("feed.sort.new"), value: "new" },
    ],
    [t],
  );

  const handleSortChange = (item: SelectItem) => {
    setSortValue(item.value as "best" | "top" | "new");
  };

  if (!community) {
    return (
      <div className="flex-1 py-12 text-center">
        <p className="text-xl font-semibold text-gray-300">
          {t("community.notFound")}
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 pb-16">
      {/* Community Header Card */}
      <div className="flex flex-col justify-between gap-4 rounded-md border border-gray-800 bg-gray-900/60 p-6 backdrop-blur-sm sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <div className="flex size-14 shrink-0 items-center justify-center rounded-full border border-blue-500/30 bg-blue-500/20 text-blue-400">
            <Users className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-100">
              {community.displayName || `r/${communityName}`}
            </h1>
            <p className="text-sm text-gray-400">r/{communityName}</p>
            {community.description && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-300">
                {community.description}
              </p>
            )}
          </div>
        </div>

        <Link
          to={`/submit?community=${encodeURIComponent(communityName)}`}
          state={{ community }}
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

      {/* Sort toolbar */}
      <div className="flex items-center justify-between border-b border-gray-800/80 pb-3">
        <div className="w-48">
          <Select
            size="small"
            label={t("feed.sortBy")}
            items={sortItems}
            value={sortValue}
            onValueChange={handleSortChange}
          />
        </div>
      </div>

      {/* Posts feed or empty state */}
      <div className="space-y-1">
        {isLoadingPosts ? (
          <div className="space-y-4 py-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse space-y-3 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <div className="size-5 rounded-full bg-gray-800" />
                  <div className="h-3 w-28 rounded bg-gray-800" />
                </div>
                <div className="h-5 w-3/4 rounded bg-gray-800" />
                <div className="h-4 w-full rounded bg-gray-800" />
                <div className="h-7 w-48 rounded bg-gray-800" />
              </div>
            ))}
          </div>
        ) : posts.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-800/80 p-12 text-center backdrop-blur-sm">
            <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-gray-800/60 text-gray-400">
              <MessageSquarePlus className="size-6" />
            </div>
            <h3 className="text-base font-semibold text-gray-200">
              {t("community.emptyPostsTitle")}
            </h3>
            <p className="mt-1 max-w-sm text-sm text-gray-400">
              {t("community.emptyPostsDescription")}
            </p>
            <div className="mt-5">
              <Link
                to={`/submit?community=${encodeURIComponent(communityName)}`}
                state={{ community }}
              >
                <Button
                  variant="accent"
                  size="small"
                  icon={<PlusIcon className="size-3.5" />}
                >
                  {t("community.createFirstPost")}
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export { CommunityPage };
