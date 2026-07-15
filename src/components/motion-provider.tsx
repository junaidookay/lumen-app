import { MotionConfig } from "motion/react";
import { useReducedMotion } from "@/hooks/use-reduced-motion";
import type { ReactNode } from "react";

export function MotionProvider({ children }: { children: ReactNode }) {
  const prefersReduced = useReducedMotion();

  return (
    <MotionConfig
      reducedMotion={prefersReduced ? "always" : "never"}
      transition={{ duration: prefersReduced ? 0 : undefined }}
    >
      {children}
    </MotionConfig>
  );
}
