import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import {
  ArrowBigUp,
  ArrowBigDown,
  Repeat2,
  Share2,
  Check,
  User as UserIcon,
  MessageSquare,
} from "lucide-react";
import { type Post } from "@/api/client";
import { useOptimisticVote } from "@/hooks/useOptimisticVote";
import { formatTimeAgo } from "@/utils/formatTimeAgo";
import { cn } from "@/utils/cn";
import { PostMediaGrid } from "../PostMediaGrid/PostMediaGrid";
import { PostContent } from "../PostContent/PostContent";

export interface PostCardProps {
  post: Post;
  onVoteChange?: (
    postId: string,
    newScore: number,
    newUserVote: number,
  ) => void;
}

export const PostCard = ({ post, onVoteChange }: PostCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const { score, userVote, handleVote } = useOptimisticVote({
    postId: post.id,
    initialScore: post.score ?? post.upvotes - post.downvotes,
    initialUserVote: post.userVote ?? 0,
    onVoteChange,
  });

  const [isCopied, setIsCopied] = useState(false);

  const postPath = post.community?.name
    ? `/r/${post.community.name}/posts/${post.id}`
    : `/posts/${post.id}`;

  const handleCardClick = (e: React.MouseEvent) => {
    // If the click originated from an interactive button or media, ignore
    const target = e.target as HTMLElement | null;
    if (target?.closest("button, video, audio")) {
      return;
    }
    // If the user is selecting text, do not navigate
    const selection = window.getSelection();
    if (selection && selection.toString().trim().length > 0) {
      return;
    }
    navigate(postPath);
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const postUrl = `${window.location.origin}${postPath}`;
    try {
      await navigator.clipboard.writeText(postUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleRepost = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <article
      id={`post-${post.id}`}
      onClick={handleCardClick}
      className="cursor-pointer rounded-xl bg-transparent p-4 transition-colors hover:bg-gray-900/75"
    >
      {/* 1. Имя пользователя, относительное время публикации */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gray-800 text-gray-300">
          {post.author.avatarUrl ? (
            <img
              src={post.author.avatarUrl}
              alt={post.author.username}
              className="size-full rounded-full object-cover"
            />
          ) : (
            <UserIcon className="size-3 text-gray-400" />
          )}
        </div>
        <span className="font-medium text-gray-300">
          {post.author.displayName ||
            post.author.username ||
            t("post.anonymousAuthor")}
        </span>
        <span className="text-gray-600">•</span>
        <time className="text-gray-500" dateTime={post.createdAt}>
          {formatTimeAgo(post.createdAt, t)}
        </time>
      </div>

      {/* 2. Заголовок поста (растянут по всей ширине для клика и колёсика) */}
      <div className="mt-2">
        <h2 className="text-lg font-semibold text-gray-100">
          <Link
            to={postPath}
            className="block w-full text-inherit hover:text-inherit"
          >
            {post.title}
          </Link>
        </h2>
      </div>

      {/* 3. Описание */}
      {post.content && (
        <div className="mt-2">
          <PostContent content={post.content} size="sm" />
        </div>
      )}

      {/* 4. Медиа превью */}
      {Boolean(post.media?.length || post.mediaUrl) && (
        <div onClick={(e) => e.stopPropagation()}>
          <PostMediaGrid
            media={post.media}
            singleMediaUrl={post.mediaUrl}
            className="mt-3"
          />
        </div>
      )}

      {/* 5. Апвоуты, даунвоуты, комментарии, репосты, поделиться */}
      <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
        {/* Vote controls */}
        <div
          className={cn(
            "flex h-8 items-center rounded-full text-xs font-medium transition-colors",
            userVote === 1
              ? "bg-orange-500/20 text-orange-400"
              : userVote === -1
                ? "bg-blue-500/20 text-blue-400"
                : "bg-gray-800 text-gray-200",
          )}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleVote(e, 1);
            }}
            aria-label={t("post.upvote")}
            className={cn(
              "flex h-8 w-7 items-center justify-center rounded-l-full transition-colors",
              userVote === 1
                ? "hover:bg-orange-500/30"
                : "hover:bg-gray-700 hover:text-orange-400",
            )}
          >
            <ArrowBigUp
              className={cn("size-4", userVote === 1 && "fill-current")}
            />
          </button>
          <span
            className={cn(
              "flex h-8 min-w-5 items-center justify-center px-1 text-center leading-none font-medium whitespace-nowrap tabular-nums select-none",
              userVote === 1 && "text-orange-400",
              userVote === -1 && "text-blue-400",
              userVote === 0 && "text-gray-200",
            )}
          >
            {score}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleVote(e, -1);
            }}
            aria-label={t("post.downvote")}
            className={cn(
              "flex h-8 w-7 items-center justify-center rounded-r-full transition-colors",
              userVote === -1
                ? "hover:bg-blue-500/30"
                : "hover:bg-gray-700 hover:text-blue-400",
            )}
          >
            <ArrowBigDown
              className={cn("size-4", userVote === -1 && "fill-current")}
            />
          </button>
        </div>

        {/* Comments button */}
        <Link
          to={`${postPath}#comments`}
          onClick={(e) => e.stopPropagation()}
          aria-label={t("postPage.commentsTitle")}
          title={t("postPage.commentsTitle")}
          className="flex h-8 items-center gap-1.5 rounded-full bg-gray-800 px-3 font-medium text-gray-200 transition-colors hover:bg-gray-700 hover:text-white"
        >
          <MessageSquare className="size-4" />
          <span>{post.commentsCount ?? 0}</span>
        </Link>

        {/* Repost button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleRepost(e);
          }}
          aria-label={t("post.repost")}
          title={t("post.repost")}
          className="flex size-8 items-center justify-center rounded-full bg-gray-800 text-gray-200 transition-colors hover:bg-gray-700 hover:text-white"
        >
          <Repeat2 className="size-4" />
        </button>

        {/* Share button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleShare(e);
          }}
          aria-label={t("post.share")}
          title={t("post.share")}
          className={cn(
            "flex size-8 items-center justify-center rounded-full transition-colors",
            isCopied
              ? "bg-emerald-500/20 text-emerald-400"
              : "bg-gray-800 text-gray-200 hover:bg-gray-700 hover:text-white",
          )}
        >
          {isCopied ? (
            <Check className="size-4" />
          ) : (
            <Share2 className="size-4" />
          )}
        </button>
      </div>
    </article>
  );
};
