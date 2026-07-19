import type { ReactNode } from "react";

import { Icon } from "../ui/Icon";

export interface EmptyStateProps {
  action?: ReactNode;
  description: string;
  title: string;
}

export function EmptyState({ action, description, title }: EmptyStateProps) {
  return (
    <div className="state-panel">
      <span className="state-icon state-icon-neutral" aria-hidden="true">
        <Icon name="info" />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {action && <div className="state-action">{action}</div>}
    </div>
  );
}
