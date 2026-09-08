import { cn } from "@/utils/cn";
import { Play } from "lucide-react";
import React, { useState } from "react";
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

  // Normalize items
  const items: MediaGridItem[] = React.useMemo(() => {
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

  if (items.length === 0) return null;

  const handleTileClick = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setLightboxIndex(index);
  };

  // Helper to render a single tile in multi-item grids
  const renderTile = (item: MediaGridItem, index: number, customClass = "") => {
    return (
      <div
        key={item.url + index}
        onClick={(e) => handleTileClick(index, e)}
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
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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

    // 1 item
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
          className="flex max-h-[550px] w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border border-gray-800 bg-black/40"
        >
          <img
            src={single.url}
            alt=""
            loading="lazy"
            className="max-h-[550px] w-auto max-w-full rounded-xl object-contain transition-transform duration-300 hover:scale-[1.01]"
          />
        </div>
      );
    }

    // 2 items: 2 equal columns
    if (count === 2) {
      return (
        <div className="grid h-[320px] grid-cols-2 gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 sm:h-[380px]">
          {items.map((it, idx) => renderTile(it, idx, "h-full w-full"))}
        </div>
      );
    }

    // 3 items: 1 dominant on left, 2 stacked on right
    if (count === 3) {
      return (
        <div className="grid h-[340px] grid-cols-3 gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 sm:h-[400px]">
          <div className="col-span-2 h-full">
            {renderTile(items[0], 0, "h-full w-full")}
          </div>
          <div className="col-span-1 flex h-full flex-col gap-1.5">
            {renderTile(items[1], 1, "h-1/2 w-full")}
            {renderTile(items[2], 2, "h-1/2 w-full")}
          </div>
        </div>
      );
    }

    // 4 items: 2x2 grid
    if (count === 4) {
      return (
        <div className="grid h-[340px] grid-cols-2 grid-rows-2 gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 sm:h-[400px]">
          {items.map((it, idx) => renderTile(it, idx, "h-full w-full"))}
        </div>
      );
    }

    // 5 items: 2 on top row, 3 on bottom row
    if (count === 5) {
      return (
        <div className="flex h-[360px] flex-col gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 sm:h-[420px]">
          <div className="grid h-1/2 grid-cols-2 gap-1.5">
            {items
              .slice(0, 2)
              .map((it, idx) => renderTile(it, idx, "h-full w-full"))}
          </div>
          <div className="grid h-1/2 grid-cols-3 gap-1.5">
            {items
              .slice(2, 5)
              .map((it, idx) => renderTile(it, idx + 2, "h-full w-full"))}
          </div>
        </div>
      );
    }

    // 6 items: 3 and 3
    if (count === 6) {
      return (
        <div className="grid h-[360px] grid-cols-3 grid-rows-2 gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 sm:h-[420px]">
          {items.map((it, idx) => renderTile(it, idx, "h-full w-full"))}
        </div>
      );
    }

    // 7 items: 3 on top, 4 on bottom
    if (count === 7) {
      return (
        <div className="flex h-[380px] flex-col gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 sm:h-[440px]">
          <div className="grid h-1/2 grid-cols-3 gap-1.5">
            {items
              .slice(0, 3)
              .map((it, idx) => renderTile(it, idx, "h-full w-full"))}
          </div>
          <div className="grid h-1/2 grid-cols-4 gap-1.5">
            {items
              .slice(3, 7)
              .map((it, idx) => renderTile(it, idx + 3, "h-full w-full"))}
          </div>
        </div>
      );
    }

    // 8 items: 4 and 4
    if (count === 8) {
      return (
        <div className="grid h-[380px] grid-cols-4 grid-rows-2 gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 sm:h-[440px]">
          {items.map((it, idx) => renderTile(it, idx, "h-full w-full"))}
        </div>
      );
    }

    // 9 items: 3x3
    if (count === 9) {
      return (
        <div className="grid h-[400px] grid-cols-3 grid-rows-3 gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 sm:h-[460px]">
          {items.map((it, idx) => renderTile(it, idx, "h-full w-full"))}
        </div>
      );
    }

    // 10 items: 3 on top, 3 middle, 4 bottom
    return (
      <div className="flex h-[420px] flex-col gap-1.5 overflow-hidden rounded-xl border border-gray-800 bg-gray-900/50 sm:h-[480px]">
        <div className="grid h-1/3 grid-cols-3 gap-1.5">
          {items
            .slice(0, 3)
            .map((it, idx) => renderTile(it, idx, "h-full w-full"))}
        </div>
        <div className="grid h-1/3 grid-cols-3 gap-1.5">
          {items
            .slice(3, 6)
            .map((it, idx) => renderTile(it, idx + 3, "h-full w-full"))}
        </div>
        <div className="grid h-1/3 grid-cols-4 gap-1.5">
          {items
            .slice(6, 10)
            .map((it, idx) => renderTile(it, idx + 6, "h-full w-full"))}
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
