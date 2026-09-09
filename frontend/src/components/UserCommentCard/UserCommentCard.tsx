import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router";
import {
  ArrowBigUp,
  ArrowBigDown,
  MessageSquare,
  Share2,
  Check,
  User as UserIcon,
} from "lucide-react";
import { type UserComment, api } from "@/api/client";
import { useOptimisticVote } from "@/hooks/useOptimisticVote";
import { formatTimeAgo } from "@/utils/formatTimeAgo";
import { cn } from "@/utils/cn";
import { Hint } from "@/components/ui/Hint";

export interface UserCommentCardProps {
  comment: UserComment;
  onVoteChange?: (
    commentId: string,
    newScore: number,
    newUserVote: number,
  ) => void;
}

export const UserCommentCard = ({
  comment,
  onVoteChange,
}: UserCommentCardProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isCopied, setIsCopied] = useState(false);

  const { score, userVote, handleVote } = useOptimisticVote({
    itemId: comment.id,
    initialScore: comment.score ?? comment.upvotes - comment.downvotes,
    initialUserVote: comment.userVote ?? 0,
    voteFn: api.posts.voteComment,
    onVoteChange,
  });

  const postPath = comment.post.community?.name
    ? `/r/${comment.post.community.name}/posts/${comment.postId}?commentId=${comment.id}`
    : `/posts/${comment.postId}?commentId=${comment.id}`;

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const commentUrl = `${window.location.origin}${postPath}`;
    try {
      await navigator.clipboard.writeText(commentUrl);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleNavigateToPost = () => {
    navigate(postPath);
  };

  return (
    <article
      id={`comment-${comment.id}`}
      onClick={handleNavigateToPost}
      className="cursor-pointer rounded-xl bg-transparent p-4 transition-colors hover:bg-gray-900/75"
    >
      {/* 1. Название сообщества и заголовок поста */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-400">
        {comment.post.community ? (
          <>
            <Link
              to={`/r/${comment.post.community.name}`}
              onClick={(e) => e.stopPropagation()}
              className="font-bold text-gray-200 transition-colors hover:text-blue-400 hover:underline"
            >
              r/
              {comment.post.community.displayName ||
                comment.post.community.name}
            </Link>
            <span className="text-gray-600">•</span>
          </>
        ) : null}
        <Link
          to={postPath}
          onClick={(e) => e.stopPropagation()}
          className="line-clamp-1 font-medium text-gray-300 transition-colors hover:text-white hover:underline"
        >
          {comment.post.title}
        </Link>
      </div>

      {/* 2. Имя комментатора и относительное время */}
      <div className="mt-2 flex items-center gap-2 text-xs text-gray-400">
        <div className="flex size-5 shrink-0 items-center justify-center rounded-full bg-gray-800 text-gray-300">
          {comment.author.avatarUrl ? (
            <img
              src={comment.author.avatarUrl}
              alt={comment.author.username}
              className="size-full rounded-full object-cover"
            />
          ) : (
            <UserIcon className="size-3 text-gray-400" />
          )}
        </div>
        <span className="font-medium text-gray-300">
          {comment.author.displayName || comment.author.username}
        </span>
        <span className="text-gray-600">•</span>
        <span className="text-gray-400">
          {t("profile.commented")} {formatTimeAgo(comment.createdAt, t)}
        </span>
      </div>

      {/* 3. Текст комментария */}
      <div className="mt-2 text-sm leading-relaxed whitespace-pre-line text-gray-200">
        {comment.content}
      </div>

      {/* 4. Панель действий: голосование, ответить, поделиться */}
      <div className="mt-3 flex items-center gap-2 text-xs font-medium text-gray-300">
        {/* Апвоуты */}
        <div
          className={cn(
            "flex h-7 items-center rounded-full transition-colors",
            userVote === 1
              ? "bg-orange-500/20 text-orange-400"
              : userVote === -1
                ? "bg-blue-500/20 text-blue-400"
                : "bg-gray-800/80 text-gray-300",
          )}
        >
          <button
            type="button"
            onClick={(e) => handleVote(e, 1)}
            aria-label={t("post.upvote")}
            className={cn(
              "flex h-7 w-6 items-center justify-center rounded-l-full transition-colors",
              userVote === 1
                ? "hover:bg-orange-500/30"
                : "hover:bg-gray-700 hover:text-orange-400",
            )}
          >
            <ArrowBigUp
              className={cn("size-3.5", userVote === 1 && "fill-current")}
            />
          </button>
          <span
            className={cn(
              "flex h-7 min-w-4 items-center justify-center px-1 text-center text-xs leading-none font-medium whitespace-nowrap tabular-nums select-none",
              userVote === 1 && "text-orange-400",
              userVote === -1 && "text-blue-400",
              userVote === 0 && "text-gray-300",
            )}
          >
            {score}
          </span>
          <button
            type="button"
            onClick={(e) => handleVote(e, -1)}
            aria-label={t("post.downvote")}
            className={cn(
              "flex h-7 w-6 items-center justify-center rounded-r-full transition-colors",
              userVote === -1
                ? "hover:bg-blue-500/30"
                : "hover:bg-gray-700 hover:text-blue-400",
            )}
          >
            <ArrowBigDown
              className={cn("size-3.5", userVote === -1 && "fill-current")}
            />
          </button>
        </div>

        {/* Кнопка Ответить */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleNavigateToPost();
          }}
          className="flex h-7 items-center gap-1.5 rounded-full bg-gray-800/80 px-2.5 transition-colors hover:bg-gray-700 hover:text-white"
        >
          <MessageSquare className="size-3.5" />
          <span>{t("profile.reply")}</span>
        </button>

        {/* Кнопка Поделиться */}
        <Hint content={isCopied ? t("post.linkCopied") : t("post.share")}>
          <button
            type="button"
            onClick={handleShare}
            aria-label={t("post.share")}
            className={cn(
              "flex size-7 items-center justify-center rounded-full transition-colors",
              isCopied
                ? "bg-emerald-500/20 text-emerald-400"
                : "bg-gray-800/80 text-gray-300 hover:bg-gray-700 hover:text-white",
            )}
          >
            {isCopied ? (
              <Check className="size-3.5" />
            ) : (
              <Share2 className="size-3.5" />
            )}
          </button>
        </Hint>
      </div>
    </article>
  );
};
