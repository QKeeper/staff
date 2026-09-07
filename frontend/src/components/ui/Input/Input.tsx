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
        "w-full rounded-sm border border-gray-700 bg-gray-900 text-gray-50 transition-colors placeholder:text-gray-400 hover:border-gray-600 focus:border-gray-400 focus:outline-none disabled:pointer-events-none disabled:opacity-50",
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  );
};

export { Input };
