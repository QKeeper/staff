import { api, type Community, type MyCommunity } from "@/api/client";
import { Button } from "@/components/ui/Button";
import { Combobox, type ComboboxOption } from "@/components/ui/Combobox";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/context/AuthContext";
import { ArrowUpRight, CheckCircle2, User, Users } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router";

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

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [selectedDestination, setSelectedDestination] =
    useState<DestinationItem | null>(() => {
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

  const [myCommunities, setMyCommunities] = useState<MyCommunity[]>([]);
  const [searchValue, setSearchValue] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // Load user's communities
  useEffect(() => {
    if (!user) {
      setMyCommunities([]);
      return;
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
  }, [communityParam]);

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

  const canSubmit = Boolean(title.trim() && selectedDestination);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsSubmitted(true);
  };

  const handleReset = () => {
    setTitle("");
    setContent("");
    setIsSubmitted(false);
    if (user && !communityParam) {
      setSelectedDestination({
        type: "profile",
        id: user.id,
        name: user.username,
        displayName: user.username,
        description: user.bio || "",
        avatarUrl: user.avatarUrl,
      });
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

        {isSubmitted ? (
          <div className="rounded-md border border-emerald-900/60 bg-emerald-950/20 p-8 text-center backdrop-blur-sm">
            <CheckCircle2 className="mx-auto mb-3 size-12 text-emerald-400" />
            <h2 className="text-xl font-semibold text-gray-100">
              {t("createPost.successNotification")}
            </h2>
            <p className="mt-2 text-sm text-gray-400">{title}</p>
            <div className="mt-6 flex justify-center gap-3">
              <Button variant="accent" size="medium" onClick={handleReset}>
                {t("createPost.title")}
              </Button>
              <Button
                variant="outline"
                size="medium"
                onClick={() =>
                  selectedDestination?.type === "community"
                    ? navigate(`/r/${selectedDestination.name}`)
                    : navigate("/")
                }
              >
                {selectedDestination?.type === "community"
                  ? `r/${selectedDestination.name}`
                  : t("sidebar.home")}
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left Column: Form */}
            <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-2">
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
              </div>

              {/* 4. Footer with submit button */}
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  variant="accent"
                  size="medium"
                  disabled={!canSubmit}
                  icon={<ArrowUpRight className="size-4" />}
                >
                  {t("createPost.submitButton")}
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
        )}
      </div>
    </div>
  );
};

export { CreatePostPage };
