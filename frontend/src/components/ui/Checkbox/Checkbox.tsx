import { cn } from "@/utils/cn";
import { Check } from "lucide-react";
import type { InputHTMLAttributes, ReactNode } from "react";

export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type"
> {
  children?: ReactNode;
}

const Checkbox = ({
  children,
  className,
  disabled,
  ...props
}: CheckboxProps) => {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 text-sm text-gray-300 select-none",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
    >
      <input
        type="checkbox"
        disabled={disabled}
        className="peer sr-only"
        {...props}
      />
      <div
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-sm border border-gray-700 bg-gray-900",
          "peer-checked:border-gray-50 peer-checked:bg-gray-50 peer-checked:text-gray-950 peer-checked:[&_svg]:opacity-100",
          "peer-focus-visible:ring-1 peer-focus-visible:ring-gray-400",
        )}
      >
        <Check className="size-3 stroke-3 opacity-0" />
      </div>
      {children && <span>{children}</span>}
    </label>
  );
};

export { Checkbox };
