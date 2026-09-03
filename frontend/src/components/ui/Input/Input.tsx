import { cn } from "@/utils/cn";
import type { InputHTMLAttributes } from "react";

export type InputSize = "small" | "medium" | "large";

export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  size?: InputSize;
}

const sizeClasses: Record<InputSize, string> = {
  small: "h-8 px-2.5 text-sm",
  medium: "h-10 px-3 text-base",
  large: "h-12 px-4 text-lg",
};

const Input = ({
  className,
  type = "text",
  size = "medium",
  ...props
}: InputProps) => {
  return (
    <input
      type={type}
      className={cn(
        "w-full rounded-sm bg-gray-900 placeholder:text-gray-400 focus:ring-1 focus:ring-gray-700 focus:outline-none disabled:pointer-events-none disabled:opacity-50",
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
};

export { Input };
