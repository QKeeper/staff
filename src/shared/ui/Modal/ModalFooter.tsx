import type { ReactNode } from "react";

type Props = {
  children?: ReactNode;
  className?: string;
};

const ModalFooter = ({ children }: Props) => {
  return <div className="mt-2 flex justify-end">{children}</div>;
};

export { ModalFooter };
export type { Props as ModalFooterProps };
