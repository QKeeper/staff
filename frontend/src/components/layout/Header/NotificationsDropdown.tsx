import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { Bell, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { useDropdownContext } from "@/components/ui/Dropdown/DropdownContext";
import { useAuth } from "@/context/AuthContext";
import { AuthModal } from "@/components/AuthModal";
import {
  useGetNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkAsReadMutation,
  useMarkAllAsReadMutation,
} from "@/features/notifications/notificationsApiSlice";
import type { NotificationItem } from "@/api/client";
import { formatTimeAgo } from "@/utils/formatTimeAgo";
import { cn } from "@/utils/cn";

const NotificationRow = ({ item }: { item: NotificationItem }) => {
  const { closeDropdown } = useDropdownContext();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [markAsRead] = useMarkAsReadMutation();

  const handleClick = () => {
    if (!item.isRead) {
      markAsRead(item.id);
    }
    closeDropdown();

    if (item.postId) {
      if (item.community?.name) {
        navigate(`/r/${item.community.name}/posts/${item.postId}`);
      } else {
        navigate(`/posts/${item.postId}`);
      }
    }
  };

  const actorName =
    item.actor?.displayName ||
    item.actor?.username ||
    t("post.anonymousAuthor");
  const authorInitial = (actorName.charAt(0) || "U").toUpperCase();

  return (
    <div
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          handleClick();
        }
      }}
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-lg p-2.5 text-left transition-colors",
        item.isRead
          ? "hover:bg-gray-800/60"
          : "bg-blue-950/20 hover:bg-blue-900/30",
      )}
    >
      {/* Avatar */}
      <div className="relative size-9 shrink-0 overflow-hidden rounded-full border border-gray-800 bg-gray-800">
        {item.actor?.avatarUrl ? (
          <img
            src={item.actor.avatarUrl}
            alt={actorName}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-xs font-semibold text-gray-300">
            {authorInitial}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="text-xs leading-snug text-gray-200">
          <span className="font-semibold text-gray-100">
            u/{item.actor?.username || actorName}
          </span>{" "}
          {item.community?.name ? (
            <>
              <span className="text-gray-400">
                {t("notifications.newPostInCommunity")}{" "}
              </span>
              <span className="font-semibold text-blue-400">
                r/{item.community.name}
              </span>
            </>
          ) : (
            <span className="text-gray-400">{t("notifications.newPost")}</span>
          )}
        </p>

        {item.post?.title && (
          <p className="mt-1 line-clamp-1 text-xs font-medium text-gray-300">
            «{item.post.title}»
          </p>
        )}

        <div className="mt-1.5 flex items-center gap-2">
          <span className="text-[11px] text-gray-500">
            {formatTimeAgo(item.createdAt, t)}
          </span>
          {!item.isRead && (
            <span
              className="size-1.5 shrink-0 rounded-full bg-blue-500"
              title="Не прочитано"
            />
          )}
        </div>
      </div>
    </div>
  );
};

const NotificationsDropdownContent = () => {
  const { t } = useTranslation();
  const { data: notifications = [] } = useGetNotificationsQuery();
  const { data: countData } = useGetUnreadCountQuery();
  const [markAllAsRead, { isLoading: isMarkingAll }] =
    useMarkAllAsReadMutation();

  const unreadCount = countData?.unreadCount ?? 0;

  return (
    <div className="flex w-80 flex-col overflow-hidden sm:w-96">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-800/80 px-3.5 py-2.5">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gray-100">
            {t("notifications.title")}
          </span>
          {unreadCount > 0 && (
            <span className="rounded-full bg-blue-600/20 px-2 py-0.5 text-[11px] font-semibold text-blue-400">
              {unreadCount}
            </span>
          )}
        </div>

        {unreadCount > 0 && (
          <button
            type="button"
            onClick={() => markAllAsRead()}
            disabled={isMarkingAll}
            className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-200"
          >
            <CheckCheck className="size-3.5" />
            <span>{t("notifications.markAllAsRead")}</span>
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-h-[380px] divide-y divide-gray-800/40 overflow-y-auto p-1.5">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
            <div className="mb-2 flex size-10 items-center justify-center rounded-full bg-gray-800/60 text-gray-500">
              <Bell className="size-5" />
            </div>
            <p className="text-xs text-gray-400">{t("notifications.empty")}</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <NotificationRow key={notif.id} item={notif} />
          ))
        )}
      </div>
    </div>
  );
};

export const NotificationsDropdown = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [isAuthOpen, setIsAuthOpen] = useState(false);

  // Queries are skipped if not logged in
  const { data: countData } = useGetUnreadCountQuery(undefined, {
    skip: !user,
  });

  const unreadCount = user ? (countData?.unreadCount ?? 0) : 0;

  if (!user) {
    return (
      <>
        <Button
          variant="ghost"
          size="small"
          title={t("header.notifications")}
          aria-label={t("header.notifications")}
          onClick={() => setIsAuthOpen(true)}
          className="size-8 min-w-8 shrink-0 rounded-sm p-0 text-gray-50"
        >
          <Bell className="size-4" />
        </Button>
        <AuthModal open={isAuthOpen} onOpenChange={setIsAuthOpen} />
      </>
    );
  }

  return (
    <Dropdown align="end">
      <Dropdown.Trigger asChild>
        <Button
          variant="ghost"
          size="small"
          title={t("header.notifications")}
          aria-label={t("header.notifications")}
          className="relative size-8 min-w-8 shrink-0 rounded-sm p-0 text-gray-50"
        >
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white shadow-md ring-2 ring-gray-950">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </Button>
      </Dropdown.Trigger>

      <Dropdown.Content
        width="auto"
        maxHeight={460}
        className="border border-gray-800/90 p-0 shadow-2xl backdrop-blur-xl"
      >
        <NotificationsDropdownContent />
      </Dropdown.Content>
    </Dropdown>
  );
};
