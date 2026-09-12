import { useState, useMemo, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLoaderData, type LoaderFunctionArgs } from "react-router";
import {
  Bell,
  MessageSquarePlus,
  PlusIcon,
  Users,
  Camera,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { store } from "@/app/store";
import {
  communitiesApiSlice,
  useGetCommunityByNameQuery,
  useFollowCommunityMutation,
  useUnfollowCommunityMutation,
  useUpdateCommunityAvatarMutation,
  useUpdateCommunityBannerMutation,
} from "@/features/communities/communitiesApiSlice";
import {
  postsApiSlice,
  useGetPostsQuery,
} from "@/features/posts/postsApiSlice";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { Hint } from "@/components/ui/Hint";
import { Select, type SelectItem } from "@/components/ui/Select";
import { PostCard } from "@/components/PostCard";
import { ImageCropModal } from "@/components/ImageCropModal";
import { formatRegistrationDate } from "@/utils/formatPlural";
import { cn } from "@/utils/cn";

export interface CommunityLoaderData {
  communityName: string;
}

export const communityLoader = ({
  params,
}: LoaderFunctionArgs): CommunityLoaderData => {
  const communityName = params.communityName || "";
  if (communityName) {
    void store.dispatch(
      communitiesApiSlice.endpoints.getCommunityByName.initiate(communityName),
    );
    void store.dispatch(
      postsApiSlice.endpoints.getPosts.initiate({
        communityName,
        sort: "best",
      }),
    );
  }

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

  const { user } = useAuth();
  const [followCommunityMutation] = useFollowCommunityMutation();
  const [unfollowCommunityMutation] = useUnfollowCommunityMutation();

  const handleToggleCommunityFollow = async () => {
    if (!user) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      return;
    }
    if (!community) return;

    if (community.isFollowing) {
      await unfollowCommunityMutation(community.name);
    } else {
      await followCommunityMutation(community.name);
    }
  };

  const [updateAvatarMutation] = useUpdateCommunityAvatarMutation();
  const [updateBannerMutation] = useUpdateCommunityBannerMutation();

  const isCanEdit = Boolean(
    user &&
    community &&
    (community.creatorId === user.id ||
      community.currentUserMembership?.role === "OWNER" ||
      community.currentUserMembership?.role === "ADMIN" ||
      user.role === "ADMIN"),
  );

  const [optimisticAvatarUrl, setOptimisticAvatarUrl] = useState<string | null>(
    null,
  );
  const [optimisticBannerUrl, setOptimisticBannerUrl] = useState<string | null>(
    null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [cropAvatarFile, setCropAvatarFile] = useState<File | null>(null);
  const [isAvatarCropModalOpen, setIsAvatarCropModalOpen] = useState(false);

  const [cropBannerFile, setCropBannerFile] = useState<File | null>(null);
  const [isBannerCropModalOpen, setIsBannerCropModalOpen] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const currentAvatarUrl = optimisticAvatarUrl || community?.avatarUrl || null;
  const currentBannerUrl = optimisticBannerUrl || community?.bannerUrl || null;

  useEffect(() => {
    setOptimisticAvatarUrl(null);
    setOptimisticBannerUrl(null);
    setUploadError(null);
  }, [communityName]);

  const handleAvatarClick = () => {
    if (!isCanEdit) return;
    avatarInputRef.current?.click();
  };

  const handleBannerClick = () => {
    if (!isCanEdit) return;
    bannerInputRef.current?.click();
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError(t("community.fileTooLarge"));
      e.target.value = "";
      return;
    }

    setUploadError(null);
    setCropAvatarFile(file);
    setIsAvatarCropModalOpen(true);
    e.target.value = "";
  };

  const handleApplyCroppedAvatar = async (croppedDataUrl: string) => {
    if (!community) return;
    setOptimisticAvatarUrl(croppedDataUrl);
    try {
      await updateAvatarMutation({
        name: community.name,
        image: croppedDataUrl,
      }).unwrap();
    } catch {
      setOptimisticAvatarUrl(null);
      setUploadError(t("community.uploadError"));
    } finally {
      setOptimisticAvatarUrl(null);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError(t("community.fileTooLarge"));
      e.target.value = "";
      return;
    }

    setUploadError(null);
    setCropBannerFile(file);
    setIsBannerCropModalOpen(true);
    e.target.value = "";
  };

  const handleApplyCroppedBanner = async (croppedDataUrl: string) => {
    if (!community) return;
    setOptimisticBannerUrl(croppedDataUrl);
    try {
      await updateBannerMutation({
        name: community.name,
        image: croppedDataUrl,
      }).unwrap();
    } catch {
      setOptimisticBannerUrl(null);
      setUploadError(t("community.uploadError"));
    } finally {
      setOptimisticBannerUrl(null);
    }
  };

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
      {/* 1. Блок баннера, аватара и информации сообщества */}
      <div ref={bannerSectionRef}>
        {/* Баннер во всю ширину с соотношением 3:1 */}
        <div
          onClick={handleBannerClick}
          className={cn(
            "relative aspect-[3/1] w-full overflow-hidden rounded-2xl bg-gray-800",
            isCanEdit && "group cursor-pointer",
          )}
        >
          {currentBannerUrl ? (
            <img
              src={currentBannerUrl}
              alt={displayName}
              className="size-full object-cover"
            />
          ) : (
            <div className="size-full bg-gray-800" />
          )}

          {isCanEdit && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
              <div className="flex items-center gap-2 rounded-full bg-gray-900/80 px-4 py-2 text-sm font-medium text-gray-200 shadow-lg backdrop-blur-md">
                <Camera className="size-4 text-blue-400" />
                <span>{t("community.changeBanner")}</span>
              </div>
            </div>
          )}
        </div>

        {/* Информационная панель ПОД баннером: Аватарка, Название и Кнопки действий */}
        <div className="flex flex-wrap items-center justify-between gap-4 px-2 sm:px-4 md:px-6">
          {/* Слева: Аватарка (выглядывает вверх) и Название сообщества */}
          <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
            <div
              onClick={handleAvatarClick}
              className={cn(
                "relative z-10 -mt-6 flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-gray-950 bg-gray-900 shadow-2xl sm:-mt-8 sm:size-24 md:-mt-10 md:size-28",
                isCanEdit && "group cursor-pointer",
              )}
            >
              {currentAvatarUrl ? (
                <img
                  src={currentAvatarUrl}
                  alt={displayName}
                  className="size-full object-cover"
                />
              ) : displayName ? (
                <div className="flex size-full items-center justify-center bg-gray-800 text-3xl font-bold text-gray-300 uppercase select-none sm:text-4xl">
                  {displayName.charAt(0)}
                </div>
              ) : (
                <div className="flex size-full items-center justify-center bg-gray-800 text-gray-300">
                  <Users className="size-8 sm:size-12" />
                </div>
              )}

              {isCanEdit && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
                  <Camera className="size-6 text-blue-400" />
                  <span className="mt-1 text-[11px] font-medium text-gray-200">
                    {t("community.changeAvatar")}
                  </span>
                </div>
              )}
            </div>

            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-gray-100 sm:text-3xl">
                {displayName}
              </h1>
              <span className="text-sm font-medium text-gray-400">
                r/{community.name}
              </span>
            </div>
          </div>

          {/* Справа: Кнопка уведомлений и Создать пост */}
          <div className="flex shrink-0 items-center gap-2.5">
            <Hint
              content={
                community.isFollowing
                  ? t("community.notificationsEnabled")
                  : t("community.notifyOn")
              }
              position="top"
            >
              <Button
                variant={community.isFollowing ? "accent" : "solid"}
                size="medium"
                aria-label={
                  community.isFollowing
                    ? t("community.notificationsEnabled")
                    : t("community.notifyOn")
                }
                className={cn(
                  "size-10 min-w-10 rounded p-0 transition-colors",
                  community.isFollowing
                    ? "border-transparent bg-white text-gray-950 hover:border-transparent hover:bg-white hover:text-gray-950"
                    : "text-gray-300 hover:text-white",
                )}
                onClick={handleToggleCommunityFollow}
              >
                <Bell
                  className={cn(
                    "size-4",
                    community.isFollowing && "fill-current",
                  )}
                />
              </Button>
            </Hint>

            <Link
              to={`/submit?community=${encodeURIComponent(communityName)}`}
              state={{ community }}
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
      </div>

      {uploadError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          <AlertCircle className="size-4 shrink-0 text-red-400" />
          <span>{uploadError}</span>
        </div>
      )}

      {/* 2. Двухколоночный лейаут */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Левая основная колонка (2/3) */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* Описание сообщества */}
          {community.description && (
            <p className="text-sm leading-relaxed text-gray-300">
              {community.description}
            </p>
          )}

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
                    <div className="aspect-[3/1] w-full overflow-hidden rounded-xl bg-gray-800">
                      {currentBannerUrl ? (
                        <img
                          src={currentBannerUrl}
                          alt={displayName}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="size-full bg-gray-800" />
                      )}
                    </div>

                    {/* Мини-аватар */}
                    <div className="absolute bottom-0 left-3.5 z-10 flex size-14 translate-y-1/2 items-center justify-center overflow-hidden rounded-full border-2 border-gray-950 bg-gray-900 shadow-lg">
                      {currentAvatarUrl ? (
                        <img
                          src={currentAvatarUrl}
                          alt={displayName}
                          className="size-full object-cover"
                        />
                      ) : displayName ? (
                        <div className="flex size-full items-center justify-center bg-gray-800 text-lg font-bold text-gray-300 uppercase select-none">
                          {displayName.charAt(0)}
                        </div>
                      ) : (
                        <div className="flex size-full items-center justify-center bg-gray-800 text-gray-300">
                          <Users className="size-6" />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Имя, r/{name} и кнопка уведомлений */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-base font-bold text-gray-100">
                        {displayName}
                      </div>
                      <div className="truncate text-xs text-gray-400">
                        r/{community.name}
                      </div>
                    </div>
                    <Hint
                      content={
                        community.isFollowing
                          ? t("community.notificationsEnabled")
                          : t("community.notifyOn")
                      }
                      position="top-right"
                    >
                      <Button
                        variant={community.isFollowing ? "accent" : "ghost"}
                        size="small"
                        aria-label={
                          community.isFollowing
                            ? t("community.notificationsEnabled")
                            : t("community.notifyOn")
                        }
                        className={cn(
                          "size-8 min-w-8 shrink-0 rounded p-0 transition-colors",
                          community.isFollowing
                            ? "border-transparent bg-white text-gray-950 hover:bg-white hover:text-gray-950"
                            : "text-gray-400 hover:bg-gray-800 hover:text-gray-200",
                        )}
                        onClick={handleToggleCommunityFollow}
                      >
                        <Bell
                          className={cn(
                            "size-4",
                            community.isFollowing && "fill-current",
                          )}
                        />
                      </Button>
                    </Hint>
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
          </div>
        </div>
      </div>

      {/* Скрытые инпуты для загрузки изображений */}
      <input
        type="file"
        ref={avatarInputRef}
        onChange={handleAvatarUpload}
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
      />
      <input
        type="file"
        ref={bannerInputRef}
        onChange={handleBannerUpload}
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
      />

      {/* Модалки обрезки изображений */}
      {cropAvatarFile && (
        <ImageCropModal
          isOpen={isAvatarCropModalOpen}
          onClose={() => {
            setIsAvatarCropModalOpen(false);
            setCropAvatarFile(null);
          }}
          imageFile={cropAvatarFile}
          aspectRatio={1}
          title={t("community.cropAvatarTitle")}
          onApply={handleApplyCroppedAvatar}
        />
      )}

      {cropBannerFile && (
        <ImageCropModal
          isOpen={isBannerCropModalOpen}
          onClose={() => {
            setIsBannerCropModalOpen(false);
            setCropBannerFile(null);
          }}
          imageFile={cropBannerFile}
          aspectRatio={3 / 1}
          title={t("community.cropBannerTitle")}
          onApply={handleApplyCroppedBanner}
        />
      )}
    </div>
  );
};

export { CommunityPage };
