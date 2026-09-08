import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ZoomIn, ZoomOut, Move } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageFile: File | null;
  onApply: (croppedDataUrl: string) => void;
  aspectRatio?: number;
  cropShape?: "rect" | "round";
  title?: string;
  subtitle?: string;
}

export const ImageCropModal = ({
  isOpen,
  onClose,
  imageFile,
  onApply,
  aspectRatio = 3,
  cropShape = "rect",
  title,
  subtitle,
}: ImageCropModalProps) => {
  const { t } = useTranslation();

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [naturalSize, setNaturalSize] = useState<{
    width: number;
    height: number;
  }>({
    width: 0,
    height: 0,
  });

  const [stageSize, setStageSize] = useState<{ width: number; height: number }>(
    {
      width: 600,
      height: 400,
    },
  );

  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState<{ x: number; y: number }>({
    x: 0,
    y: 0,
  });
  const [isDragging, setIsDragging] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{
    startX: number;
    startY: number;
    posX: number;
    posY: number;
  }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  });

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Load image object URL
  useEffect(() => {
    if (!imageFile) {
      setImageUrl(null);
      setImageLoaded(false);
      return;
    }

    const url = URL.createObjectURL(imageFile);
    setImageUrl(url);
    setImageLoaded(false);
    setZoom(1);
    setPosition({ x: 0, y: 0 });

    const img = new Image();
    img.onload = () => {
      setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      setImageLoaded(true);
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [imageFile]);

  // Measure stage size
  useEffect(() => {
    if (!isOpen) return;

    const updateSize = () => {
      if (stageRef.current) {
        setStageSize({
          width: stageRef.current.clientWidth,
          height: stageRef.current.clientHeight,
        });
      }
    };

    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [isOpen]);

  // Calculate crop box size inside stage
  const getCropBoxSize = useCallback(() => {
    const pad = 32;
    const maxW = Math.max(100, stageSize.width - pad);
    const maxH = Math.max(50, stageSize.height - pad);

    let cropW = maxW;
    let cropH = cropW / aspectRatio;

    if (cropH > maxH) {
      cropH = maxH;
      cropW = cropH * aspectRatio;
    }

    if (aspectRatio === 1) {
      const size = Math.min(maxW, maxH, 260);
      cropW = size;
      cropH = size;
    }

    return { cropW, cropH };
  }, [stageSize, aspectRatio]);

  // Viewport dimensions & boundary clamping
  const getBounds = useCallback(
    (currentZoom: number) => {
      if (!naturalSize.width || !naturalSize.height) {
        return { maxX: 0, maxY: 0, cropW: 300, cropH: 100, scale: 1 };
      }

      const { cropW, cropH } = getCropBoxSize();

      // Base scale covers the crop area
      const minScale = Math.max(
        cropW / naturalSize.width,
        cropH / naturalSize.height,
      );
      const scale = minScale * currentZoom;

      const renderedWidth = naturalSize.width * scale;
      const renderedHeight = naturalSize.height * scale;

      const maxX = Math.max(0, (renderedWidth - cropW) / 2);
      const maxY = Math.max(0, (renderedHeight - cropH) / 2);

      return { maxX, maxY, cropW, cropH, scale };
    },
    [naturalSize, getCropBoxSize],
  );

  // Clamp position when zoom changes
  const handleZoomChange = (newZoom: number) => {
    const clampedZoom = Math.min(Math.max(newZoom, 1), 3);
    setZoom(clampedZoom);

    const { maxX, maxY } = getBounds(clampedZoom);
    setPosition((prev) => ({
      x: Math.min(Math.max(prev.x, -maxX), maxX),
      y: Math.min(Math.max(prev.y, -maxY), maxY),
    }));
  };

  // Pointer drag events
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!imageLoaded) return;
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - dragStartRef.current.startX;
    const deltaY = e.clientY - dragStartRef.current.startY;

    const { maxX, maxY } = getBounds(zoom);
    const targetX = dragStartRef.current.posX + deltaX;
    const targetY = dragStartRef.current.posY + deltaY;

    setPosition({
      x: Math.min(Math.max(targetX, -maxX), maxX),
      y: Math.min(Math.max(targetY, -maxY), maxY),
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture was lost
    }
  };

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    handleZoomChange(zoom + delta);
  };

  // Perform crop on canvas
  const handleConfirm = () => {
    if (!imageUrl || !naturalSize.width || !naturalSize.height) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const { cropW, cropH, scale } = getBounds(zoom);

      // Center of crop area in image coordinates
      const cropCenterInImgX = naturalSize.width / 2 - position.x / scale;
      const cropCenterInImgY = naturalSize.height / 2 - position.y / scale;

      const sWidth = cropW / scale;
      const sHeight = cropH / scale;
      const sx = cropCenterInImgX - sWidth / 2;
      const sy = cropCenterInImgY - sHeight / 2;

      // Output resolution
      const outputWidth =
        aspectRatio === 1
          ? Math.min(Math.max(Math.round(sWidth), 512), 1024)
          : Math.min(Math.max(Math.round(sWidth), 1200), 2400);
      const outputHeight = Math.round(outputWidth / aspectRatio);

      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext("2d");

      if (!ctx) return;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(
        img,
        Math.max(0, sx),
        Math.max(0, sy),
        Math.min(sWidth, naturalSize.width),
        Math.min(sHeight, naturalSize.height),
        0,
        0,
        outputWidth,
        outputHeight,
      );

      const croppedDataUrl = canvas.toDataURL("image/jpeg", 0.92);
      onApply(croppedDataUrl);
      onClose();
    };
    img.src = imageUrl;
  };

  const { cropW, cropH, scale } = getBounds(zoom);
  const renderedW = naturalSize.width * scale;
  const renderedH = naturalSize.height * scale;

  return (
    <Modal open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Modal.Content
        width="680px"
        className="w-full max-w-2xl overflow-hidden border border-gray-800 bg-gray-900 p-0 text-gray-100 shadow-2xl"
      >
        <Modal.Header className="border-b border-gray-800 px-6 py-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-100">
              {title || t("profile.cropBannerTitle")}
            </h3>
            <p className="mt-0.5 text-xs text-gray-400">
              {subtitle || t("profile.cropBannerSubtitle")}
            </p>
          </div>
          <Modal.Close />
        </Modal.Header>

        <Modal.Body className="space-y-6 p-6">
          {/* Main Cropper Stage */}
          <div
            ref={stageRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            className="relative flex h-[360px] w-full cursor-grab touch-none items-center justify-center overflow-hidden rounded-xl border border-gray-800 bg-gray-950/90 select-none active:cursor-grabbing sm:h-[400px]"
          >
            {/* 1. Underlying Image (Full aspect ratio, visible & dimmed outside crop box) */}
            {imageUrl && imageLoaded ? (
              <div
                className="pointer-events-none absolute transition-none will-change-transform"
                style={{
                  width: `${renderedW}px`,
                  height: `${renderedH}px`,
                  transform: `translate3d(${position.x}px, ${position.y}px, 0)`,
                }}
              >
                <img
                  src={imageUrl}
                  alt="Crop source"
                  draggable={false}
                  className="size-full object-contain select-none"
                />
              </div>
            ) : (
              <div className="text-sm text-gray-500">{t("common.loading")}</div>
            )}

            {/* 2. Dimmed Mask with clear cutout in the center */}
            {imageLoaded && (
              <div
                className={cn(
                  "pointer-events-none absolute border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.65)]",
                  cropShape === "round" ? "rounded-full" : "rounded-lg",
                )}
                style={{
                  width: `${cropW}px`,
                  height: `${cropH}px`,
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                }}
              >
                {/* 3x3 Rule-of-thirds grid inside cutout */}
                <div
                  className={cn(
                    "grid size-full grid-cols-3 grid-rows-3",
                    cropShape === "round" && "overflow-hidden rounded-full",
                  )}
                >
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-r border-b border-white/20" />
                  <div className="border-b border-white/20" />
                  <div className="border-r border-white/20" />
                  <div className="border-r border-white/20" />
                  <div />
                </div>

                {/* Ratio Badge */}
                <div className="absolute right-2 bottom-2 flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1 text-[11px] font-medium text-gray-200 backdrop-blur-md">
                  <Move className="size-3 text-blue-400" />
                  <span>{aspectRatio === 1 ? "1:1" : `${aspectRatio}:1`}</span>
                </div>
              </div>
            )}
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-4 px-2">
            <ZoomOut className="size-4 shrink-0 text-gray-400" />
            <input
              type="range"
              min="1"
              max="3"
              step="0.01"
              value={zoom}
              onChange={(e) => handleZoomChange(parseFloat(e.target.value))}
              className="h-1.5 w-full cursor-pointer rounded-lg bg-gray-800 accent-blue-500"
            />
            <ZoomIn className="size-4 shrink-0 text-gray-400" />
            <span className="w-10 text-right font-mono text-xs text-gray-400">
              {zoom.toFixed(1)}x
            </span>
          </div>
        </Modal.Body>

        <Modal.Footer className="flex justify-end gap-3 border-t border-gray-800 bg-gray-950/40 px-6 py-4">
          <Button variant="outline" size="medium" onClick={onClose}>
            {t("profile.cancel")}
          </Button>
          <Button
            variant="accent"
            size="medium"
            onClick={handleConfirm}
            disabled={!imageLoaded}
          >
            {t("profile.apply")}
          </Button>
        </Modal.Footer>
      </Modal.Content>
    </Modal>
  );
};
