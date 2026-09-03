import { cn } from "@/utils/cn";
import { useState, type ReactNode } from "react";

export type HintPosition =
  "top" | "bottom" | "left" | "right" | "top-right" | "top-left";

export interface HintProps {
  content?: ReactNode;
  children: ReactNode;
  className?: string;
  position?: HintPosition;
  disabled?: boolean;
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
  position = "top-right",
  disabled,
}: HintProps) => {
  const [isVisible, setIsVisible] = useState(false);

  if (disabled || !content) {
    return <>{children}</>;
  }

  return (
    <div
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            "pointer-events-none absolute z-50 max-w-xs min-w-48 rounded-md border border-gray-700 bg-gray-800 p-2.5 text-xs text-gray-200 shadow-xl select-none",
            positionClasses[position],
          )}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export { Hint };
