import type { ReactNode } from "react";

type Props = {
  children?: ReactNode;
  className?: string;
};

const ModalBody = ({ children }: Props) => {
  return <>{children}</>;
};

export { ModalBody };
export type { Props as ModalBodyProps };
