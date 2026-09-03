import { ModalContext } from "@/components/ui/Modal/ModalContext";
import { useToggle } from "@/hooks/useToggle";
import { useCallback, useContext, useId, useRef, type ReactNode } from "react";
import { DropdownButton } from "./DropdownButton";
import {
  DropdownContext,
  type DropdownAlign,
  type DropdownContextValue,
  type DropdownSize,
  type DropdownVariant,
} from "./DropdownContext";
import { DropdownContent } from "./DropdownContent";
import { DropdownDivider } from "./DropdownDivider";
import { DropdownLabel } from "./DropdownLabel";
import { DropdownLink } from "./DropdownLink";
import { DropdownTrigger } from "./DropdownTrigger";

type Props = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  size?: DropdownSize;
  dropdownVariant?: DropdownVariant;
  align?: DropdownAlign;
  sideOffset?: number;
  closeOnClick?: boolean;
  disabled?: boolean;
  children: ReactNode;
};

const DropdownRoot = ({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  size = "medium",
  dropdownVariant,
  align = "start",
  sideOffset = 4,
  closeOnClick = true,
  disabled = false,
  children,
}: Props) => {
  const {
    value: uncontrolledOpen,
    setTrue: setOpenTrue,
    setFalse: setOpenFalse,
    toggle: toggleUncontrolled,
  } = useToggle(defaultOpen);

  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        if (nextOpen) {
          setOpenTrue();
        } else {
          setOpenFalse();
        }
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange, setOpenFalse, setOpenTrue],
  );

  const openDropdown = useCallback(() => {
    if (disabled) return;
    handleOpenChange(true);
  }, [disabled, handleOpenChange]);

  const closeDropdown = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  const toggleDropdown = useCallback(() => {
    if (disabled) return;
    if (isControlled) {
      handleOpenChange(!controlledOpen);
    } else {
      toggleUncontrolled();
      onOpenChange?.(!uncontrolledOpen);
    }
  }, [
    disabled,
    isControlled,
    handleOpenChange,
    controlledOpen,
    toggleUncontrolled,
    onOpenChange,
    uncontrolledOpen,
  ]);

  const triggerRef = useRef<HTMLElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const generatedId = useId();
  const contentId = `dropdown-content-${generatedId}`;

  const isInsideModal = Boolean(useContext(ModalContext));
  const effectiveDropdownVariant =
    dropdownVariant ?? (isInsideModal ? "elevated" : "default");

  const contextValue: DropdownContextValue = {
    isOpen,
    openDropdown,
    closeDropdown,
    toggleDropdown,
    triggerRef,
    contentRef,
    size,
    dropdownVariant: effectiveDropdownVariant,
    align,
    sideOffset,
    closeOnClick,
    disabled,
    contentId,
  };

  return (
    <DropdownContext.Provider value={contextValue}>
      {children}
    </DropdownContext.Provider>
  );
};

const Dropdown = Object.assign(DropdownRoot, {
  Trigger: DropdownTrigger,
  Content: DropdownContent,
  Divider: DropdownDivider,
  Label: DropdownLabel,
  Link: DropdownLink,
  Button: DropdownButton,
  Item: DropdownButton,
});

export { Dropdown };
export type { Props as DropdownProps };
