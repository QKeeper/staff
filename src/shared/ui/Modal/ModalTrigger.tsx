import { useContext, type ReactNode } from "react";
import { ModalContext } from "./ModalContext";

type Props = {
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
};

const ModalTrigger = ({ children, className, onClick }: Props) => {
  const context = useContext(ModalContext);

  const handleClick = () => {
    onClick?.();
    context?.openModal();
  };

  return (
    <button type="button" className={className} onClick={handleClick}>
      {children}
    </button>
  );
};

export { ModalTrigger };
export type { Props as ModalTriggerProps };
