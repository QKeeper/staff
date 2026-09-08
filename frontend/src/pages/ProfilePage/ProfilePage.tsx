import { useState, useEffect, useMemo } from "react";
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
} from "lucide-react";
import {
  api,
  type Post,
  type UserComment,
  type UserProfile,
} from "@/api/client";
import { PostCard } from "@/components/PostCard";
import { UserCommentCard } from "@/components/UserCommentCard";
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
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [comments, setComments] = useState<UserComment[]>(initialComments);

  useEffect(() => {
    setPosts(initialPosts);
    setComments(initialComments);
    setActiveTab("overview");
  }, [initialPosts, initialComments, username]);

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
      {/* 1. Карточка профиля */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/60 p-6 backdrop-blur-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          {/* Аватар */}
          <div className="flex size-20 shrink-0 items-center justify-center rounded-full border-2 border-blue-500/30 bg-gray-800 text-gray-300">
            {profileUser.avatarUrl ? (
              <img
                src={profileUser.avatarUrl}
                alt={profileUser.username}
                className="size-full rounded-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold text-gray-300 uppercase">
                {displayName.charAt(0)}
              </span>
            )}
          </div>

          {/* Имена и метаданные */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-2">
              <h1 className="text-2xl font-bold text-gray-100 sm:text-3xl">
                {displayName}
              </h1>
              <span className="text-sm font-medium text-gray-400">
                u/{profileUser.username}
              </span>
            </div>

            {profileUser.bio && (
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-300">
                {profileUser.bio}
              </p>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-400">
              <div className="flex items-center gap-1.5">
                <Calendar className="size-3.5 text-gray-500" />
                <span>
                  {formatDaysOnStaff(profileUser.createdAt, t, i18n.language)}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <FileText className="size-3.5 text-gray-500" />
                <span>{formatPostsCount(posts.length, t, i18n.language)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <MessageSquare className="size-3.5 text-gray-500" />
                <span>
                  {formatCommentsCount(comments.length, t, i18n.language)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Навигация по вкладкам (Tabs) */}
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

      {/* 3. Контент активной вкладки */}
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
  );
};

export { ProfilePage };
