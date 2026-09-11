import { useEffect, type RefObject } from "react";

type Ref = RefObject<HTMLElement | null>;

const useClickOutside = (refs: Ref | Ref[], cb: () => void) => {
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;

      if (!target.isConnected) return;

      const refList = Array.isArray(refs) ? refs : [refs];
      const isInside = refList.some((ref) => ref.current?.contains(target));

      if (!isInside) {
        cb();
      }
    };

    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [refs, cb]);
};

export { useClickOutside };
