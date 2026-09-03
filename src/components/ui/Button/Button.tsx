import { cn } from "@/utils/cn";
import { Loader2 } from "lucide-react";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonSize = "small" | "medium" | "large";
export type ButtonVariant = "solid" | "ghost" | "outline";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: ButtonSize;
  variant?: ButtonVariant;
  icon?: ReactNode;
  loading?: boolean;
  isLoading?: boolean;
};

const sizeClasses: Record<ButtonSize, string> = {
  small: "h-8 px-2.5 text-sm gap-1.5",
  medium: "h-10 px-3 text-base gap-2",
  large: "h-12 px-4 text-lg gap-2",
};

const iconSizeClasses: Record<ButtonSize, string> = {
  small: "size-4",
  medium: "size-4",
  large: "size-5",
};

const variantClasses: Record<ButtonVariant, string> = {
  solid: "bg-gray-900 hover:bg-gray-800 active:bg-gray-700",
  ghost: "bg-transparent hover:bg-gray-900 active:bg-gray-800",
  outline:
    "border border-gray-700 bg-transparent hover:bg-gray-900 active:bg-gray-800",
};

const Button = ({
  children,
  className,
  type = "button",
  size = "medium",
  variant = "solid",
  icon,
  loading = false,
  isLoading = false,
  disabled,
  ...props
}: Props) => {
  const isButtonLoading = Boolean(loading || isLoading);
  const isDisabled = Boolean(disabled || isButtonLoading);

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={isButtonLoading}
      className={cn(
        "relative inline-flex items-center justify-center rounded select-none disabled:pointer-events-none disabled:opacity-50",
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    >
      {icon ? (
        <>
          {isButtonLoading ? (
            <Loader2
              className={cn("shrink-0 animate-spin", iconSizeClasses[size])}
            />
          ) : (
            <span className="flex shrink-0 items-center justify-center">
              {icon}
            </span>
          )}
          {children && <span>{children}</span>}
        </>
      ) : isButtonLoading ? (
        <>
          <span className="invisible inline-flex items-center gap-1.5">
            {children}
          </span>
          <span className="absolute inset-0 flex items-center justify-center">
            <Loader2
              className={cn("shrink-0 animate-spin", iconSizeClasses[size])}
            />
          </span>
        </>
      ) : (
        children
      )}
    </button>
  );
};

export { Button };
export type { Props as ButtonProps };
