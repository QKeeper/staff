import { useDropdownContext } from "./DropdownContext";
import {
  cloneElement,
  isValidElement,
  type ButtonHTMLAttributes,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  children?: ReactNode;
  asChild?: boolean;
};

const DropdownTrigger = ({
  children,
  asChild = false,
  className,
  onClick,
  onKeyDown,
  ...props
}: Props) => {
  const {
    isOpen,
    toggleDropdown,
    openDropdown,
    closeDropdown,
    triggerRef,
    disabled,
    contentId,
  } = useDropdownContext();

  const handleClick = (e: ReactMouseEvent<HTMLButtonElement>) => {
    if (disabled) return;
    onClick?.(e);
    if (!e.defaultPrevented) {
      toggleDropdown();
    }
  };

  const handleKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    onKeyDown?.(e);
    if (e.defaultPrevented) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        openDropdown();
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      toggleDropdown();
    } else if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      closeDropdown();
    }
  };

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{
      onClick?: (e: ReactMouseEvent<HTMLButtonElement>) => void;
      onKeyDown?: (e: ReactKeyboardEvent<HTMLButtonElement>) => void;
      ref?: Ref<HTMLElement>;
      "aria-haspopup"?: string;
      "aria-expanded"?: boolean;
      "aria-controls"?: string;
    }>;

    return cloneElement(child, {
      ref: (node: HTMLElement | null) => {
        (triggerRef as { current: HTMLElement | null }).current = node;
        const existingRef = (child as { ref?: Ref<HTMLElement> }).ref;
        if (typeof existingRef === "function") {
          existingRef(node);
        } else if (
          existingRef &&
          typeof existingRef === "object" &&
          "current" in existingRef
        ) {
          (existingRef as { current: HTMLElement | null }).current = node;
        }
      },
      "aria-haspopup": "menu",
      "aria-expanded": isOpen,
      "aria-controls": isOpen ? contentId : undefined,
      onClick: (e: ReactMouseEvent<HTMLButtonElement>) => {
        child.props.onClick?.(e);
        handleClick(e);
      },
      onKeyDown: (e: ReactKeyboardEvent<HTMLButtonElement>) => {
        child.props.onKeyDown?.(e);
        handleKeyDown(e);
      },
    });
  }

  return (
    <button
      ref={triggerRef as Ref<HTMLButtonElement>}
      type="button"
      aria-haspopup="menu"
      aria-expanded={isOpen}
      aria-controls={isOpen ? contentId : undefined}
      disabled={disabled}
      className={className}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </button>
  );
};

export { DropdownTrigger };
export type { Props as DropdownTriggerProps };
