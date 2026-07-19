import type { ReactNode } from "react";

import { classNames } from "../../utils/classNames";

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "info";

export interface StatusBadgeProps {
  children: ReactNode;
  tone?: StatusTone;
}

export function StatusBadge({ children, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span className={classNames("status-badge", `status-badge-${tone}`)}>
      {children}
    </span>
  );
}
