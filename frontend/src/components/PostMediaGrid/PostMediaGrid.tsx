import { cn } from "@/utils/cn";
import { Play } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { CustomVideoPlayer } from "../CustomVideoPlayer/CustomVideoPlayer";
import { MediaLightbox } from "../MediaLightbox/MediaLightbox";

export interface MediaGridItem {
  id?: string;
  url: string;
  type: "image" | "video" | "gif";
  order?: number;
}

interface PostMediaGridProps {
  media?: MediaGridItem[];
  singleMediaUrl?: string | null;
  className?: string;
}

export const PostMediaGrid: React.FC<PostMediaGridProps> = ({
  media,
  singleMediaUrl,
  className,
}) => {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [ratios, setRatios] = useState<Record<number, number>>({});

  // Normalize items
  const items: MediaGridItem[] = useMemo(() => {
    if (media && media.length > 0) {
      return [...media].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    }
    if (singleMediaUrl) {
      const isVideo =
        singleMediaUrl.endsWith(".mp4") ||
        singleMediaUrl.endsWith(".webm") ||
        singleMediaUrl.endsWith(".mov");
      const isGif = singleMediaUrl.endsWith(".gif");
      return [
        {
          url: singleMediaUrl,
          type: isVideo ? "video" : isGif ? "gif" : "image",
        },
      ];
    }
    return [];
  }, [media, singleMediaUrl]);

  // Preload and measure aspect ratios for adaptive VK layout
  useEffect(() => {
    items.forEach((item, index) => {
      if (item.type === "video") {
        const vid = document.createElement("video");
        vid.src = item.url;
        vid.preload = "metadata";
        vid.onloadedmetadata = () => {
          if (vid.videoWidth && vid.videoHeight) {
            setRatios((prev) => ({
              ...prev,
              [index]: vid.videoWidth / vid.videoHeight,
            }));
          }
        };
      } else {
        const img = new Image();
        img.src = item.url;
        img.onload = () => {
          if (img.naturalWidth && img.naturalHeight) {
            setRatios((prev) => ({
              ...prev,
              [index]: img.naturalWidth / img.naturalHeight,
            }));
          }
        };
      }
    });
  }, [items]);

  if (items.length === 0) return null;

  const handleTileClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setLightboxIndex(index);
  };

  // Helper to render a single tile in multi-item grids
  const renderTile = (
    item: MediaGridItem,
    index: number,
    customClass = "",
    style?: React.CSSProperties,
  ) => {
    return (
      <div
        key={item.url + index}
        onClick={(e) => handleTileClick(index, e)}
        style={style}
        className={cn(
          "group relative flex cursor-pointer items-center justify-center overflow-hidden bg-black/40",
          customClass,
        )}
      >
        {item.type === "video" ? (
          <>
            <video
              src={item.url}
              muted
              playsInline
              preload="metadata"
              onLoadedMetadata={(e) => {
                const { videoWidth, videoHeight } = e.currentTarget;
                if (videoWidth && videoHeight && !ratios[index]) {
                  setRatios((prev) => ({
                    ...prev,
                    [index]: videoWidth / videoHeight,
                  }));
                }
              }}
              className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors group-hover:bg-black/20">
              <div className="flex size-11 items-center justify-center rounded-full bg-white/25 text-white shadow-md backdrop-blur-md transition-transform group-hover:scale-110">
                <Play className="ml-0.5 size-5 fill-white" />
              </div>
            </div>
            <span className="absolute bottom-2 left-2 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase backdrop-blur-sm select-none">
              Video
            </span>
          </>
        ) : (
          <>
            <img
              src={item.url}
              alt=""
              loading="lazy"
              onLoad={(e) => {
                const { naturalWidth, naturalHeight } = e.currentTarget;
                if (naturalWidth && naturalHeight && !ratios[index]) {
                  setRatios((prev) => ({
                    ...prev,
                    [index]: naturalWidth / naturalHeight,
                  }));
                }
              }}
              className="absolute inset-0 h-full w-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
            />
            {item.type === "gif" && (
              <span className="absolute bottom-2 left-2 rounded bg-black/75 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider text-white uppercase backdrop-blur-sm select-none">
                GIF
              </span>
            )}
          </>
        )}
      </div>
    );
  };

  const renderGridContent = () => {
    const count = items.length;

    // 1 item: full width across the feed, 100% natural proportional scaling on resize
    if (count === 1) {
      const single = items[0];
      if (single.type === "video") {
        return (
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full overflow-hidden rounded-xl border border-gray-800 bg-black/40"
          >
            <CustomVideoPlayer src={single.url} />
          </div>
        );
      }
      return (
        <div
          onClick={(e) => handleTileClick(0, e)}
          className="w-full cursor-pointer overflow-hidden rounded-xl"
        >
          <img
            src={single.url}
            alt=""
            loading="lazy"
            className="h-auto w-full rounded-xl object-cover object-center transition-transform duration-300 hover:scale-[1.008]"
          />
        </div>
      );
    }

    // 2 items: 2 equal columns where cell aspect ratio is preserved on screen resize
    if (count === 2) {
      const ratioValues = [ratios[0], ratios[1]].filter(
        (r): r is number => typeof r === "number" && r > 0,
      );
      const cellRatio =
        ratioValues.length > 0
          ? Math.min(1.8, Math.max(0.75, Math.max(...ratioValues)))
          : 1.25;

      return (
        <div className="grid grid-cols-2 gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
          {items.map((it, idx) =>
            renderTile(it, idx, "w-full min-h-0 min-w-0", {
              aspectRatio: `${cellRatio}`,
            }),
          )}
        </div>
      );
    }

    // 3 items: adaptive VK layout with strict aspect-ratio preservation
    if (count === 3) {
      const r0 = ratios[0] ?? 1;

      // If first item is distinctly wide landscape (e.g. 16:9 banner)
      if (r0 >= 1.45) {
        return (
          <div className="flex aspect-[16/10] w-full flex-col gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
            <div className="h-[56%] min-h-0 w-full">
              {renderTile(items[0], 0, "h-full w-full")}
            </div>
            <div className="flex h-[44%] min-h-0 w-full flex-row gap-1.5">
              {renderTile(items[1], 1, "h-full flex-1 min-w-0")}
              {renderTile(items[2], 2, "h-full flex-1 min-w-0")}
            </div>
          </div>
        );
      }

      // If first item is distinctly tall portrait (e.g. 9:16 mobile photo)
      if (r0 <= 0.75) {
        return (
          <div className="flex aspect-[4/3] w-full flex-row gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
            <div className="h-full w-[58%] min-w-0">
              {renderTile(items[0], 0, "h-full w-full")}
            </div>
            <div className="flex h-full w-[42%] min-w-0 flex-col gap-1.5">
              {renderTile(items[1], 1, "w-full flex-1 min-h-0")}
              {renderTile(items[2], 2, "w-full flex-1 min-h-0")}
            </div>
          </div>
        );
      }

      // Default VK layout for square / balanced 3 items: 3 equal columns with proportional aspect ratio
      return (
        <div className="grid aspect-[2.3/1] w-full grid-cols-3 grid-rows-1 gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
          {items.map((it, idx) =>
            renderTile(it, idx, "h-full w-full min-h-0 min-w-0"),
          )}
        </div>
      );
    }

    // 4 items: 2x2 grid where cell height equals minimum height of all items
    if (count === 4) {
      const r0 = ratios[0] ?? 1;
      if (r0 >= 1.7) {
        return (
          <div className="flex aspect-[16/10] w-full flex-col gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
            <div className="h-[55%] min-h-0 w-full">
              {renderTile(items[0], 0, "h-full w-full")}
            </div>
            <div className="grid h-[45%] min-h-0 w-full grid-cols-3 grid-rows-1 gap-1.5">
              {items
                .slice(1, 4)
                .map((it, idx) =>
                  renderTile(it, idx + 1, "h-full w-full min-h-0 min-w-0"),
                )}
            </div>
          </div>
        );
      }

      // Calculate cell aspect ratio based on maximum ratio (minimum height)
      const ratioValues = [ratios[0], ratios[1], ratios[2], ratios[3]].filter(
        (r): r is number => typeof r === "number" && r > 0,
      );
      const cellRatio =
        ratioValues.length > 0
          ? Math.min(1.8, Math.max(0.8, Math.max(...ratioValues)))
          : 1.33;

      return (
        <div className="grid grid-cols-2 gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
          {items.map((it, idx) =>
            renderTile(it, idx, "w-full min-h-0 min-w-0", {
              aspectRatio: `${cellRatio}`,
            }),
          )}
        </div>
      );
    }

    // 5 items: 1 top + 4 bottom if first is panoramic, otherwise 2 on top, 3 on bottom
    if (count === 5) {
      const r0 = ratios[0] ?? 1;
      if (r0 >= 1.5) {
        return (
          <div className="flex aspect-[16/10] w-full flex-col gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
            <div className="h-[52%] min-h-0 w-full">
              {renderTile(items[0], 0, "h-full w-full")}
            </div>
            <div className="grid h-[48%] min-h-0 w-full grid-cols-4 grid-rows-1 gap-1.5">
              {items
                .slice(1, 5)
                .map((it, idx) =>
                  renderTile(it, idx + 1, "h-full w-full min-h-0 min-w-0"),
                )}
            </div>
          </div>
        );
      }
      return (
        <div className="flex aspect-[16/10] w-full flex-col gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
          <div className="grid h-1/2 min-h-0 grid-cols-2 grid-rows-1 gap-1.5">
            {items
              .slice(0, 2)
              .map((it, idx) =>
                renderTile(it, idx, "h-full w-full min-h-0 min-w-0"),
              )}
          </div>
          <div className="grid h-1/2 min-h-0 grid-cols-3 grid-rows-1 gap-1.5">
            {items
              .slice(2, 5)
              .map((it, idx) =>
                renderTile(it, idx + 2, "h-full w-full min-h-0 min-w-0"),
              )}
          </div>
        </div>
      );
    }

    // 6 items: 3 and 3
    if (count === 6) {
      return (
        <div className="grid aspect-[3/2] w-full grid-cols-3 grid-rows-2 gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
          {items.map((it, idx) =>
            renderTile(it, idx, "h-full w-full min-h-0 min-w-0"),
          )}
        </div>
      );
    }

    // 7 items: 3 on top, 4 on bottom
    if (count === 7) {
      return (
        <div className="flex aspect-[16/10] w-full flex-col gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
          <div className="grid h-1/2 min-h-0 grid-cols-3 grid-rows-1 gap-1.5">
            {items
              .slice(0, 3)
              .map((it, idx) =>
                renderTile(it, idx, "h-full w-full min-h-0 min-w-0"),
              )}
          </div>
          <div className="grid h-1/2 min-h-0 grid-cols-4 grid-rows-1 gap-1.5">
            {items
              .slice(3, 7)
              .map((it, idx) =>
                renderTile(it, idx + 3, "h-full w-full min-h-0 min-w-0"),
              )}
          </div>
        </div>
      );
    }

    // 8 items: 4 and 4
    if (count === 8) {
      return (
        <div className="grid aspect-[2/1] w-full grid-cols-4 grid-rows-2 gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
          {items.map((it, idx) =>
            renderTile(it, idx, "h-full w-full min-h-0 min-w-0"),
          )}
        </div>
      );
    }

    // 9 items: 3x3
    if (count === 9) {
      return (
        <div className="grid aspect-square w-full grid-cols-3 grid-rows-3 gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
          {items.map((it, idx) =>
            renderTile(it, idx, "h-full w-full min-h-0 min-w-0"),
          )}
        </div>
      );
    }

    // 10 items: 3 on top, 3 middle, 4 bottom
    return (
      <div className="flex aspect-[4/3] w-full flex-col gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50">
        <div className="grid h-1/3 min-h-0 grid-cols-3 grid-rows-1 gap-1.5">
          {items
            .slice(0, 3)
            .map((it, idx) =>
              renderTile(it, idx, "h-full w-full min-h-0 min-w-0"),
            )}
        </div>
        <div className="grid h-1/3 min-h-0 grid-cols-3 grid-rows-1 gap-1.5">
          {items
            .slice(3, 6)
            .map((it, idx) =>
              renderTile(it, idx + 3, "h-full w-full min-h-0 min-w-0"),
            )}
        </div>
        <div className="grid h-1/3 min-h-0 grid-cols-4 grid-rows-1 gap-1.5">
          {items
            .slice(6, 10)
            .map((it, idx) =>
              renderTile(it, idx + 6, "h-full w-full min-h-0 min-w-0"),
            )}
        </div>
      </div>
    );
  };

  return (
    <>
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn("mt-3 w-full", className)}
      >
        {renderGridContent()}
      </div>

      {lightboxIndex !== null && (
        <MediaLightbox
          media={items}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
};
