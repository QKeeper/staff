import { useState, useEffect, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  useLoaderData,
  useNavigate,
  type LoaderFunctionArgs,
} from "react-router";
import {
  User as UserIcon,
  Calendar,
  FileText,
  MessageSquare,
  Sparkles,
  Camera,
  AlertCircle,
} from "lucide-react";
import {
  api,
  type Post,
  type UserComment,
  type UserProfile,
} from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { PostCard } from "@/components/PostCard";
import { UserCommentCard } from "@/components/UserCommentCard";
import { ImageCropModal } from "@/components/ImageCropModal";
import { Button } from "@/components/ui/Button";
import {
  formatDaysOnStaff,
  formatPostsCount,
  formatCommentsCount,
} from "@/utils/formatPlural";
import { cn } from "@/utils/cn";

export interface ProfileLoaderData {
  profileUser: UserProfile | null;
  username: string;
  initialPosts: Post[];
  initialComments: UserComment[];
}

export const profileLoader = async ({
  params,
}: LoaderFunctionArgs): Promise<ProfileLoaderData> => {
  const username = params.username || "";
  if (!username) {
    return {
      profileUser: null,
      username: "",
      initialPosts: [],
      initialComments: [],
    };
  }

  try {
    const [userRes, posts, comments] = await Promise.all([
      api.users.getByUsername(username),
      api.posts.list({ authorUsername: username, sort: "new" }).catch(() => []),
      api.posts.listUserComments(username).catch(() => []),
    ]);
    return {
      profileUser: userRes.user,
      username,
      initialPosts: posts,
      initialComments: comments,
    };
  } catch {
    return {
      profileUser: null,
      username,
      initialPosts: [],
      initialComments: [],
    };
  }
};

type TabType = "overview" | "posts" | "comments";

