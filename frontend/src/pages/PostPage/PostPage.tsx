import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Link,
  useLoaderData,
  useNavigate,
  useSearchParams,
  type LoaderFunctionArgs,
} from "react-router";
import {
  ArrowBigUp,
  ArrowBigDown,
  Repeat2,
  Share2,
  Check,
  User as UserIcon,
  MessageSquare,
} from "lucide-react";
import { type Comment } from "@/api/client";
import { store } from "@/app/store";
import {
  postsApiSlice,
  useGetPostByIdQuery,
  useListPostCommentsQuery,
  useCreateCommentMutation,
} from "@/features/posts/postsApiSlice";
import { useMarkPostNotificationsAsReadMutation } from "@/features/notifications/notificationsApiSlice";
import { useAuth } from "@/context/AuthContext";
import { useOptimisticVote } from "@/hooks/useOptimisticVote";
import { CommentItem, type CommentNode } from "@/components/CommentItem";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { formatTimeAgo } from "@/utils/formatTimeAgo";
import { cn } from "@/utils/cn";
import { PostContent } from "@/components/PostContent/PostContent";
import { PostMediaGrid } from "@/components/PostMediaGrid/PostMediaGrid";
import { Hint } from "@/components/ui/Hint";

function buildCommentTree(comments: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>();
  comments.forEach((c) => {
    map.set(c.id, { ...c, children: [] });
  });

  const roots: CommentNode[] = [];

  comments.forEach((c) => {
    const node = map.get(c.id)!;
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

export interface PostLoaderData {
  postId: string;
}

export const postLoader = ({ params }: LoaderFunctionArgs): PostLoaderData => {
  const postId = params.postId || "";
  if (postId) {
    void store.dispatch(postsApiSlice.endpoints.getPostById.initiate(postId));
    void store.dispatch(
      postsApiSlice.endpoints.listPostComments.initiate(postId),
    );
  }

  return { postId };
};

export const PostPage = () => {
  const { postId } = useLoaderData<PostLoaderData>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetCommentId = searchParams.get("commentId");

  const { data: post = null } = useGetPostByIdQuery(postId, { skip: !postId });
  const { data: comments = [] } = useListPostCommentsQuery(postId, {
    skip: !postId,
  });
  const [createCommentMutation] = useCreateCommentMutation();
  const [markPostNotificationsAsRead] =
    useMarkPostNotificationsAsReadMutation();

  useEffect(() => {
    if (user && postId) {
      markPostNotificationsAsRead(postId);
    }
  }, [user, postId, markPostNotificationsAsRead]);

  const [commentContent, setCommentContent] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const { score, userVote, handleVote } = useOptimisticVote({
    postId: post?.id || "",
    initialScore: post ? (post.score ?? post.upvotes - post.downvotes) : 0,
    initialUserVote: post?.userVote ?? 0,
  });

  const [isCopied, setIsCopied] = useState(false);

  const commentTree = useMemo(() => {
    const roots = buildCommentTree(comments);
    if (!targetCommentId) return roots;

    function containsTarget(node: CommentNode): boolean {
      if (node.id === targetCommentId) return true;
      return node.children.some(containsTarget);
    }

    const targetRootIndex = roots.findIndex(containsTarget);
    if (targetRootIndex > 0) {
      const targetRoot = roots[targetRootIndex];
      const otherRoots = roots.filter((_, idx) => idx !== targetRootIndex);
      return [targetRoot, ...otherRoots];
    }
    return roots;
  }, [comments, targetCommentId]);

  useEffect(() => {
    if (targetCommentId) {
      const timer = setTimeout(() => {
        const el = document.getElementById(`comment-${targetCommentId}`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
      return () => clearTimeout(timer);
    } else if (window.location.hash === "#comments") {
      const timer = setTimeout(() => {
        const el = document.getElementById("comments");
        el?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [targetCommentId]);

  if (!post) {
    return (
      <div className="flex-1 py-16 text-center">
        <p className="text-xl font-semibold text-gray-300">
          {t("postPage.notFound")}
        </p>
        <Button
          variant="outline"
          size="medium"
          className="mt-4"
          onClick={() => navigate("/")}
        >
          {t("postPage.back")}
        </Button>
      </div>
    );
  }

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCreateComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      window.dispatchEvent(new CustomEvent("open-auth-modal"));
      return;
    }

    const trimmed = commentContent.trim();
    if (!trimmed || isSubmittingComment) return;

    setIsSubmittingComment(true);
    try {
      await createCommentMutation({
        postId: post.id,
        content: trimmed,
      }).unwrap();
      setCommentContent("");
    } catch {
      // Handle error
    } finally {
      setIsSubmittingComment(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 pb-20">
      {/* Main post view */}
      <article className="space-y-4 border-b border-gray-800/80 pb-6">
        {/* Author / Community info */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          {post.community && (
            <>
              <Link
                to={`/r/${post.community.name}`}
                className="font-semibold text-gray-200 hover:text-blue-400"
              >
                r/{post.community.displayName || post.community.name}
              </Link>
              <span className="text-gray-600">•</span>
            </>
          )}

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

        {/* Title */}
        <h1 className="text-2xl leading-tight font-bold text-gray-100">
          {post.title}
        </h1>

        {/* Content text */}
        {post.content && (
          <div className="mt-2">
            <PostContent content={post.content} size="base" />
          </div>
        )}

        {/* Media */}
        {Boolean(post.media?.length || post.mediaUrl) && (
          <PostMediaGrid
            media={post.media}
            singleMediaUrl={post.mediaUrl}
            className="mt-3"
          />
        )}

        {/* Actions bar */}
        <div className="flex items-center gap-2 pt-2 text-xs font-medium text-gray-200">
          <div
            className={cn(
              "flex h-8 items-center rounded-full transition-colors",
              userVote === 1
                ? "bg-orange-500/20 text-orange-400"
                : userVote === -1
                  ? "bg-blue-500/20 text-blue-400"
                  : "bg-gray-800 text-gray-200",
            )}
          >
            <button
              type="button"
              onClick={(e) => handleVote(e, 1)}
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
              onClick={(e) => handleVote(e, -1)}
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

          <Hint content={t("postPage.commentsTitle")}>
            <button
              type="button"
              onClick={() => {
                const el = document.getElementById("comments");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              aria-label={t("postPage.commentsTitle")}
              className="flex h-8 items-center gap-1.5 rounded-full bg-gray-800 px-3 font-medium text-gray-200 transition-colors hover:bg-gray-700 hover:text-white"
            >
              <MessageSquare className="size-4" />
              <span>{comments.length}</span>
            </button>
          </Hint>

          <Hint content={t("post.repost")}>
            <button
              type="button"
              aria-label={t("post.repost")}
              className="flex size-8 items-center justify-center rounded-full bg-gray-800 text-gray-200 transition-colors hover:bg-gray-700 hover:text-white"
            >
              <Repeat2 className="size-4" />
            </button>
          </Hint>

          <Hint content={isCopied ? t("post.linkCopied") : t("post.share")}>
            <button
              type="button"
              onClick={handleShare}
              aria-label={t("post.share")}
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
          </Hint>
        </div>
      </article>

      {/* Comments Section */}
      <section id="comments" className="space-y-6 pt-2">
        <div className="flex items-center gap-2">
          <MessageSquare className="size-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-100">
            {t("postPage.commentsTitle")} ({comments.length})
          </h2>
        </div>

        {/* Comment input form */}
        <form onSubmit={handleCreateComment} className="space-y-3">
          <Textarea
            rows={3}
            value={commentContent}
            onChange={(e) => setCommentContent(e.target.value)}
            placeholder={t("postPage.addCommentPlaceholder")}
            className="bg-transparent"
          />
          <div className="flex justify-end">
            <Button
              type="submit"
              variant="accent"
              size="small"
              disabled={!commentContent.trim() || isSubmittingComment}
            >
              {isSubmittingComment
                ? t("postPage.submittingComment")
                : t("postPage.submitComment")}
            </Button>
          </div>
        </form>

        {/* Comments list */}
        {comments.length === 0 ? (
          <div className="py-8 text-center text-sm text-gray-500">
            {t("postPage.emptyComments")}
          </div>
        ) : (
          <div className="space-y-2">
            {commentTree.map((rootComment) => (
              <CommentItem
                key={rootComment.id}
                comment={rootComment}
                postId={post.id}
                targetCommentId={targetCommentId}
                onReplyCreated={() => {
                  store.dispatch(
                    postsApiSlice.util.invalidateTags([
                      { type: "Comment", id: `POST_${post.id}` },
                    ]),
                  );
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
