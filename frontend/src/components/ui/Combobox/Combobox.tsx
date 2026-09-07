import { useClickOutside } from "@/hooks/useClickOutside";
import { useToggle } from "@/hooks/useToggle";
import { ModalContext } from "@/components/ui/Modal/ModalContext";
import { cn } from "@/utils/cn";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react";
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

export interface ComboboxOption<T = unknown> {
  value: string;
  label: string;
  secondaryLabel?: string;
  group?: string;
  icon?: ReactNode;
  data?: T;
  disabled?: boolean;
}

export type ComboboxSize = "small" | "medium" | "large";
export type ComboboxVariant = "solid" | "ghost" | "outline";
export type DropdownVariant = "default" | "elevated";

export interface ComboboxProps<T = unknown> {
  items: ComboboxOption<T>[];
  value: string | null;
  onValueChange: (item: ComboboxOption<T>) => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  isLoading?: boolean;
  size?: ComboboxSize;
  variant?: ComboboxVariant;
  dropdownVariant?: DropdownVariant;
  width?: number | string;
  maxHeight?: number | string;
  className?: string;
  dropdownClassName?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
}

const sizeClasses: Record<ComboboxSize, string> = {
  small: "h-8 pr-2 pl-3 text-sm gap-2",
  medium: "h-10 pr-3 pl-4 text-sm gap-2",
  large: "h-12 pr-4 pl-5 text-base gap-2.5",
};

const iconSizes: Record<ComboboxSize, number> = {
  small: 16,
  medium: 18,
  large: 20,
};

const itemSizeClasses: Record<ComboboxSize, string> = {
  small: "px-2.5 py-1.5 text-sm rounded-sm",
  medium: "px-3 py-2 text-sm rounded-sm",
  large: "px-4 py-2.5 text-base rounded-sm",
};

const triggerVariantClasses: Record<ComboboxVariant, string> = {
  solid: "bg-gray-900 hover:bg-gray-800 active:bg-gray-700",
  ghost: "bg-transparent hover:bg-gray-900 active:bg-gray-800",
  outline:
    "border border-gray-700 bg-transparent hover:border-gray-600 hover:bg-gray-900 active:bg-gray-800 focus-visible:border-gray-400",
};

const dropdownVariantClasses: Record<DropdownVariant, string> = {
  default: "bg-gray-900 border border-gray-800",
  elevated: "bg-gray-800 border border-gray-700",
};

const itemVariantClasses: Record<DropdownVariant, string> = {
  default: "hover:bg-gray-800 active:bg-gray-700",
  elevated: "hover:bg-gray-700 active:bg-gray-600",
};

const itemHighlightedClasses: Record<DropdownVariant, string> = {
  default: "bg-gray-800",
  elevated: "bg-gray-700",
};

