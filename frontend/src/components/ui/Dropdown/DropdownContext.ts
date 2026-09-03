import { createContext, useContext, type RefObject } from "react";

export type DropdownSize = "small" | "medium" | "large";
export type DropdownVariant = "default" | "elevated";
export type DropdownAlign = "start" | "end" | "center" | "left" | "right";

export type DropdownContextValue = {
  isOpen: boolean;
  openDropdown: () => void;
  closeDropdown: () => void;
  toggleDropdown: () => void;
  triggerRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLDivElement | null>;
  size: DropdownSize;
  dropdownVariant: DropdownVariant;
  align: DropdownAlign;
  sideOffset: number;
  closeOnClick: boolean;
  disabled: boolean;
  contentId: string;
};

export const DropdownContext = createContext<DropdownContextValue | null>(null);

export const useDropdownContext = () => {
  const context = useContext(DropdownContext);
  if (!context) {
    throw new Error(
      "Dropdown compound components must be used within a Dropdown",
    );
  }
  return context;
};
