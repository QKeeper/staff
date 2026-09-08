import { useClickOutside } from "@/hooks/useClickOutside";
import { useToggle } from "@/hooks/useToggle";
import { ModalContext } from "@/components/ui/Modal/ModalContext";
import { cn } from "@/utils/cn";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDownIcon } from "lucide-react";
import {
  useCallback,
  useContext,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";

export interface SelectItem {
  label: string;
  value: string;
  disabled?: boolean;
}

type ValueRendererProps = {
  value: string;
  selectedItem?: SelectItem;
};

type ValueRenderer = (props: ValueRendererProps) => ReactNode;

export type SelectSize = "small" | "medium" | "large";
export type SelectVariant = "solid" | "ghost" | "outline";
export type DropdownVariant = "default" | "elevated";

export interface SelectProps {
  items: SelectItem[];
  value: string;
  onValueChange?: (item: SelectItem) => void;
  valueRenderer?: ValueRenderer;
  label?: string;
  size?: SelectSize;
  width?: number | string;
  maxHeight?: number | string;
  variant?: SelectVariant;
  dropdownVariant?: DropdownVariant;
  className?: string;
  dropdownClassName?: string;
  itemClassName?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}

const defaultValueRenderer: ValueRenderer = ({ value, selectedItem }) => {
  return selectedItem?.label ?? value;
};

const sizeClasses: Record<SelectSize, string> = {
  small: "h-8 pr-2 pl-3 text-sm gap-1",
  medium: "h-10 pr-3 pl-4 text-base gap-1",
  large: "h-12 pr-4 pl-5 text-lg gap-1.5",
};

const iconSizes: Record<SelectSize, number> = {
  small: 16,
  medium: 20,
  large: 24,
};

const itemSizeClasses: Record<SelectSize, string> = {
  small: "px-2.5 py-1 text-sm rounded-sm",
  medium: "px-3 py-1.5 text-base rounded-sm",
  large: "px-4 py-2 text-lg rounded-sm",
};

const labelSizeClasses: Record<SelectSize, string> = {
  small: "px-2.5 pt-1.5 pb-0.5 text-xs",
  medium: "px-3 pt-2 pb-1 text-sm",
  large: "px-4 pt-2.5 pb-1 text-base",
};

const triggerVariantClasses: Record<SelectVariant, string> = {
  solid: "bg-gray-900 hover:bg-gray-800 active:bg-gray-700",
  ghost: "bg-transparent hover:bg-gray-900 active:bg-gray-800",
  outline:
    "border border-gray-700 bg-transparent hover:border-gray-600 hover:bg-gray-900 active:bg-gray-800 focus-visible:border-gray-400",
};

const dropdownVariantClasses: Record<DropdownVariant, string> = {
  default: "bg-gray-900",
  elevated: "bg-gray-800",
};

const itemVariantClasses: Record<DropdownVariant, string> = {
  default: "hover:bg-gray-800 active:bg-gray-700",
  elevated: "hover:bg-gray-700 active:bg-gray-600",
};

const itemHighlightedClasses: Record<DropdownVariant, string> = {
  default: "bg-gray-800",
  elevated: "bg-gray-700",
};

const Select = ({
  items,
  value,
  label,
  onValueChange,
  valueRenderer = defaultValueRenderer,
  size = "medium",
  width,
  maxHeight = 240,
  variant = "solid",
  dropdownVariant,
  className,
  dropdownClassName,
  itemClassName,
  disabled = false,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
}: SelectProps) => {
  const {
    value: isOpen,
    setTrue: openDropdown,
    setFalse: closeDropdown,
  } = useToggle(false);

  const generatedId = useId();
  const triggerId = id ?? `select-trigger-${generatedId}`;
  const listboxId = `select-listbox-${generatedId}`;
  const labelId = `select-label-${generatedId}`;

  const isInsideModal = Boolean(useContext(ModalContext));
  const effectiveDropdownVariant =
    dropdownVariant ?? (isInsideModal ? "elevated" : "default");

  const selectedIndex = items.findIndex((item) => item.value === value);
  const selectedItem = selectedIndex >= 0 ? items[selectedIndex] : undefined;

  const [highlightedIndex, setHighlightedIndex] = useState<number>(
    selectedIndex >= 0 ? selectedIndex : 0,
  );

  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const close = useCallback(() => {
    closeDropdown();
  }, [closeDropdown]);

  useClickOutside([buttonRef, dropdownRef], close);

  const [popupPosition, setPopupPosition] = useState<{
    top: number;
    left: number;
    minWidth?: number;
  } | null>(null);

  const updatePosition = useCallback(() => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPopupPosition({
        top: rect.bottom + 4,
        left: rect.left,
        minWidth: rect.width,
      });
    }
  }, []);

  useLayoutEffect(() => {
    if (!isOpen) return;

    updatePosition();

    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    window.visualViewport?.addEventListener("resize", updatePosition);
    window.visualViewport?.addEventListener("scroll", updatePosition);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
      window.visualViewport?.removeEventListener("resize", updatePosition);
      window.visualViewport?.removeEventListener("scroll", updatePosition);
    };
  }, [isOpen, updatePosition]);

  // When opening, reset highlighted index, focus listbox, and scroll selected item into view
  useLayoutEffect(() => {
    if (!isOpen) return;

    const targetIndex = selectedIndex >= 0 ? selectedIndex : 0;
    setHighlightedIndex(targetIndex);

    // Focus the dropdown listbox container
    dropdownRef.current?.focus({ preventScroll: true });

    // Scroll the selected item into view centered immediately so it is not pinned to the bottom
    const targetItem = items[targetIndex];
    if (targetItem) {
      const targetElement = itemRefs.current.get(targetItem.value);
      if (dropdownRef.current && targetElement) {
        const dropdown = dropdownRef.current;
        dropdown.scrollTop =
          targetElement.offsetTop -
          dropdown.clientHeight / 2 +
          targetElement.offsetHeight / 2;
      } else {
        targetElement?.scrollIntoView({ block: "center" });
      }
    }
  }, [isOpen, selectedIndex, items]);

  const selectOptionHandler = useCallback(
    (item: SelectItem) => {
      if (item.disabled) return;
      close();
      onValueChange?.(item);
      buttonRef.current?.focus();
    },
    [close, onValueChange],
  );

  const scrollToItem = (index: number) => {
    const item = items[index];
    if (item) {
      const element = itemRefs.current.get(item.value);
      element?.scrollIntoView({ block: "nearest" });
    }
  };

  const handleTriggerClick = () => {
    if (disabled) return;
    if (isOpen) {
      close();
    } else {
      openDropdown();
    }
  };

  const handleTriggerKeyDown = (e: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;

    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        openDropdown();
      }
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (isOpen) {
        close();
      } else {
        openDropdown();
      }
    } else if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      close();
    }
  };

  const handleDropdownKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!isOpen || items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        let next = prev + 1;
        while (next < items.length && items[next]?.disabled) {
          next++;
        }
        if (next >= items.length) {
          next = prev;
        }
        scrollToItem(next);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => {
        let next = prev - 1;
        while (next >= 0 && items[next]?.disabled) {
          next--;
        }
        if (next < 0) {
          next = prev;
        }
        scrollToItem(next);
        return next;
      });
    } else if (e.key === "Home") {
      e.preventDefault();
      const firstNonDisabled = items.findIndex((item) => !item.disabled);
      const target = firstNonDisabled >= 0 ? firstNonDisabled : 0;
      setHighlightedIndex(target);
      scrollToItem(target);
    } else if (e.key === "End") {
      e.preventDefault();
      let lastNonDisabled = items.length - 1;
      while (lastNonDisabled >= 0 && items[lastNonDisabled]?.disabled) {
        lastNonDisabled--;
      }
      const target = lastNonDisabled >= 0 ? lastNonDisabled : items.length - 1;
      setHighlightedIndex(target);
      scrollToItem(target);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const currentItem = items[highlightedIndex];
      if (currentItem && !currentItem.disabled) {
        selectOptionHandler(currentItem);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
      buttonRef.current?.focus();
    } else if (e.key === "Tab") {
      close();
    }
  };

  const formattedWidth =
    typeof width === "number"
      ? `${width}px`
      : width === "full"
        ? "100%"
        : width;

  const formattedMaxHeight =
    typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight;

  const activeOptionId =
    isOpen && highlightedIndex >= 0 && items[highlightedIndex]
      ? `${listboxId}-option-${items[highlightedIndex].value}`
      : undefined;

  return (
    <div
      className={cn("shrink-0", !formattedWidth && "w-fit")}
      style={formattedWidth ? { width: formattedWidth } : undefined}
    >
      <button
        ref={buttonRef}
        type="button"
        id={triggerId}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-activedescendant={activeOptionId}
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledby ?? (label ? labelId : undefined)}
        aria-describedby={ariaDescribedby}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={handleTriggerClick}
        onKeyDown={handleTriggerKeyDown}
        style={formattedWidth ? { width: "100%" } : undefined}
        className={cn(
          "flex items-center justify-between rounded-sm transition-colors select-none focus-visible:ring-1 focus-visible:ring-gray-700 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          triggerVariantClasses[variant],
          isOpen && variant === "outline" && "border-gray-400",
          sizeClasses[size],
          className,
        )}
      >
        <span>{valueRenderer({ value, selectedItem })}</span>
        <ChevronDownIcon size={iconSizes[size]} className="shrink-0" />
      </button>
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.1, ease: "easeOut" }}
              tabIndex={-1}
              role="listbox"
              id={listboxId}
              aria-label={ariaLabel}
              aria-labelledby={ariaLabelledby ?? (label ? labelId : triggerId)}
              aria-activedescendant={activeOptionId}
              onKeyDown={handleDropdownKeyDown}
              style={{
                top: popupPosition?.top,
                left: popupPosition?.left,
                minWidth: popupPosition?.minWidth,
                maxHeight: formattedMaxHeight,
              }}
              className={cn(
                "custom-scrollbar fixed z-50 flex origin-top flex-col overflow-x-hidden overflow-y-auto rounded-sm p-1 shadow-lg select-none focus:outline-none",
                dropdownVariantClasses[effectiveDropdownVariant],
                dropdownClassName,
              )}
            >
              {label && (
                <p
                  id={labelId}
                  className={cn(
                    "sticky top-0 z-10 bg-inherit text-gray-400",
                    labelSizeClasses[size],
                  )}
                >
                  {label}
                </p>
              )}
              {items.map((item, index) => {
                const isSelected = item.value === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={item.value}
                    ref={(el) => {
                      if (el) {
                        itemRefs.current.set(item.value, el);
                      } else {
                        itemRefs.current.delete(item.value);
                      }
                    }}
                    type="button"
                    role="option"
                    id={`${listboxId}-option-${item.value}`}
                    aria-selected={isSelected}
                    aria-disabled={item.disabled}
                    disabled={item.disabled}
                    className={cn(
                      "w-full text-left focus:outline-none disabled:pointer-events-none disabled:opacity-50",
                      itemSizeClasses[size],
                      itemVariantClasses[effectiveDropdownVariant],
                      isHighlighted &&
                        itemHighlightedClasses[effectiveDropdownVariant],
                      isSelected && "font-medium text-gray-100",
                      itemClassName,
                    )}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    onClick={() => selectOptionHandler(item)}
                  >
                    {item.label}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
};

export { Select };
