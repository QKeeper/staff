import { useContext, type ReactNode } from "react";
import { ModalContext } from "./ModalContext";
import { Button, type ButtonProps } from "../Button";

type Props = ButtonProps & {
  children?: ReactNode;
  className?: string;
  onClick?: () => void;
};

const ModalClose = ({ children, className, onClick, ...props }: Props) => {
  const context = useContext(ModalContext);

  const handleClick = () => {
    onClick?.();
    context?.closeModal();
  };

  return (
    <Button className={className} {...props} onClick={handleClick}>
      {children}
    </Button>
  );
};

export { ModalClose };
export type { Props as ModalCloseProps };
