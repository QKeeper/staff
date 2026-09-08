import {
  api,
  communityCacheUtils,
  myCommunitiesCacheUtils,
  type Community,
  type MyCommunity,
} from "@/api/client";
import { Button } from "@/components/ui/Button";
import { Combobox, type ComboboxOption } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/context/AuthContext";
import { ArrowUpRight, Loader2, Paperclip, User, Users, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { store } from "@/app/store";
import { postsApiSlice } from "@/features/posts/postsApiSlice";

interface AttachedMediaItem {
  id: string;
  url: string;
  type: "image" | "video" | "gif";
  name: string;
}

interface DestinationItem {
  type: "profile" | "community";
  id: string;
  name: string;
  displayName?: string | null;
  description: string;
  avatarUrl?: string | null;
  topic?: string;
}

const CreatePostPage = () => {
  const { t } = useTranslation();
  const { user, isLoading: isAuthLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const communityParam = searchParams.get("community");

  // TODO: Максимально неочевидное поведение.
  // Почему незалогиненого пользователь кидадает на главную страницу
  // при нажатии на кнопку "Создать". Может его стоит кидать на авторизацию?

  // Redirect unauthenticated users
  useEffect(() => {
    if (!isAuthLoading && !user) {
      navigate("/", { replace: true });
    }
  }, [user, isAuthLoading, navigate]);

  const stateCommunity = (location.state as { community?: Community } | null)
    ?.community;

  // Resolve synchronously if available in route state or memory cache
  const initialCommunity = useMemo(() => {
    if (!communityParam) return null;
    if (
      stateCommunity &&
      (stateCommunity.name.toLowerCase() === communityParam.toLowerCase() ||
        stateCommunity.id === communityParam)
    ) {
      return stateCommunity;
    }
    return communityCacheUtils.get(communityParam) || null;
  }, [communityParam, stateCommunity]);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedDestination, setSelectedDestination] =
    useState<DestinationItem | null>(() => {
      if (initialCommunity) {
        return {
          type: "community",
          id: initialCommunity.id,
          name: initialCommunity.name,
          displayName: initialCommunity.displayName,
          description: initialCommunity.description,
          topic: initialCommunity.topic,
        };
      }
      if (user && !communityParam) {
        return {
          type: "profile",
          id: user.id,
          name: user.username,
          displayName: user.username,
          description: user.bio || "",
          avatarUrl: user.avatarUrl,
        };
      }
      return null;
    });

  // Default destination to user's profile if not already selected and no community param in URL
  useEffect(() => {
    if (!user || communityParam) return;
    setSelectedDestination((prev) => {
      if (prev) return prev;
      return {
        type: "profile",
        id: user.id,
        name: user.username,
        displayName: user.username,
        description: user.bio || "",
        avatarUrl: user.avatarUrl,
      };
    });
  }, [user, communityParam]);

  const [myCommunities, setMyCommunities] = useState<MyCommunity[]>(
    () => myCommunitiesCacheUtils.get() || [],
  );
  const [searchValue, setSearchValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [attachedMedia, setAttachedMedia] = useState<AttachedMediaItem[]>([]);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load user's communities
  useEffect(() => {
    if (!user) {
      setMyCommunities([]);
      return;
    }

    if (myCommunitiesCacheUtils.get()) {
      setMyCommunities(myCommunitiesCacheUtils.get() || []);
    }

    let isMounted = true;
    api.communities
      .getMyCommunities()
      .then((data) => {
        if (isMounted) setMyCommunities(data);
      })
      .catch(() => {
        if (isMounted) setMyCommunities([]);
      });

    return () => {
      isMounted = false;
    };
  }, [user]);

  // Handle URL prefill via ?community=name
  useEffect(() => {
    if (!communityParam) return;

    // If already preloaded synchronously or matches current destination, skip request
    if (
      selectedDestination?.type === "community" &&
      (selectedDestination.name.toLowerCase() ===
        communityParam.toLowerCase() ||
        selectedDestination.id === communityParam)
    ) {
      return;
    }

    let isMounted = true;
    api.communities
      .getByName(communityParam)
      .then((comm) => {
        if (isMounted && comm) {
          setSelectedDestination({
            type: "community",
            id: comm.id,
            name: comm.name,
            displayName: comm.displayName,
            description: comm.description,
            topic: comm.topic,
          });
        }
      })
      .catch(() => {
        // If not found by exact name, leave unselected
      });

    return () => {
      isMounted = false;
    };
  }, [communityParam, selectedDestination]);

  const defaultOptions = useMemo((): ComboboxOption<DestinationItem>[] => {
    const options: ComboboxOption<DestinationItem>[] = [];

    if (user) {
      options.push({
        value: `profile:${user.id}`,
        label: `u/${user.username}`,
        secondaryLabel: t("createPost.profileGroup"),
        group: t("createPost.profileGroup"),
        icon: <User className="size-4 text-emerald-400" />,
        data: {
          type: "profile",
          id: user.id,
          name: user.username,
          displayName: user.username,
          description: user.bio || "",
          avatarUrl: user.avatarUrl,
        },
      });
    }

    if (myCommunities.length > 0) {
      myCommunities.forEach((c) => {
        const countText = `${c.membersCount} ${t("createPost.preview.membersCount")}`;
        const subtitle = c.description
          ? `${countText} • ${c.description}`
          : countText;

        options.push({
          value: `community:${c.id}`,
          label: `r/${c.displayName || c.name}`,
          secondaryLabel: subtitle,
          group: t("createPost.myCommunitiesGroup"),
          icon: <Users className="size-4 text-blue-400" />,
          data: {
            type: "community",
            id: c.id,
            name: c.name,
            displayName: c.displayName,
            description: c.description || "",
            topic: c.topic,
          },
        });
      });
    }

    return options;
  }, [user, myCommunities, t]);

  const [serverCommunities, setServerCommunities] = useState<Community[]>([]);
  const latestSearchRef = useRef("");

  // Search communities across the entire service when typing
  useEffect(() => {
    const trimmed = searchValue.trim();
    if (!trimmed) {
      setServerCommunities([]);
      setIsSearching(false);
      latestSearchRef.current = "";
      return;
    }

    const cleanQuery = trimmed.replace(/^(\/r\/|r\/|@)/i, "").trim();
    const activeSearch = cleanQuery || trimmed;
    latestSearchRef.current = activeSearch;

    setIsSearching(true);

    const timer = setTimeout(() => {
      api.communities
        .list({ search: activeSearch, limit: 20 })
        .then((serverResults) => {
          if (latestSearchRef.current !== activeSearch) return;
          setServerCommunities(serverResults);
        })
        .catch(() => {
          if (latestSearchRef.current === activeSearch) {
            setServerCommunities([]);
          }
        })
        .finally(() => {
          if (latestSearchRef.current === activeSearch) {
            setIsSearching(false);
          }
        });
    }, 200);

    return () => {
      clearTimeout(timer);
    };
  }, [searchValue]);

  // Determine active options:
  // 1. When empty: "Мой профиль" and "Ваши сообщества" (defaultOptions)
  // 2. When searching: "Ваши сообщества" (matching) first, then other communities ("Все сообщества").
  //    Profile is NOT displayed when searching.
  const comboboxOptions = useMemo((): ComboboxOption<DestinationItem>[] => {
    const trimmed = searchValue.trim();

    if (!trimmed) {
      return defaultOptions;
    }

    const cleanQuery = trimmed
      .replace(/^(\/r\/|r\/|@)/i, "")
      .trim()
      .toLowerCase();
    const myCommunityIds = new Set(myCommunities.map((c) => c.id));
    const options: ComboboxOption<DestinationItem>[] = [];

    // 1. "Ваши сообщества" matching search query
    const matchingMyCommunityIds = new Set<string>();
    const matchingMyCommunities: MyCommunity[] = [];

    for (const c of myCommunities) {
      const q = cleanQuery;
      const matches =
        !q ||
        c.name.toLowerCase().includes(q) ||
        (c.displayName && c.displayName.toLowerCase().includes(q)) ||
        (c.description && c.description.toLowerCase().includes(q)) ||
        (c.topic && c.topic.toLowerCase().includes(q));

      if (matches) {
        matchingMyCommunityIds.add(c.id);
        matchingMyCommunities.push(c);
      }
    }

    // Include any of user's communities returned by server search
    for (const sc of serverCommunities) {
      if (myCommunityIds.has(sc.id) && !matchingMyCommunityIds.has(sc.id)) {
        const myC = myCommunities.find((c) => c.id === sc.id);
        if (myC) {
          matchingMyCommunityIds.add(myC.id);
          matchingMyCommunities.push(myC);
        }
      }
    }

    matchingMyCommunities.forEach((c) => {
      const countText = `${c.membersCount} ${t("createPost.preview.membersCount")}`;
      const subtitle = c.description
        ? `${countText} • ${c.description}`
        : countText;

      options.push({
        value: `community:${c.id}`,
        label: `r/${c.displayName || c.name}`,
        secondaryLabel: subtitle,
        group: t("createPost.myCommunitiesGroup"),
        icon: <Users className="size-4 text-blue-400" />,
        data: {
          type: "community",
          id: c.id,
          name: c.name,
          displayName: c.displayName,
          description: c.description || "",
          topic: c.topic,
        },
      });
    });

    // 2. Remaining communities ("Все сообщества") - excluding user's communities
    serverCommunities.forEach((c) => {
      if (!myCommunityIds.has(c.id)) {
        const countText = `${c.membersCount} ${t("createPost.preview.membersCount")}`;
        const subtitle = c.description
          ? `${countText} • ${c.description}`
          : countText;

        options.push({
          value: `community:${c.id}`,
          label: `r/${c.displayName || c.name}`,
          secondaryLabel: subtitle,
          group: t("createPost.allCommunitiesGroup"),
          icon: <Users className="size-4 text-blue-400" />,
          data: {
            type: "community",
            id: c.id,
            name: c.name,
            displayName: c.displayName,
            description: c.description || "",
            topic: c.topic,
          },
        });
      }
    });

    return options;
  }, [searchValue, defaultOptions, myCommunities, serverCommunities, t]);

  const selectedValue = selectedDestination
    ? `${selectedDestination.type}:${selectedDestination.id}`
    : null;

  const handleDestinationChange = (option: ComboboxOption<DestinationItem>) => {
    if (!option.data) return;

    // If it's a community from myCommunities where description might be missing, fetch details
    if (option.data.type === "community" && !option.data.description) {
      setSelectedDestination(option.data);
      api.communities
        .getByName(option.data.name)
        .then((fullComm) => {
          setSelectedDestination((prev) =>
            prev && prev.id === fullComm.id
              ? { ...prev, description: fullComm.description }
              : prev,
          );
        })
        .catch(() => {
          // Keep current
        });
    } else {
      setSelectedDestination(option.data);
    }
  };

  const handleOpenFileDialog = () => {
    setMediaError(null);
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    e.target.value = "";

    const remainingSlots = 10 - attachedMedia.length;
    if (remainingSlots <= 0) {
      setMediaError(t("createPost.errors.maxMediaLimit"));
      return;
    }

    const filesToUpload = files.slice(0, remainingSlots);
    if (files.length > remainingSlots) {
      setMediaError(t("createPost.errors.maxMediaLimitExceeded"));
    }

    const MAX_SIZE = 50 * 1024 * 1024;
    for (const file of filesToUpload) {
      if (file.size > MAX_SIZE) {
        setMediaError(t("media.fileTooLarge"));
        return;
      }
    }

    setIsUploadingMedia(true);
    try {
      const res = await api.posts.uploadMedia(filesToUpload);
      const newItems: AttachedMediaItem[] = res.map((item) => ({
        id: crypto.randomUUID(),
        url: item.url,
        type: item.type,
        name: item.name,
      }));
      setAttachedMedia((prev) => [...prev, ...newItems]);
    } catch {
      setMediaError(t("createPost.errors.uploadFailed"));
    } finally {
      setIsUploadingMedia(false);
    }
  };

  const handleRemoveMedia = (id: string) => {
    setAttachedMedia((prev) => prev.filter((item) => item.id !== id));
  };

  const canSubmit = Boolean(
    title.trim() && selectedDestination && !isUploadingMedia,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const createdPost = await api.posts.create({
        title: title.trim(),
        content: content.trim() || undefined,
        media:
          attachedMedia.length > 0
            ? attachedMedia.map((m) => ({ url: m.url, type: m.type }))
            : undefined,
        communityId:
          selectedDestination?.type === "community"
            ? selectedDestination.id
            : undefined,
        communityName:
          selectedDestination?.type === "community"
            ? selectedDestination.name
            : undefined,
      });

      store.dispatch(
        postsApiSlice.util.invalidateTags([
          { type: "Post", id: "LIST" },
          "Community",
        ]),
      );

      if (createdPost.community?.name) {
        navigate(`/r/${createdPost.community.name}/posts/${createdPost.id}`, {
          replace: true,
        });
      } else {
        navigate(`/posts/${createdPost.id}`, { replace: true });
      }
    } catch {
      setSubmitError(t("createPost.errors.serverError"));
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || !user) {
    return null;
  }

  return (
    <div className="flex-1 pb-16">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between border-b border-gray-800 pb-4">
          <h1 className="text-xl font-semibold text-gray-100">
            {t("createPost.title")}
          </h1>
        </div>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left Column: Form */}
          <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-2">
            {submitError && (
              <div className="rounded-md border border-red-800/60 bg-red-950/20 p-3 text-sm text-red-300">
                {submitError}
              </div>
            )}

            {/* 1. Destination Combobox */}
            <div>
              <Label htmlFor="post-destination">
                {t("createPost.destinationLabel")}
              </Label>
              <Combobox<DestinationItem>
                id="post-destination"
                items={comboboxOptions}
                value={selectedValue}
                onValueChange={handleDestinationChange}
                searchValue={searchValue}
                onSearchChange={setSearchValue}
                placeholder={t("createPost.destinationPlaceholder")}
                searchPlaceholder={t("createPost.searchPlaceholder")}
                emptyText={t("createPost.noCommunitiesFound")}
                isLoading={isSearching}
                width="full"
                size="medium"
              />
            </div>

            {/* 2. Title Input */}
            <div>
              <div className="flex items-center justify-between pb-1">
                <Label htmlFor="post-title" className="pb-0">
                  {t("createPost.titleLabel")}
                </Label>
                <span className="text-xs text-gray-500">
                  {title.length}/300
                </span>
              </div>
              <Input
                id="post-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={300}
                placeholder={t("createPost.titlePlaceholder")}
                className="bg-transparent"
                required
              />
            </div>

            {/* 3. Description / Content Textarea */}
            <div>
              <Label htmlFor="post-content">
                {t("createPost.contentLabel")}
              </Label>
              <Textarea
                id="post-content"
                rows={8}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={t("createPost.contentPlaceholder")}
                className="bg-transparent"
              />

              {/* Media Toolbar */}
              <div className="mt-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="small"
                    icon={<Paperclip className="size-4" />}
                    onClick={handleOpenFileDialog}
                    disabled={attachedMedia.length >= 10 || isUploadingMedia}
                  >
                    {t("createPost.attachMedia")}
                  </Button>
                  <span className="text-xs text-gray-400 select-none">
                    {attachedMedia.length}/10
                  </span>
                </div>

                {isUploadingMedia && (
                  <div className="flex items-center gap-1.5 text-xs text-orange-400">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span>{t("createPost.uploadingMedia")}</span>
                  </div>
                )}
              </div>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,video/mp4,video/webm,video/quicktime,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Media Error alert */}
              {mediaError && (
                <div className="mt-2 rounded border border-red-800/60 bg-red-950/30 p-2.5 text-xs text-red-300">
                  {mediaError}
                </div>
              )}

              {/* Attached media previews */}
              {attachedMedia.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                  {attachedMedia.map((item, idx) => (
                    <div
                      key={item.id}
                      className="group relative flex h-24 items-center justify-center overflow-hidden rounded-lg border border-gray-800 bg-black/50 sm:h-28"
                    >
                      {item.type === "video" ? (
                        <video
                          src={item.url}
                          muted
                          preload="metadata"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <img
                          src={item.url}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      )}

                      {/* Badge */}
                      <span className="absolute bottom-1.5 left-1.5 rounded bg-black/80 px-1 py-0.5 text-[9px] font-bold tracking-wider text-gray-200 uppercase select-none">
                        {item.type === "video"
                          ? "VIDEO"
                          : item.type === "gif"
                            ? "GIF"
                            : `${idx + 1}`}
                      </span>

                      {/* Remove Button */}
                      <button
                        type="button"
                        onClick={() => handleRemoveMedia(item.id)}
                        aria-label={t("createPost.removeMedia")}
                        className="absolute top-1.5 right-1.5 flex size-6 items-center justify-center rounded-full bg-black/75 text-white transition hover:bg-red-600 active:scale-95"
                      >
                        <X className="size-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 4. Footer with submit button */}
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                variant="accent"
                size="medium"
                disabled={!canSubmit || isSubmitting}
                icon={<ArrowUpRight className="size-4" />}
              >
                {isSubmitting
                  ? t("createPost.submitting")
                  : t("createPost.submitButton")}
              </Button>
            </div>
          </form>

          {/* Right Column: Community / Profile Card */}
          <div className="lg:col-span-1">
            {selectedDestination && (
              <div className="sticky top-4 rounded-md border border-gray-800 bg-gray-900/60 p-5 backdrop-blur-sm">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {selectedDestination.avatarUrl ? (
                      <img
                        src={selectedDestination.avatarUrl}
                        alt={selectedDestination.name}
                        className="size-11 shrink-0 rounded-full border border-gray-700 object-cover"
                      />
                    ) : (
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-gray-700 bg-gray-800 text-gray-300">
                        {selectedDestination.type === "community" ? (
                          <Users className="size-5 text-blue-400" />
                        ) : (
                          <User className="size-5 text-emerald-400" />
                        )}
                      </div>
                    )}
                    <div className="min-w-0">
                      <h4 className="truncate font-semibold text-gray-100">
                        {selectedDestination.type === "community"
                          ? `r/${selectedDestination.displayName || selectedDestination.name}`
                          : `u/${selectedDestination.name}`}
                      </h4>
                    </div>
                  </div>

                  {selectedDestination.description && (
                    <p className="text-sm leading-relaxed text-gray-300">
                      {selectedDestination.description}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export { CreatePostPage };
