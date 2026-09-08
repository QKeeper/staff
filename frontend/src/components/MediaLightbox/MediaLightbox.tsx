import { ChevronLeft, ChevronRight, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { CustomVideoPlayer } from "../CustomVideoPlayer/CustomVideoPlayer";

export interface LightboxMediaItem {
  url: string;
  type: "image" | "video" | "gif";
}

interface MediaLightboxProps {
  media: LightboxMediaItem[];
  initialIndex?: number;
  onClose: () => void;
}

export const MediaLightbox: React.FC<MediaLightboxProps> = ({
  media,
  initialIndex = 0,
  onClose,
}) => {
  const { t } = useTranslation();
  const [currentIndex, setCurrentIndex] = useState(
    Math.min(Math.max(0, initialIndex), Math.max(0, media.length - 1)),
  );

  const total = media.length;
  const currentItem = media[currentIndex];

  const handlePrev = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
  };

  const handleNext = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : total - 1));
      } else if (e.key === "ArrowRight") {
        setCurrentIndex((prev) => (prev < total - 1 ? prev + 1 : 0));
      }
    };

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [total, onClose]);

  if (!currentItem) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-md transition-opacity select-none"
    >
      {/* Top action bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-x-0 top-0 z-10 flex h-16 items-center justify-between px-6 text-white"
      >
        <span className="text-sm font-medium tracking-wide text-gray-300">
          {currentIndex + 1} / {total}
        </span>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          aria-label={t("media.close", "Закрыть")}
          className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 active:scale-95"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Navigation Arrows */}
      {total > 1 && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            aria-label={t("media.prev", "Предыдущее медиа")}
            className="absolute top-1/2 left-4 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 active:scale-95"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={handleNext}
            aria-label={t("media.next", "Следующее медиа")}
            className="absolute top-1/2 right-4 z-10 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur-sm transition hover:bg-white/20 active:scale-95"
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}

      {/* Main Content Area */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[90vh] max-w-[90vw] items-center justify-center"
      >
        {currentItem.type === "video" ? (
          <div className="w-[85vw] max-w-4xl">
            <CustomVideoPlayer
              key={currentItem.url}
              src={currentItem.url}
              autoPlay
            />
          </div>
        ) : (
          <img
            key={currentItem.url}
            src={currentItem.url}
            alt=""
            className="max-h-[85vh] max-w-[90vw] rounded-md object-contain shadow-2xl"
          />
        )}
      </div>
    </div>,
    document.body,
  );
};
