import { cn } from "@/utils/cn";
import type { TextareaHTMLAttributes } from "react";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = ({ className, ...props }: TextareaProps) => {
  return (
    <textarea
      className={cn(
        "w-full resize-none rounded-sm border border-gray-700 bg-gray-900 px-3 py-2 text-base text-gray-50 transition-colors placeholder:text-gray-400 hover:border-gray-600 focus:border-gray-400 focus:outline-none disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
};

export { Textarea };
