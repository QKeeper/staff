import { cn } from "@/shared/utils/cn";
import { AnimatePresence, motion } from "framer-motion";
import {
  useContext,
  useEffect,
  type CSSProperties,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { ModalContext } from "./ModalContext";

type Props = {
  children?: ReactNode;
  className?: string;
  width?: string | number;
  style?: CSSProperties;
};

const ModalContent = ({ children, className, width, style }: Props) => {
  const context = useContext(ModalContext);

  const isOpen = context?.isOpen;
  const closeModal = context?.closeModal;
  const IgnoreOutsideClick = context?.IgnoreOutsideClick;
  const resolvedWidth = width ?? context?.width;

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

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.1 }}
          onPointerDown={handleBackdropPointerDown}
          className="fixed inset-0 z-50 flex h-screen w-screen items-center justify-center bg-gray-950/50"
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
