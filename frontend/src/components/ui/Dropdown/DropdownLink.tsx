import { cn } from "@/utils/cn";
import type { AnchorHTMLAttributes, MouseEvent, ReactNode } from "react";
import { Link, type LinkProps, type To } from "react-router";
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

type BaseProps = {
  children?: ReactNode;
  icon?: ReactNode;
  size?: DropdownSize;
  variant?: DropdownVariant;
  closeOnClick?: boolean;
  disabled?: boolean;
  danger?: boolean;
  className?: string;
};

type DropdownRouterLinkProps = BaseProps &
  Omit<LinkProps, "to" | "children"> & {
    to: To;
    href?: never;
  };

type DropdownAnchorProps = BaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    to?: never;
  };

type Props = DropdownRouterLinkProps | DropdownAnchorProps;

const DropdownLink = ({
  children,
  icon,
  size: propSize,
  variant: propVariant,
  closeOnClick = true,
  disabled = false,
  danger = false,
  className,
  onClick,
  ...rest
}: Props) => {
  const {
    closeDropdown,
    size: contextSize,
    dropdownVariant: contextVariant,
  } = useDropdownContext();

  const resolvedSize = propSize ?? contextSize;
  const resolvedVariant = propVariant ?? contextVariant;

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
    if (closeOnClick && !e.defaultPrevented) {
      closeDropdown();
    }
  };

  const commonClassName = cn(
    "flex w-full items-center gap-2 text-left select-none focus:outline-none disabled:pointer-events-none disabled:opacity-50",
    itemSizeClasses[resolvedSize],
    itemVariantClasses[resolvedVariant],
    danger && "text-red-400 hover:text-red-300",
    disabled && "pointer-events-none opacity-50",
    className,
  );

  if ("to" in rest && rest.to !== undefined) {
    const { to, ...routerLinkProps } = rest as DropdownRouterLinkProps;
    return (
      <Link
        to={to}
        role="menuitem"
        aria-disabled={disabled}
        onClick={handleClick}
        className={commonClassName}
        {...routerLinkProps}
      >
        {icon && (
          <span className="flex shrink-0 items-center justify-center">
            {icon}
          </span>
        )}
        <span className="w-full truncate">{children}</span>
      </Link>
    );
  }

  const { href, ...anchorProps } = rest as DropdownAnchorProps;
  return (
    <a
      href={href}
      role="menuitem"
      aria-disabled={disabled}
      onClick={handleClick}
      className={commonClassName}
      {...anchorProps}
    >
      {icon && (
        <span className="flex shrink-0 items-center justify-center">
          {icon}
        </span>
      )}
      <span className="w-full truncate">{children}</span>
    </a>
  );
};

export { DropdownLink };
export type { Props as DropdownLinkProps };
