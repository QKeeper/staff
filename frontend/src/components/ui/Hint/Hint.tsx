import { cn } from "@/utils/cn";
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
  top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
  "top-right": "bottom-full right-0 mb-2",
  "top-left": "bottom-full left-0 mb-2",
  bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
  left: "right-full top-1/2 -translate-y-1/2 mr-2",
  right: "left-full top-1/2 -translate-y-1/2 ml-2",
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
      {isVisible && (
        <div
          role="tooltip"
          className={cn(
            "pointer-events-none absolute z-50 rounded-md border border-gray-700 bg-gray-800 px-2.5 py-1 text-xs font-medium whitespace-nowrap text-gray-200 shadow-xl select-none",
            positionClasses[position],
            contentClassName,
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export { Hint };
