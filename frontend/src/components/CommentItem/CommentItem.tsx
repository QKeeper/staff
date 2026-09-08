import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  User as UserIcon,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ArrowBigUp,
  ArrowBigDown,
} from "lucide-react";
import { type Comment, api } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { useOptimisticVote } from "@/hooks/useOptimisticVote";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { formatTimeAgo } from "@/utils/formatTimeAgo";
import { cn } from "@/utils/cn";

export interface CommentNode extends Comment {
  children: CommentNode[];
}

export interface CommentItemProps {
  comment: CommentNode;
  postId: string;
  targetCommentId?: string | null;
  onReplyCreated: (reply: Comment) => void;
  onVoteChange?: (
    commentId: string,
    newScore: number,
    newUserVote: number,
  ) => void;
  level?: number;
}

// Helper to recursively count all descendant replies in the subtree
function countTotalReplies(node: CommentNode): number {
  return node.children.reduce(
    (acc, child) => acc + 1 + countTotalReplies(child),
    0,
  );
}

// Helper to check if targetCommentId is within this node's subtree
function hasTargetInSubtree(
  node: CommentNode,
  targetId: string | null,
): boolean {
  if (!targetId) return false;
  if (node.id === targetId) return true;
  return node.children.some((child) => hasTargetInSubtree(child, targetId));
}

export const CommentItem = ({
  comment,
  postId,
  targetCommentId,
  onReplyCreated,
  onVoteChange,
  level = 0,
}: CommentItemProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  const containsTarget = hasTargetInSubtree(comment, targetCommentId ?? null);

  // By default, threads are collapsed unless target comment is inside this branch
  const [isCollapsed, setIsCollapsed] = useState(() => !containsTarget);
  const [isReplying, setIsReplying] = useState(false);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);

  useEffect(() => {
    if (containsTarget) {
      setIsCollapsed(false);
    }
  }, [containsTarget]);

  const { score, userVote, handleVote } = useOptimisticVote({
    itemId: comment.id,
    initialScore: comment.score ?? comment.upvotes - comment.downvotes,
    initialUserVote: comment.userVote ?? 0,
    voteFn: api.posts.voteComment,
    onVoteChange,
  });

  const handleOpenReply = () => {
    if (!user) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      return;
    }
    setIsReplying((prev) => !prev);
  };

  const handleCancelReply = () => {
    setIsReplying(false);
    setReplyContent("");
  };

  const handleSubmitReply = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = replyContent.trim();
    if (!content || isSubmittingReply) return;

    setIsSubmittingReply(true);
    try {
      const newComment = await api.posts.createComment(
        postId,
        content,
        comment.id,
      );
      onReplyCreated(newComment);
      setReplyContent("");
      setIsReplying(false);
      // Auto expand branch so user sees their new reply
      setIsCollapsed(false);
    } catch {
      // Error handled by apiFetch
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const isTarget = comment.id === targetCommentId;
  const hasReplies = comment.children.length > 0;
  const totalRepliesCount = useMemo(
    () => countTotalReplies(comment),
    [comment],
  );

  return (
    <div
      id={`comment-${comment.id}`}
      className={cn(
        "rounded-lg p-4 transition-colors",
        isTarget ? "bg-white/[0.06]" : "bg-transparent",
      )}
    >
      {/* 1. Автор и дата */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
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
          {comment.author.displayName ||
            comment.author.username ||
            t("post.anonymousAuthor")}
        </span>
        <span className="text-gray-600">•</span>
        <time className="text-gray-500" dateTime={comment.createdAt}>
          {formatTimeAgo(comment.createdAt, t)}
        </time>
      </div>

      {/* 2. Текст комментария */}
      <div className="mt-2 text-sm leading-relaxed whitespace-pre-line text-gray-200">
        {comment.content}
      </div>

      {/* 3. Действия: Апвоут / Ответить / Раскрыть ветку */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs font-medium text-gray-300">
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
          onClick={handleOpenReply}
          className="flex h-7 items-center gap-1.5 rounded-full bg-gray-800/80 px-2.5 transition-colors hover:bg-gray-700 hover:text-white"
        >
          <MessageSquare className="size-3.5" />
          <span>{t("postPage.reply")}</span>
        </button>

        {/* Кнопка Показать/Скрыть ответы */}
        {hasReplies && (
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="flex h-7 items-center gap-1 rounded-full px-2.5 text-xs text-blue-400 transition-colors hover:bg-blue-500/10 hover:text-blue-300"
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="size-3.5" />
                <span>
                  {t("postPage.showReplies", {
                    count: totalRepliesCount,
                  })}
                </span>
              </>
            ) : (
              <>
                <ChevronUp className="size-3.5" />
                <span>{t("postPage.hideReplies")}</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* 4. Инлайн форма ответа */}
      {isReplying && (
        <form onSubmit={handleSubmitReply} className="mt-3 space-y-2">
          <Textarea
            rows={2}
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            placeholder={t("postPage.replyPlaceholder")}
            className="bg-transparent"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="small"
              onClick={handleCancelReply}
            >
              {t("postPage.cancelReply")}
            </Button>
            <Button
              type="submit"
              variant="accent"
              size="small"
              disabled={!replyContent.trim() || isSubmittingReply}
            >
              {isSubmittingReply
                ? t("postPage.submittingComment")
                : t("postPage.reply")}
            </Button>
          </div>
        </form>
      )}

      {/* 5. Дочерние комментарии (ветка ответов) */}
      {!isCollapsed && hasReplies && (
        <div className="mt-2 ml-2 space-y-2 border-l border-gray-800/80 pl-3 sm:ml-4">
          {comment.children.map((child) => (
            <CommentItem
              key={child.id}
              comment={child}
              postId={postId}
              targetCommentId={targetCommentId}
              onReplyCreated={onReplyCreated}
              onVoteChange={onVoteChange}
              level={level + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