function Combobox<T = unknown>({
  items,
  value,
  onValueChange,
  searchValue,
  onSearchChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyText = "No options found",
  isLoading = false,
  size = "medium",
  variant = "outline",
  dropdownVariant,
  width,
  maxHeight = 320,
  className,
  dropdownClassName,
  disabled = false,
  id,
  "aria-label": ariaLabel,
}: ComboboxProps<T>) {
  const {
    value: isOpen,
    setTrue: openDropdown,
    setFalse: closeDropdown,
  } = useToggle(false);

  const generatedId = useId();
  const triggerId = id ?? `combobox-trigger-${generatedId}`;
  const listboxId = `combobox-listbox-${generatedId}`;
  const inputId = `combobox-input-${generatedId}`;

  const isInsideModal = Boolean(useContext(ModalContext));
  const effectiveDropdownVariant =
    dropdownVariant ?? (isInsideModal ? "elevated" : "default");

  const selectedItem = items.find((item) => item.value === value);

  const [highlightedIndex, setHighlightedIndex] = useState<number>(0);

  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  const close = useCallback(() => {
    closeDropdown();
    onSearchChange("");
  }, [closeDropdown, onSearchChange]);

  useClickOutside([triggerRef, dropdownRef], close);

  const [popupPosition, setPopupPosition] = useState<{
    top: number;
    left: number;
    minWidth?: number;
    width?: number;
  } | null>(null);

  const updatePosition = useCallback(() => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPopupPosition({
        top: rect.bottom + 4,
        left: rect.left,
        minWidth: Math.max(rect.width, 280),
        width: rect.width,
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

  // When opening, reset highlighted index and focus the search input
  useLayoutEffect(() => {
    if (!isOpen) return;

    const selectedIdx = items.findIndex((i) => i.value === value);
    setHighlightedIndex(selectedIdx >= 0 ? selectedIdx : 0);

    const timer = setTimeout(() => {
      searchInputRef.current?.focus();
      searchInputRef.current?.select();
    }, 10);

    return () => clearTimeout(timer);
  }, [isOpen]);

  // When items list changes while open, ensure highlightedIndex is valid
  useLayoutEffect(() => {
    if (!isOpen) return;
    if (highlightedIndex >= items.length) {
      setHighlightedIndex(0);
    }
  }, [items, isOpen, highlightedIndex]);

  const selectOptionHandler = useCallback(
    (item: ComboboxOption<T>) => {
      if (item.disabled) return;
      close();
      onSearchChange("");
      onValueChange(item);
      triggerRef.current?.focus();
    },
    [close, onValueChange, onSearchChange],
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
      onSearchChange("");
      openDropdown();
    }
  };

  const handleInputKeyDown = (e: ReactKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (items.length === 0) return;
      setHighlightedIndex((prev) => {
        let next = prev + 1;
        while (next < items.length && items[next]?.disabled) {
          next++;
        }
        if (next >= items.length) next = prev;
        scrollToItem(next);
        return next;
      });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (items.length === 0) return;
      setHighlightedIndex((prev) => {
        let next = prev - 1;
        while (next >= 0 && items[next]?.disabled) {
          next--;
        }
        if (next < 0) next = prev;
        scrollToItem(next);
        return next;
      });
    } else if (e.key === "Enter") {
      e.preventDefault();
      const currentItem = items[highlightedIndex];
      if (currentItem && !currentItem.disabled) {
        selectOptionHandler(currentItem);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
      triggerRef.current?.focus();
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

  // Group items if any group is specified
  const hasGroups = items.some((item) => Boolean(item.group));
  const groupedItems: { group?: string; items: ComboboxOption<T>[] }[] = [];

  if (hasGroups) {
    const map = new Map<string, ComboboxOption<T>[]>();
    for (const item of items) {
      const g = item.group || "";
      if (!map.has(g)) {
        map.set(g, []);
      }
      map.get(g)!.push(item);
    }
    for (const [group, groupList] of map.entries()) {
      groupedItems.push({ group: group || undefined, items: groupList });
    }
  } else {
    groupedItems.push({ items });
  }

  let flatIndexTracker = 0;

  return (
    <div
      className={cn("shrink-0", !formattedWidth && "w-fit")}
      style={formattedWidth ? { width: formattedWidth } : undefined}
    >
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-controls={isOpen ? listboxId : undefined}
        aria-label={ariaLabel}
        aria-disabled={disabled}
        disabled={disabled}
        onClick={handleTriggerClick}
        style={formattedWidth ? { width: "100%" } : undefined}
        className={cn(
          "flex items-center justify-between rounded-sm transition-colors select-none focus-visible:ring-1 focus-visible:ring-gray-600 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50",
          triggerVariantClasses[variant],
          isOpen && variant === "outline" && "border-gray-400",
          sizeClasses[size],
          className,
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          {selectedItem?.icon && (
            <span className="shrink-0 text-gray-400">{selectedItem.icon}</span>
          )}
          <span
            className={cn(
              "truncate font-medium",
              selectedItem ? "text-gray-100" : "font-normal text-gray-400",
            )}
          >
            {selectedItem ? selectedItem.label : placeholder}
          </span>
        </div>
        <ChevronDown
          size={iconSizes[size]}
          className={cn(
            "shrink-0 text-gray-400 transition-transform duration-150",
            isOpen && "rotate-180 text-gray-200",
          )}
        />
      </button>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              ref={dropdownRef}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              tabIndex={-1}
              role="listbox"
              id={listboxId}
              aria-label={ariaLabel}
              style={{
                top: popupPosition?.top,
                left: popupPosition?.left,
                minWidth: popupPosition?.minWidth,
                width: popupPosition?.width,
                maxHeight: formattedMaxHeight,
              }}
              className={cn(
                "fixed z-50 flex origin-top flex-col overflow-hidden rounded-md shadow-2xl select-none focus:outline-none",
                dropdownVariantClasses[effectiveDropdownVariant],
                dropdownClassName,
              )}
            >
              {/* Autocomplete Search input */}
              <div className="sticky top-0 z-10 flex items-center border-b border-gray-800 bg-gray-900/95 px-3 py-2 backdrop-blur-sm">
                <Search className="mr-2 size-4 shrink-0 text-gray-400" />
                <input
                  ref={searchInputRef}
                  id={inputId}
                  type="text"
                  value={searchValue}
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyDown={handleInputKeyDown}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-sm text-gray-100 placeholder:text-gray-500 focus:outline-none"
                  autoComplete="off"
                  spellCheck={false}
                />
                {isLoading ? (
                  <Loader2 className="size-4 shrink-0 animate-spin text-gray-400" />
                ) : searchValue ? (
                  <button
                    type="button"
                    onClick={() => {
                      onSearchChange("");
                      searchInputRef.current?.focus();
                    }}
                    className="p-0.5 text-gray-400 hover:text-gray-200"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>

              {/* Items List */}
              <div
                className="custom-scrollbar flex-1 overflow-y-auto p-1"
                style={{ maxHeight: `calc(${formattedMaxHeight} - 45px)` }}
              >
                {items.length === 0 && !isLoading ? (
                  <div className="px-3 py-4 text-center text-sm text-gray-400">
                    {emptyText}
                  </div>
                ) : (
                  groupedItems.map((groupBlock, gIndex) => {
                    return (
                      <div key={groupBlock.group || `group-${gIndex}`}>
                        {groupBlock.group && (
                          <div className="sticky top-0 z-5 bg-inherit px-2.5 pt-2 pb-1 text-xs font-medium tracking-wider text-gray-400 uppercase">
                            {groupBlock.group}
                          </div>
                        )}
                        {groupBlock.items.map((item) => {
                          const currentIndex = flatIndexTracker++;
                          const isSelected = item.value === value;
                          const isHighlighted =
                            currentIndex === highlightedIndex;

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
                                "flex w-full items-center justify-between text-left transition-colors focus:outline-none disabled:pointer-events-none disabled:opacity-50",
                                itemSizeClasses[size],
                                itemVariantClasses[effectiveDropdownVariant],
                                isHighlighted &&
                                  itemHighlightedClasses[
                                    effectiveDropdownVariant
                                  ],
                                isSelected && "font-medium text-gray-100",
                              )}
                              onMouseEnter={() =>
                                setHighlightedIndex(currentIndex)
                              }
                              onClick={() => selectOptionHandler(item)}
                            >
                              <div className="flex min-w-0 items-center gap-2.5">
                                {item.icon && (
                                  <span className="shrink-0 text-gray-400">
                                    {item.icon}
                                  </span>
                                )}
                                <div className="min-w-0">
                                  <p className="truncate text-sm text-gray-200">
                                    {item.label}
                                  </p>
                                  {item.secondaryLabel && (
                                    <p className="truncate text-xs text-gray-500">
                                      {item.secondaryLabel}
                                    </p>
                                  )}
                                </div>
                              </div>
                              {isSelected && (
                                <Check className="size-4 shrink-0 text-gray-300" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body,
      )}
    </div>
  );
}

export { Combobox };
