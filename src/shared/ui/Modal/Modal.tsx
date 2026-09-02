import { useCallback, useState, type ReactNode } from "react";
import { ModalBody } from "./ModalBody";
import { ModalClose } from "./ModalClose";
import { ModalContent } from "./ModalContent";
import { ModalContext } from "./ModalContext";
import { ModalFooter } from "./ModalFooter";
import { ModalHeader } from "./ModalHeader";
import { ModalTrigger } from "./ModalTrigger";

type Props = {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  IgnoreOutsideClick?: boolean;
  width?: string | number;
  children: ReactNode;
  onOpen?: () => void;
  onClose?: () => void;
};

const ModalRoot = ({
  open: controlledOpen,
  defaultOpen = false,
  onOpenChange,
  IgnoreOutsideClick,
  width,
  children,
  onOpen,
  onClose,
}: Props) => {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
  const isControlled = controlledOpen !== undefined;
  const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
      if (nextOpen) {
        onOpen?.();
      } else {
        onClose?.();
      }
    },
    [isControlled, onOpenChange, onOpen, onClose],
  );

  const openModal = useCallback(() => {
    handleOpenChange(true);
  }, [handleOpenChange]);

  const closeModal = useCallback(() => {
    handleOpenChange(false);
  }, [handleOpenChange]);

  const toggleModal = useCallback(() => {
    handleOpenChange(!isOpen);
  }, [handleOpenChange, isOpen]);

  const contextValue = {
    IgnoreOutsideClick,
    isOpen,
    openModal,
    closeModal,
    toggleModal,
    width,
  };

  return (
    <ModalContext.Provider value={contextValue}>
      {children}
    </ModalContext.Provider>
  );
};

const Modal = Object.assign(ModalRoot, {
  Trigger: ModalTrigger,
  Content: ModalContent,
  Header: ModalHeader,
  Body: ModalBody,
  Footer: ModalFooter,
  Close: ModalClose,
});

export { Modal };
export type { Props as ModalProps };
