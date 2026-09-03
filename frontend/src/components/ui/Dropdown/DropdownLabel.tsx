import { cn } from "@/utils/cn";
import type { HTMLAttributes, ReactNode } from "react";
import { useDropdownContext, type DropdownSize } from "./DropdownContext";

const labelSizeClasses: Record<DropdownSize, string> = {
  small: "px-2.5 pt-1.5 pb-0.5 text-xs",
  medium: "px-3 pt-2 pb-1 text-sm",
  large: "px-4 pt-2.5 pb-1 text-base",
};

type Props = HTMLAttributes<HTMLParagraphElement> & {
  children?: ReactNode;
  size?: DropdownSize;
};

const DropdownLabel = ({
  children,
  size: propSize,
  className,
  ...props
}: Props) => {
  const { size: contextSize } = useDropdownContext();
  const resolvedSize = propSize ?? contextSize;

  return (
    <p
      className={cn(
        "sticky top-0 z-10 bg-inherit font-medium text-gray-400 select-none",
        labelSizeClasses[resolvedSize],
        className,
      )}
      {...props}
    >
      {children}
    </p>
  );
};

export { DropdownLabel };
export type { Props as DropdownLabelProps };
