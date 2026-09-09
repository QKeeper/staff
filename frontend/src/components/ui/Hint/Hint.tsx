import { cn } from "@/utils/cn";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

export type HintPosition =
  "top" | "bottom" | "left" | "right" | "top-right" | "top-left";

export interface HintProps {
  content?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  position?: HintPosition;
  disabled?: boolean;
  delay?: number;
}

const positionClasses: Record<HintPosition, string> = {
  top: "bottom-full left-1/2 -translate-x-1/2 mb-1.5",
  "top-right": "bottom-full right-0 mb-1.5",
  "top-left": "bottom-full left-0 mb-1.5",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-1.5",
  left: "right-full top-1/2 -translate-y-1/2 mr-1.5",
  right: "left-full top-1/2 -translate-y-1/2 ml-1.5",
};

const motionShift: Record<
  HintPosition,
  {
    initial: { opacity: number; scale: number; x?: number; y?: number };
    animate: { opacity: number; scale: number; x?: number; y?: number };
    exit: { opacity: number; scale: number; x?: number; y?: number };
  }
> = {
  top: {
    initial: { opacity: 0, scale: 0.96, y: 3 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: 2 },
  },
  "top-right": {
    initial: { opacity: 0, scale: 0.96, y: 3 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: 2 },
  },
  "top-left": {
    initial: { opacity: 0, scale: 0.96, y: 3 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: 2 },
  },
  bottom: {
    initial: { opacity: 0, scale: 0.96, y: -3 },
    animate: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.96, y: -2 },
  },
  left: {
    initial: { opacity: 0, scale: 0.96, x: 3 },
    animate: { opacity: 1, scale: 1, x: 0 },
    exit: { opacity: 0, scale: 0.96, x: 2 },
  },
  right: {
    initial: { opacity: 0, scale: 0.96, x: -3 },
    animate: { opacity: 1, scale: 1, x: 0 },
    exit: { opacity: 0, scale: 0.96, x: -2 },
  },
};

const Hint = ({
  content,
  children,
  className,
  contentClassName,
  position = "top",
  disabled,
  delay = 400,
}: HintProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (delay <= 0) {
      setIsVisible(true);
    } else {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
      }, delay);
    }
  };

  const hide = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (disabled) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsVisible(false);
    }
  }, [disabled]);

  if (disabled || !content) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn("relative inline-flex", className)}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "pointer-events-none absolute z-50",
              positionClasses[position],
            )}
          >
            <motion.div
              role="tooltip"
              initial={motionShift[position].initial}
              animate={motionShift[position].animate}
              exit={motionShift[position].exit}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className={cn(
                "rounded-md border border-gray-700/80 bg-gray-900/95 px-3 py-1.5 text-xs font-medium whitespace-nowrap text-gray-200 shadow-xl backdrop-blur-sm select-none",
                contentClassName,
              )}
            >
              {content}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { Hint };
