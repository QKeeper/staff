import { cn } from "@/utils/cn";
import type { ReactNode } from "react";

type Props = {
  children?: ReactNode;
  className?: string;
};

const ModalHeader = ({ children, className }: Props) => {
  return (
    <h2 className={cn("pb-4 text-2xl font-medium", className)}>{children}</h2>
  );
};

export { ModalHeader };
export type { Props as ModalHeaderProps };
