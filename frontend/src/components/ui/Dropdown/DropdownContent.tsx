import { useClickOutside } from "@/hooks/useClickOutside";
import { cn } from "@/utils/cn";
import { AnimatePresence, motion } from "framer-motion";
import {
  useCallback,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import {
  useDropdownContext,
  type DropdownAlign,
  type DropdownVariant,
} from "./DropdownContext";

const dropdownVariantClasses: Record<DropdownVariant, string> = {
  default: "bg-gray-900",
  elevated: "bg-gray-800",
};

type Props = {
  children?: ReactNode;
  className?: string;
  align?: DropdownAlign;
  sideOffset?: number;
  width?: number | string;
  minWidth?: number | string;
  maxHeight?: number | string;
  variant?: DropdownVariant;
  matchTriggerWidth?: boolean;
  style?: CSSProperties;
};

const DropdownContent = ({
  children,
  className,
  align: propAlign,
  sideOffset: propSideOffset,
  width,
  minWidth,
  maxHeight = 240,
  variant: propVariant,
  matchTriggerWidth = false,
  style,
}: Props) => {
  const {
    isOpen,
    closeDropdown,
    triggerRef,
    contentRef,
    dropdownVariant: contextVariant,
    align: contextAlign,
    sideOffset: contextSideOffset,
    contentId,
  } = useDropdownContext();

  const effectiveVariant = propVariant ?? contextVariant;
  const effectiveAlign = propAlign ?? contextAlign;
  const effectiveSideOffset = propSideOffset ?? contextSideOffset;

  const [position, setPosition] = useState<{
    top: number;
    left: number;
    minWidth?: number | string;
  } | null>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const contentEl = contentRef.current;
    const contentWidth = contentEl ? contentEl.offsetWidth : 0;

    const top = triggerRect.bottom + effectiveSideOffset;
    let left = triggerRect.left;

    if (effectiveAlign === "end" || effectiveAlign === "right") {
      left =
        contentWidth > 0 ? triggerRect.right - contentWidth : triggerRect.right;
    } else if (effectiveAlign === "center") {
      left =
        contentWidth > 0
          ? triggerRect.left + triggerRect.width / 2 - contentWidth / 2
          : triggerRect.left;
    } else {
      left = triggerRect.left;
    }

    // Viewport boundaries safeguard
    if (contentWidth > 0) {
      const maxLeft = window.innerWidth - contentWidth - 8;
      if (left > maxLeft) {
        left = Math.max(8, maxLeft);
      }
      if (left < 8) {
        left = 8;
      }
    }

    setPosition({
      top,
      left,
      minWidth: matchTriggerWidth ? triggerRect.width : undefined,
    });
  }, [
    triggerRef,
    contentRef,
    effectiveAlign,
    effectiveSideOffset,
    matchTriggerWidth,
  ]);

  useClickOutside([triggerRef, contentRef], closeDropdown);

  useLayoutEffect(() => {
    if (!isOpen) return;

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
    };
  }, [isOpen, updatePosition]);

  // Focus content upon opening and recalculate position once DOM is ready
  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    contentRef.current?.focus({ preventScroll: true });
  }, [isOpen, updatePosition, contentRef]);

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      closeDropdown();
      triggerRef.current?.focus();
    } else if (e.key === "Tab") {
      closeDropdown();
    }
  };

  const formattedWidth =
    typeof width === "number"
      ? `${width}px`
      : width === "full"
        ? "100%"
        : width;

  const formattedMinWidth =
    typeof minWidth === "number"
      ? `${minWidth}px`
      : (minWidth ??
        (position?.minWidth ? `${position.minWidth}px` : undefined));

  const formattedMaxHeight =
    typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={contentRef}
          id={contentId}
          role="menu"
          tabIndex={-1}
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.1, ease: "easeOut" }}
          onKeyDown={handleKeyDown}
          style={{
            top: position?.top,
            left: position?.left,
            width: formattedWidth,
            minWidth: formattedMinWidth,
            maxHeight: formattedMaxHeight,
            ...style,
          }}
          className={cn(
            "custom-scrollbar fixed z-50 flex origin-top flex-col overflow-x-hidden overflow-y-auto rounded-sm p-1 shadow-lg select-none focus:outline-none",
            dropdownVariantClasses[effectiveVariant],
            className,
          )}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export { DropdownContent };
export type { Props as DropdownContentProps };
