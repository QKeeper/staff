import { cn } from "@/utils/cn";
import type { HTMLAttributes } from "react";
import { useDropdownContext, type DropdownVariant } from "./DropdownContext";

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: DropdownVariant;
};

const DropdownDivider = ({
  variant: propVariant,
  className,
  ...props
}: Props) => {
  const { dropdownVariant: contextVariant } = useDropdownContext();
  const effectiveVariant = propVariant ?? contextVariant;

  return (
    <div
      role="separator"
      className={cn(
        "my-1 h-px",
        effectiveVariant === "elevated" ? "bg-gray-700" : "bg-gray-800",
        className,
      )}
      {...props}
    />
  );
};

export { DropdownDivider };
export type { Props as DropdownDividerProps };
