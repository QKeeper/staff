import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  useLoaderData,
  useNavigate,
  type LoaderFunctionArgs,
} from "react-router";
import {
  User as UserIcon,
  FileText,
  MessageSquare,
  Sparkles,
  Camera,
  AlertCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { store } from "@/app/store";
import {
  useGetUserProfileQuery,
  useUpdateAvatarMutation,
  useUpdateBannerMutation,
  usersApiSlice,
} from "@/features/users/usersApiSlice";
import {
  useGetPostsQuery,
  useListUserCommentsQuery,
  postsApiSlice,
} from "@/features/posts/postsApiSlice";
import { useAuth } from "@/context/AuthContext";
import { PostCard } from "@/components/PostCard";
import { UserCommentCard } from "@/components/UserCommentCard";
import { ImageCropModal } from "@/components/ImageCropModal";
import { Button } from "@/components/ui/Button";
import { formatRegistrationDate } from "@/utils/formatPlural";
import { cn } from "@/utils/cn";

export interface ProfileLoaderData {
  username: string;
}

export const profileLoader = async ({
  params,
}: LoaderFunctionArgs): Promise<ProfileLoaderData> => {
  const username = params.username || "";
  if (!username) {
    return { username: "" };
  }

  // Pre-load all data into RTK Query store before completing navigation
  await Promise.all([
    store.dispatch(usersApiSlice.endpoints.getUserProfile.initiate(username)),
    store.dispatch(
      postsApiSlice.endpoints.getPosts.initiate({
        authorUsername: username,
        sort: "new",
      }),
    ),
    store.dispatch(postsApiSlice.endpoints.listUserComments.initiate(username)),
  ]);

  return { username };
};

type TabType = "overview" | "posts" | "comments";

const ProfilePage = () => {
  const { username } = useLoaderData<ProfileLoaderData>();
  const { user, refreshUser, updateUser } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>("overview");

  // Read immediately from RTK Query cache hydrated by profileLoader
  const { data: profileUserData } = useGetUserProfileQuery(username, {
    skip: !username,
  });
  const profileUser = profileUserData?.user || null;

  const { data: posts = [] } = useGetPostsQuery(
    { authorUsername: username, sort: "new" },
    { skip: !username },
  );
  const { data: comments = [] } = useListUserCommentsQuery(username, {
    skip: !username,
  });

  const [updateAvatarMutation] = useUpdateAvatarMutation();
  const [updateBannerMutation] = useUpdateBannerMutation();

  const [optimisticAvatarUrl, setOptimisticAvatarUrl] = useState<string | null>(
    null,
  );
  const [optimisticBannerUrl, setOptimisticBannerUrl] = useState<string | null>(
    null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isOwnProfile = Boolean(
    user &&
    profileUser &&
    (user.id === profileUser.id ||
      user.username.toLowerCase() === profileUser.username.toLowerCase()),
  );

  const currentAvatarUrl = isOwnProfile
    ? optimisticAvatarUrl || user?.avatarUrl || profileUser?.avatarUrl || null
    : profileUser?.avatarUrl || null;
  const currentBannerUrl = isOwnProfile
    ? optimisticBannerUrl || user?.bannerUrl || profileUser?.bannerUrl || null
    : profileUser?.bannerUrl || null;

  const [cropAvatarFile, setCropAvatarFile] = useState<File | null>(null);
  const [isAvatarCropModalOpen, setIsAvatarCropModalOpen] = useState(false);

  const [cropBannerFile, setCropBannerFile] = useState<File | null>(null);
  const [isBannerCropModalOpen, setIsBannerCropModalOpen] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    setActiveTab("overview");
    setOptimisticAvatarUrl(null);
    setOptimisticBannerUrl(null);
    setUploadError(null);
  }, [username]);

  const handleAvatarClick = () => {
    if (!isOwnProfile) return;
    avatarInputRef.current?.click();
  };

  const handleBannerClick = () => {
    if (!isOwnProfile) return;
    bannerInputRef.current?.click();
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError(t("profile.fileTooLarge"));
      e.target.value = "";
      return;
    }

    setUploadError(null);
    setCropAvatarFile(file);
    setIsAvatarCropModalOpen(true);
    e.target.value = "";
  };

  const handleApplyCroppedAvatar = async (croppedDataUrl: string) => {
    setOptimisticAvatarUrl(croppedDataUrl);
    const previousUser = user;
    if (user) {
      updateUser({ avatarUrl: croppedDataUrl });
    }
    try {
      const res = await updateAvatarMutation({
        image: croppedDataUrl,
      }).unwrap();
      await refreshUser(res?.user);
    } catch {
      if (previousUser) {
        updateUser({ avatarUrl: previousUser.avatarUrl });
      }
      setOptimisticAvatarUrl(null);
      setUploadError(t("profile.uploadError"));
    } finally {
      setOptimisticAvatarUrl(null);
    }
  };

  const handleBannerUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError(t("profile.fileTooLarge"));
      e.target.value = "";
      return;
    }

    setUploadError(null);
    setCropBannerFile(file);
    setIsBannerCropModalOpen(true);
    e.target.value = "";
  };

  const handleApplyCroppedBanner = async (croppedDataUrl: string) => {
    setOptimisticBannerUrl(croppedDataUrl);
    const previousUser = user;
    if (user) {
      updateUser({ bannerUrl: croppedDataUrl });
    }
    try {
      const res = await updateBannerMutation({
        image: croppedDataUrl,
      }).unwrap();
      await refreshUser(res?.user);
    } catch {
      if (previousUser) {
        updateUser({ bannerUrl: previousUser.bannerUrl });
      }
      setOptimisticBannerUrl(null);
      setUploadError(t("profile.uploadError"));
    } finally {
      setOptimisticBannerUrl(null);
    }
  };

  const displayPosts = useMemo(() => {
    if (!isOwnProfile || !currentAvatarUrl) return posts;
    return posts.map((post) => ({
      ...post,
      author: {
        ...post.author,
        avatarUrl: currentAvatarUrl,
      },
    }));
  }, [posts, isOwnProfile, currentAvatarUrl]);

  const displayComments = useMemo(() => {
    if (!isOwnProfile || !currentAvatarUrl) return comments;
    return comments.map((comment) => ({
      ...comment,
      author: {
        ...comment.author,
        avatarUrl: currentAvatarUrl,
      },
    }));
  }, [comments, isOwnProfile, currentAvatarUrl]);

  const activities = useMemo(() => {
    const p = displayPosts.map((post) => ({
      type: "post" as const,
      id: `post-${post.id}`,
      createdAt: post.createdAt,
      post,
    }));
    const c = displayComments.map((comment) => ({
      type: "comment" as const,
      id: `comment-${comment.id}`,
      createdAt: comment.createdAt,
      comment,
    }));
    return [...p, ...c].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [displayPosts, displayComments]);

  const karma = useMemo(() => {
    if (typeof profileUser?.karma === "number") {
      return profileUser.karma;
    }
    const postsKarma = posts.reduce(
      (sum, p) => sum + (p.score ?? p.upvotes - p.downvotes),
      0,
    );
    const commentsKarma = comments.reduce(
      (sum, c) => sum + (c.score ?? c.upvotes - c.downvotes),
      0,
    );
    return postsKarma + commentsKarma;
  }, [profileUser?.karma, posts, comments]);

  if (!profileUser) {
    return (
      <div className="flex-1 py-16 text-center">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-full bg-gray-800 text-gray-400">
          <UserIcon className="size-7" />
        </div>
        <h2 className="text-xl font-semibold text-gray-200">
          {t("profile.userNotFound")}
        </h2>
        <Button
          variant="outline"
          size="medium"
          className="mt-5"
          onClick={() => navigate("/")}
        >
          {t("postPage.back")}
        </Button>
      </div>
    );
  }

  const displayName = profileUser.displayName || profileUser.username;

  return (
    <div className="flex-1 space-y-6 pb-16">
      {/* Скрытые инпуты для загрузки аватара и баннера */}
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleAvatarUpload}
      />
      <input
        ref={bannerInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={handleBannerUpload}
      />

      {/* Модалка кадрирования аватара */}
      <ImageCropModal
        isOpen={isAvatarCropModalOpen}
        onClose={() => setIsAvatarCropModalOpen(false)}
        imageFile={cropAvatarFile}
        onApply={handleApplyCroppedAvatar}
        aspectRatio={1}
        cropShape="round"
        title={t("profile.cropAvatarTitle")}
        subtitle={t("profile.cropAvatarSubtitle")}
      />

      {/* Модалка кадрирования баннера с зумом и перемещением */}
      <ImageCropModal
        isOpen={isBannerCropModalOpen}
        onClose={() => setIsBannerCropModalOpen(false)}
        imageFile={cropBannerFile}
        onApply={handleApplyCroppedBanner}
        aspectRatio={3}
        cropShape="rect"
        title={t("profile.cropBannerTitle")}
        subtitle={t("profile.cropBannerSubtitle")}
      />

      {/* 1. Блок баннера и аватара */}
      <div ref={bannerSectionRef} className="relative mb-12 sm:mb-16 md:mb-20">
        {/* Баннер во всю ширину с соотношением 3:1 */}
        <div
          onClick={handleBannerClick}
          className={cn(
            "relative aspect-[3/1] w-full overflow-hidden rounded-2xl border border-gray-800 bg-gradient-to-r from-blue-950/40 via-gray-900 to-indigo-950/40",
            isOwnProfile && "group cursor-pointer",
          )}
        >
          {currentBannerUrl ? (
            <img
              src={currentBannerUrl}
              alt={displayName}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gray-900/60" />
          )}

          {isOwnProfile && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
              <div className="flex items-center gap-2 rounded-full bg-gray-900/80 px-4 py-2 text-sm font-medium text-gray-200 shadow-lg backdrop-blur-md">
                <Camera className="size-4 text-blue-400" />
                <span>{t("profile.changeBanner")}</span>
              </div>
            </div>
          )}
        </div>

        {/* Аватар: центр строго на нижней границе баннера, с отступом слева */}
        <div
          onClick={handleAvatarClick}
          className={cn(
            "absolute bottom-0 left-4 z-10 size-20 -translate-x-0 translate-y-1/2 sm:left-6 sm:size-28 md:left-8 md:size-32",
            "overflow-hidden rounded-full border-4 border-gray-950 bg-gray-900 shadow-2xl",
            isOwnProfile && "group cursor-pointer",
          )}
        >
          {currentAvatarUrl ? (
            <img
              src={currentAvatarUrl}
              alt={displayName}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center bg-gray-800 text-3xl font-bold text-gray-300 uppercase sm:text-4xl">
              {displayName.charAt(0)}
            </div>
          )}

          {isOwnProfile && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 opacity-0 backdrop-blur-[2px] transition-opacity group-hover:opacity-100">
              <Camera className="size-6 text-blue-400" />
              <span className="mt-1 text-[11px] font-medium text-gray-200">
                {t("profile.changeAvatar")}
              </span>
            </div>
          )}
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
        {/* Левая основная колонка */}
        <div className="min-w-0 space-y-6 lg:col-span-2">
          {/* Имя и био пользователя */}
          <div className="space-y-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h1 className="text-2xl font-bold text-gray-100 sm:text-3xl">
                {displayName}
              </h1>
              <span className="text-sm font-medium text-gray-400">
                u/{profileUser.username}
              </span>
            </div>

            {profileUser.bio && (
              <p className="mt-2 text-sm leading-relaxed text-gray-300">
                {profileUser.bio}
              </p>
            )}
          </div>

          {/* Вкладки навигации */}
          <div className="flex border-b border-gray-800">
            <button
              type="button"
              onClick={() => setActiveTab("overview")}
              className={cn(
                "border-b-2 px-3 py-2 text-sm font-semibold transition-colors",
                activeTab === "overview"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-gray-200",
              )}
            >
              {t("profile.overview")}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("posts")}
              className={cn(
                "border-b-2 px-3 py-2 text-sm font-semibold transition-colors",
                activeTab === "posts"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-gray-200",
              )}
            >
              {t("profile.posts")}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("comments")}
              className={cn(
                "border-b-2 px-3 py-2 text-sm font-semibold transition-colors",
                activeTab === "comments"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-gray-200",
              )}
            >
              {t("profile.comments")}
            </button>
          </div>

          {/* Контент активной вкладки */}
          <div className="pt-2">
            {activeTab === "overview" &&
              (activities.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-800/80 p-12 text-center">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-gray-800/60 text-gray-400">
                    <Sparkles className="size-6" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-200">
                    {t("profile.emptyOverviewTitle")}
                  </h3>
                  <p className="mt-1 max-w-sm text-sm text-gray-400">
                    {t("profile.emptyOverviewDescription")}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activities.map((item) =>
                    item.type === "post" ? (
                      <PostCard key={item.id} post={item.post} />
                    ) : (
                      <UserCommentCard key={item.id} comment={item.comment} />
                    ),
                  )}
                </div>
              ))}

            {activeTab === "posts" &&
              (posts.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-800/80 p-12 text-center">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-gray-800/60 text-gray-400">
                    <FileText className="size-6" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-200">
                    {t("profile.emptyPostsTitle")}
                  </h3>
                  <p className="mt-1 max-w-sm text-sm text-gray-400">
                    {t("profile.emptyPostsDescription")}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayPosts.map((post) => (
                    <PostCard key={post.id} post={post} />
                  ))}
                </div>
              ))}

            {activeTab === "comments" &&
              (comments.length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-gray-800/80 p-12 text-center">
                  <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-gray-800/60 text-gray-400">
                    <MessageSquare className="size-6" />
                  </div>
                  <h3 className="text-base font-semibold text-gray-200">
                    {t("profile.emptyCommentsTitle")}
                  </h3>
                  <p className="mt-1 max-w-sm text-sm text-gray-400">
                    {t("profile.emptyCommentsDescription")}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayComments.map((comment) => (
                    <UserCommentCard key={comment.id} comment={comment} />
                  ))}
                </div>
              ))}
          </div>
        </div>

        {/* Правая информационная колонка */}
        <div className="space-y-4 lg:col-span-1">
          <div className="sticky top-20 space-y-5">
            {/* Карточка пользователя (появляется при скролле, когда баннер и аватарка уходят из виду) */}
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
                    <div
                      onClick={isOwnProfile ? handleBannerClick : undefined}
                      className={cn(
                        "aspect-[3/1] w-full overflow-hidden rounded-xl border border-gray-800/80 bg-gradient-to-r from-blue-950/40 via-gray-900 to-indigo-950/40",
                        isOwnProfile && "cursor-pointer",
                      )}
                    >
                      {currentBannerUrl ? (
                        <img
                          src={currentBannerUrl}
                          alt={displayName}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="size-full bg-gray-900/60" />
                      )}
                    </div>

                    {/* Мини-аватар */}
                    <div
                      onClick={isOwnProfile ? handleAvatarClick : undefined}
                      className={cn(
                        "absolute bottom-0 left-3.5 z-10 size-14 translate-y-1/2 overflow-hidden rounded-full border-2 border-gray-950 bg-gray-900 shadow-lg",
                        isOwnProfile && "cursor-pointer",
                      )}
                    >
                      {currentAvatarUrl ? (
                        <img
                          src={currentAvatarUrl}
                          alt={displayName}
                          className="size-full object-cover"
                        />
                      ) : (
                        <div className="flex size-full items-center justify-center bg-gray-800 text-lg font-bold text-gray-300 uppercase">
                          {displayName.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Имя и ник */}
                  <div className="min-w-0">
                    <div className="truncate text-base font-bold text-gray-100">
                      {displayName}
                    </div>
                    <div className="truncate text-xs text-gray-400">
                      u/{profileUser.username}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Чистая статистика в 2 столбика */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {/* Первая строка: Карма, Дата регистрации */}
              <div>
                <div className="text-lg font-bold text-gray-100">{karma}</div>
                <div className="text-xs text-gray-400">
                  {t("profile.karma")}
                </div>
              </div>

              <div>
                <div className="text-sm leading-7 font-medium text-gray-200">
                  {formatRegistrationDate(profileUser.createdAt, i18n.language)}
                </div>
                <div className="text-xs text-gray-400">
                  {t("profile.registration")}
                </div>
              </div>

              {/* Вторая строка: Публикации, Комментарии */}
              <div>
                <div className="text-lg font-bold text-gray-100">
                  {profileUser._count?.posts ?? posts.length}
                </div>
                <div className="text-xs text-gray-400">
                  {t("profile.publications")}
                </div>
              </div>

              <div>
                <div className="text-lg font-bold text-gray-100">
                  {profileUser._count?.comments ?? comments.length}
                </div>
                <div className="text-xs text-gray-400">
                  {t("profile.userComments")}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { ProfilePage };
