import { cn } from "@/shared/utils/cn";
import type { TextareaHTMLAttributes } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = ({ className, ...props }: TextareaProps) => {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-sm bg-gray-900 px-3 py-2 text-base text-gray-50 placeholder:text-gray-400 focus:ring-1 focus:ring-gray-700 focus:outline-none disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
};

export { Textarea };
