import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Link,
  useLoaderData,
  useNavigate,
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
import { api, type Comment, type Post } from "@/api/client";
import { useAuth } from "@/context/AuthContext";
import { useOptimisticVote } from "@/hooks/useOptimisticVote";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { formatTimeAgo } from "@/utils/formatTimeAgo";
import { cn } from "@/utils/cn";

export interface PostLoaderData {
  post: Post | null;
  initialComments: Comment[];
}

export const postLoader = async ({
  params,
}: LoaderFunctionArgs): Promise<PostLoaderData> => {
  const postId = params.postId || "";
  if (!postId) {
    return { post: null, initialComments: [] };
  }

  try {
    const [post, initialComments] = await Promise.all([
      api.posts.getById(postId),
      api.posts.listComments(postId).catch(() => []),
    ]);
    return { post, initialComments };
  } catch {
    return { post: null, initialComments: [] };
  }
};

export const PostPage = () => {
  const { post: initialPost, initialComments } =
    useLoaderData<PostLoaderData>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState<Post | null>(initialPost);
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [commentContent, setCommentContent] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const { score, userVote, handleVote } = useOptimisticVote({
    postId: post?.id || "",
    initialScore: initialPost
      ? (initialPost.score ?? initialPost.upvotes - initialPost.downvotes)
      : 0,
    initialUserVote: initialPost?.userVote ?? 0,
  });

  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    setPost(initialPost);
    setComments(initialComments);
  }, [initialPost, initialComments]);

  useEffect(() => {
    if (window.location.hash === "#comments") {
      const timer = setTimeout(() => {
        const el = document.getElementById("comments");
        el?.scrollIntoView({ behavior: "smooth" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, []);

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
      const newComment = await api.posts.createComment(post.id, trimmed);
      setComments((prev) => [...prev, newComment]);
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
            u/{post.author.username || t("post.anonymousAuthor")}
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
          <div className="text-base leading-relaxed whitespace-pre-line text-gray-200">
            {post.content}
          </div>
        )}

        {/* Media */}
        {post.mediaUrl && (
          <div className="overflow-hidden rounded-lg border border-gray-800 bg-black/40">
            <img
              src={post.mediaUrl}
              alt={post.title}
              className="max-h-[700px] w-auto max-w-full object-contain"
            />
          </div>
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

          <button
            type="button"
            onClick={() => {
              const el = document.getElementById("comments");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            aria-label={t("postPage.commentsTitle")}
            title={t("postPage.commentsTitle")}
            className="flex h-8 items-center gap-1.5 rounded-full bg-gray-800 px-3 font-medium text-gray-200 transition-colors hover:bg-gray-700 hover:text-white"
          >
            <MessageSquare className="size-4" />
            <span>{comments.length}</span>
          </button>

          <button
            type="button"
            aria-label={t("post.repost")}
            title={t("post.repost")}
            className="flex size-8 items-center justify-center rounded-full bg-gray-800 text-gray-200 transition-colors hover:bg-gray-700 hover:text-white"
          >
            <Repeat2 className="size-4" />
          </button>

          <button
            type="button"
            onClick={handleShare}
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
          <div className="space-y-4 divide-y divide-gray-800/60">
            {comments.map((comment) => (
              <div key={comment.id} className="pt-4 first:pt-0">
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
                    u/{comment.author.username || t("post.anonymousAuthor")}
                  </span>
                  <span className="text-gray-600">•</span>
                  <time className="text-gray-500" dateTime={comment.createdAt}>
                    {formatTimeAgo(comment.createdAt, t)}
                  </time>
                </div>
                <div className="mt-2 text-sm leading-relaxed whitespace-pre-line text-gray-200">
                  {comment.content}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
