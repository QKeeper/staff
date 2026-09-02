import { cn } from "@/shared/utils/cn";
import type { LabelHTMLAttributes, ReactNode } from "react";

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  children?: ReactNode;
  className?: string;
}

const Label = ({ children, className, ...props }: LabelProps) => {
  return (
    <label
      className={cn(
        "block pb-1 text-xs font-medium text-gray-400 select-none",
        className,
      )}
      {...props}
    >
      {children}
    </label>
  );
};

export { Label };
export type { LabelProps };
