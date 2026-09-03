import { cn } from "@/utils/cn";
import type { ButtonHTMLAttributes, MouseEvent, ReactNode } from "react";
import {
  useDropdownContext,
  type DropdownSize,
  type DropdownVariant,
} from "./DropdownContext";

const itemSizeClasses: Record<DropdownSize, string> = {
  small: "px-2.5 py-1 text-sm rounded-sm",
  medium: "px-3 py-1.5 text-base rounded-sm",
  large: "px-4 py-2 text-lg rounded-sm",
};

const itemVariantClasses: Record<DropdownVariant, string> = {
  default: "hover:bg-gray-800 active:bg-gray-700",
  elevated: "hover:bg-gray-700 active:bg-gray-600",
};

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  icon?: ReactNode;
  size?: DropdownSize;
  variant?: DropdownVariant;
  closeOnClick?: boolean;
  danger?: boolean;
};

const DropdownButton = ({
  children,
  icon,
  size: propSize,
  variant: propVariant,
  closeOnClick = true,
  danger = false,
  className,
  onClick,
  disabled,
  type = "button",
  ...props
}: Props) => {
  const {
    closeDropdown,
    size: contextSize,
    dropdownVariant: contextVariant,
  } = useDropdownContext();

  const resolvedSize = propSize ?? contextSize;
  const resolvedVariant = propVariant ?? contextVariant;

  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    onClick?.(e);
    if (closeOnClick && !e.defaultPrevented) {
      closeDropdown();
    }
  };

  return (
    <button
      type={type}
      role="menuitem"
      disabled={disabled}
      onClick={handleClick}
      className={cn(
        "flex w-full items-center gap-2 text-left select-none focus:outline-none disabled:pointer-events-none disabled:opacity-50",
        itemSizeClasses[resolvedSize],
        itemVariantClasses[resolvedVariant],
        danger && "text-red-400 hover:text-red-300",
        className,
      )}
      {...props}
    >
      {icon && (
        <span className="flex shrink-0 items-center justify-center">
          {icon}
        </span>
      )}
      <span className="w-full truncate">{children}</span>
    </button>
  );
};

export { DropdownButton };
export type { Props as DropdownButtonProps };
