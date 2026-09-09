import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLoaderData, type LoaderFunctionArgs } from "react-router";
import { MessageSquarePlus, PlusIcon, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
import { formatRegistrationDate } from "@/utils/formatPlural";

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
  const { t, i18n } = useTranslation();

  const [sortValue, setSortValue] = useState<"best" | "top" | "new">("best");

  const { data: community = null } = useGetCommunityByNameQuery(communityName, {
    skip: !communityName,
  });
  const { data: posts = [], isFetching: isLoadingPosts } = useGetPostsQuery(
    { communityName, sort: sortValue },
    { skip: !communityName },
  );

  const bannerSectionRef = useRef<HTMLDivElement>(null);
  const [isBannerScrolled, setIsBannerScrolled] = useState(false);

  useEffect(() => {
    const el = bannerSectionRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsBannerScrolled(
          !entry.isIntersecting && entry.boundingClientRect.top < 0,
        );
      },
      {
        threshold: 0,
        rootMargin: "-64px 0px 0px 0px",
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
      <div className="flex-1 py-16 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-gray-800 text-gray-400">
          <Users className="size-7" />
        </div>
        <h2 className="text-xl font-semibold text-gray-200">
          {t("community.notFound")}
        </h2>
        <Link to="/" className="inline-block">
          <Button variant="outline" size="medium" className="mt-5">
            {t("postPage.back")}
          </Button>
        </Link>
      </div>
    );
  }

  const displayName = community.displayName || community.name;

  return (
    <div className="flex-1 space-y-6 pb-16">
      {/* 1. Блок баннера и аватара */}
      <div ref={bannerSectionRef} className="relative mb-12 sm:mb-16 md:mb-20">
        {/* Баннер во всю ширину с соотношением 3:1 */}
        <div className="relative aspect-[3/1] w-full overflow-hidden rounded-2xl border border-gray-800 bg-gray-900">
          <div className="size-full bg-gray-900" />
        </div>

        {/* Аватар: центр строго на нижней границе баннера, с отступом слева */}
        <div className="absolute bottom-0 left-4 z-10 flex size-20 -translate-x-0 translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-4 border-gray-950 bg-gray-900 shadow-2xl sm:left-6 sm:size-28 md:left-8 md:size-32">
          {displayName ? (
            <div className="flex size-full items-center justify-center bg-gray-800 text-3xl font-bold text-gray-300 uppercase sm:text-4xl">
              {displayName.charAt(0)}
            </div>
          ) : (
            <div className="flex size-full items-center justify-center bg-gray-800 text-gray-300">
              <Users className="size-8 sm:size-12" />
            </div>
          )}
        </div>
      </div>

      {/* 2. Двухколоночный лейаут */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Левая основная колонка (2/3) */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* Название и описание сообщества */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h1 className="text-2xl font-bold text-gray-100 sm:text-3xl">
                {displayName}
              </h1>
              <span className="text-sm font-medium text-gray-400">
                r/{community.name}
              </span>
            </div>

            {community.description && (
              <p className="mt-2 text-sm leading-relaxed text-gray-300">
                {community.description}
              </p>
            )}
          </div>

          {/* Панель сортировки постов */}
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

          {/* Лента постов */}
          <div className="space-y-1">
            {isLoadingPosts ? (
              <div className="space-y-4 py-6">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="animate-pulse space-y-3 rounded-xl p-4"
                  >
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

        {/* Правая информационная колонка (1/3) */}
        <div className="space-y-4 lg:col-span-1">
          <div className="sticky top-20 space-y-5">
            {/* Плавающий мини-хедер сообщества при скролле */}
            <AnimatePresence>
              {isBannerScrolled && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 300, damping: 28 }}
                  className="overflow-hidden pb-1"
                >
                  <div className="relative mb-8">
                    {/* Мини-баннер */}
                    <div className="aspect-[3/1] w-full overflow-hidden rounded-xl border border-gray-800/80 bg-gray-900">
                      <div className="size-full bg-gray-900" />
                    </div>

                    {/* Мини-аватар */}
                    <div className="absolute bottom-0 left-3.5 z-10 flex size-14 translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-2 border-gray-950 bg-gray-900 shadow-lg">
                      {displayName ? (
                        <div className="flex size-full items-center justify-center bg-gray-800 text-lg font-bold text-gray-300 uppercase">
                          {displayName.charAt(0)}
                        </div>
                      ) : (
                        <div className="flex size-full items-center justify-center bg-gray-800 text-gray-300">
                          <Users className="size-6" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Имя и r/{name} */}
                  <div className="min-w-0">
                    <div className="truncate text-base font-bold text-gray-100">
                      {displayName}
                    </div>
                    <div className="truncate text-xs text-gray-400">
                      r/{community.name}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Чистая статистика в 2 столбика */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {/* Участники */}
              <div>
                <div className="text-lg font-bold text-gray-100">
                  {community.membersCount}
                </div>
                <div className="text-xs text-gray-400">
                  {t("community.membersCount")}
                </div>
              </div>

              {/* Дата основания сообщества */}
              <div>
                <div className="text-sm leading-7 font-medium text-gray-200">
                  {formatRegistrationDate(community.createdAt, i18n.language)}
                </div>
                <div className="text-xs text-gray-400">
                  {t("community.created")}
                </div>
              </div>

              {/* Публикации */}
              <div>
                <div className="text-lg font-bold text-gray-100">
                  {posts.length}
                </div>
                <div className="text-xs text-gray-400">
                  {t("community.publications")}
                </div>
              </div>
            </div>

            {/* Кнопка создания публикации */}
            <Link
              to={`/submit?community=${encodeURIComponent(communityName)}`}
              state={{ community }}
              className="block pt-2"
            >
              <Button
                variant="accent"
                size="medium"
                className="w-full"
                icon={<PlusIcon className="size-4" />}
              >
                {t("community.createPost")}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export { CommunityPage };