const ProfilePage = () => {
  const { profileUser, username, initialPosts, initialComments } =
    useLoaderData<ProfileLoaderData>();
  const { user, refreshUser } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [comments, setComments] = useState<UserComment[]>(initialComments);

  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(
    profileUser?.avatarUrl || null,
  );
  const [currentBannerUrl, setCurrentBannerUrl] = useState<string | null>(
    profileUser?.bannerUrl || null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [cropAvatarFile, setCropAvatarFile] = useState<File | null>(null);
  const [isAvatarCropModalOpen, setIsAvatarCropModalOpen] = useState(false);

  const [cropBannerFile, setCropBannerFile] = useState<File | null>(null);
  const [isBannerCropModalOpen, setIsBannerCropModalOpen] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const isOwnProfile = Boolean(
    user &&
    profileUser &&
    (user.id === profileUser.id ||
      user.username.toLowerCase() === profileUser.username.toLowerCase()),
  );

  useEffect(() => {
    setPosts(initialPosts);
    setComments(initialComments);
    setActiveTab("overview");
    setCurrentAvatarUrl(profileUser?.avatarUrl || null);
    setCurrentBannerUrl(profileUser?.bannerUrl || null);
    setUploadError(null);
  }, [initialPosts, initialComments, username, profileUser]);

  const handlePostVoteChange = (
    postId: string,
    newScore: number,
    newUserVote: number,
  ) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              score: newScore,
              userVote: newUserVote,
            }
          : p,
      ),
    );
  };

  const handleCommentVoteChange = (
    commentId: string,
    newScore: number,
    newUserVote: number,
  ) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === commentId
          ? {
              ...c,
              score: newScore,
              userVote: newUserVote,
            }
          : c,
      ),
    );
  };

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
    const previousAvatar = currentAvatarUrl;
    const previousPosts = posts;
    const previousComments = comments;

    // Optimistic update
    setCurrentAvatarUrl(croppedDataUrl);
    setPosts((prev) =>
      prev.map((p) => ({
        ...p,
        author: { ...p.author, avatarUrl: croppedDataUrl },
      })),
    );
    setComments((prev) =>
      prev.map((c) => ({
        ...c,
        author: { ...c.author, avatarUrl: croppedDataUrl },
      })),
    );

    try {
      const res = await api.users.updateAvatar(croppedDataUrl);
      const newAvatarUrl = res.user.avatarUrl || croppedDataUrl;
      setCurrentAvatarUrl(newAvatarUrl);
      setPosts((prev) =>
        prev.map((p) => ({
          ...p,
          author: { ...p.author, avatarUrl: newAvatarUrl },
        })),
      );
      setComments((prev) =>
        prev.map((c) => ({
          ...c,
          author: { ...c.author, avatarUrl: newAvatarUrl },
        })),
      );
      await refreshUser();
    } catch {
      setCurrentAvatarUrl(previousAvatar);
      setPosts(previousPosts);
      setComments(previousComments);
      setUploadError(t("profile.uploadError"));
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
    const previousBanner = currentBannerUrl;
    // Optimistic update
    setCurrentBannerUrl(croppedDataUrl);

    try {
      const res = await api.users.updateBanner(croppedDataUrl);
      if (res.user.bannerUrl) {
        setCurrentBannerUrl(res.user.bannerUrl);
      }
      await refreshUser();
    } catch {
      setCurrentBannerUrl(previousBanner);
      setUploadError(t("profile.uploadError"));
    }
  };

  const activities = useMemo(() => {
    const p = posts.map((post) => ({
      type: "post" as const,
      id: `post-${post.id}`,
      createdAt: post.createdAt,
      post,
    }));
    const c = comments.map((comment) => ({
      type: "comment" as const,
      id: `comment-${comment.id}`,
      createdAt: comment.createdAt,
      comment,
    }));
    return [...p, ...c].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [posts, comments]);

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
      <div className="relative mb-12 sm:mb-16 md:mb-20">
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
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
                activeTab === "overview"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-gray-200",
              )}
            >
              <Sparkles className="size-4" />
              <span>{t("profile.overview")}</span>
              <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                {activities.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("posts")}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
                activeTab === "posts"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-gray-200",
              )}
            >
              <FileText className="size-4" />
              <span>{t("profile.posts")}</span>
              <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                {posts.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("comments")}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors",
                activeTab === "comments"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-gray-200",
              )}
            >
              <MessageSquare className="size-4" />
              <span>{t("profile.comments")}</span>
              <span className="rounded-full bg-gray-800 px-2 py-0.5 text-xs text-gray-400">
                {comments.length}
              </span>
            </button>
          </div>

          {/* Контент активной вкладки */}
          <div>
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
                <div className="divide-y divide-gray-800/80">
                  {activities.map((item) =>
                    item.type === "post" ? (
                      <PostCard
                        key={item.id}
                        post={item.post}
                        onVoteChange={handlePostVoteChange}
                      />
                    ) : (
                      <UserCommentCard
                        key={item.id}
                        comment={item.comment}
                        onVoteChange={handleCommentVoteChange}
                      />
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
                <div className="divide-y divide-gray-800/80">
                  {posts.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      onVoteChange={handlePostVoteChange}
                    />
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
                <div className="divide-y divide-gray-800/80">
                  {comments.map((comment) => (
                    <UserCommentCard
                      key={comment.id}
                      comment={comment}
                      onVoteChange={handleCommentVoteChange}
                    />
                  ))}
                </div>
              ))}
          </div>
        </div>

        {/* Правая информационная колонка */}
        <div className="space-y-4 lg:col-span-1">
          <div className="sticky top-20 rounded-xl border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm">
            <h2 className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
              {t("profile.about")}
            </h2>

            <div className="mt-4 flex items-center gap-3 border-b border-gray-800/80 pb-4">
              <div className="flex size-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-blue-500/30 bg-gray-800 text-gray-300">
                {currentAvatarUrl ? (
                  <img
                    src={currentAvatarUrl}
                    alt={displayName}
                    className="size-full object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold text-gray-300 uppercase">
                    {displayName.charAt(0)}
                  </span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-gray-100">
                  {displayName}
                </div>
                <div className="truncate text-xs text-gray-400">
                  u/{profileUser.username}
                </div>
              </div>
            </div>

            {/* Вся информация перенесена вправо: регистрация, посты, комментарии */}
            <div className="mt-4 space-y-3.5 text-sm">
              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-800/80 text-gray-400">
                  <Calendar className="size-4 text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-400">
                    {t("profile.registration")}
                  </div>
                  <div className="font-medium text-gray-200">
                    {formatDaysOnStaff(profileUser.createdAt, t, i18n.language)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-800/80 text-gray-400">
                  <FileText className="size-4 text-indigo-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-400">
                    {t("profile.publications")}
                  </div>
                  <div className="font-medium text-gray-200">
                    {formatPostsCount(posts.length, t, i18n.language)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gray-800/80 text-gray-400">
                  <MessageSquare className="size-4 text-emerald-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-gray-400">
                    {t("profile.userComments")}
                  </div>
                  <div className="font-medium text-gray-200">
                    {formatCommentsCount(comments.length, t, i18n.language)}
                  </div>
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
