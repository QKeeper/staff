import { cn } from "@/utils/cn";
import { AnimatePresence, motion } from "framer-motion";
import {
  useContext,
  useEffect,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ModalContext, type ModalPosition } from "./ModalContext";

type Props = {
  children?: ReactNode;
  className?: string;
  width?: string | number;
  position?: ModalPosition;
  placement?: ModalPosition;
  topOffset?: string | number;
  style?: CSSProperties;
};

const ModalContent = ({
  children,
  className,
  width,
  position,
  placement,
  topOffset,
  style,
}: Props) => {
  const context = useContext(ModalContext);

  const isOpen = context?.isOpen;
  const closeModal = context?.closeModal;
  const IgnoreOutsideClick = context?.IgnoreOutsideClick;
  const resolvedWidth = width ?? context?.width;
  const resolvedPosition =
    position ?? placement ?? context?.position ?? "center";
  const resolvedTopOffset = topOffset ?? context?.topOffset;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal?.();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, closeModal]);

  const handleBackdropPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (event.target === event.currentTarget && !IgnoreOutsideClick) {
      closeModal?.();
    }
  };

  const computedStyle: CSSProperties = {
    ...(resolvedWidth !== undefined
      ? {
          width:
            typeof resolvedWidth === "number"
              ? `${resolvedWidth}px`
              : resolvedWidth,
        }
      : {}),
    ...style,
  };

  const backdropStyle: CSSProperties | undefined =
    resolvedPosition === "top" && resolvedTopOffset !== undefined
      ? {
          paddingTop:
            typeof resolvedTopOffset === "number"
              ? `${resolvedTopOffset}px`
              : resolvedTopOffset,
        }
      : undefined;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          onPointerDown={handleBackdropPointerDown}
          style={backdropStyle}
          className={cn(
            "fixed inset-0 z-50 flex h-screen w-screen justify-center overflow-y-auto bg-gray-950/50 p-4",
            resolvedPosition === "top" ? "items-start pt-20" : "items-center",
          )}
        >
          <motion.div
            initial={{ opacity: 0, y: "-1vh" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "-1vh" }}
            transition={{ duration: 0.1, ease: "easeOut" }}
            style={computedStyle}
            className={cn("rounded-md bg-gray-900 p-5", className)}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export { ModalContent };
export type { Props as ModalContentProps };
