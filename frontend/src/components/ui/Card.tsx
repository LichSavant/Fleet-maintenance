import type { ReactNode } from "react";

import { classNames } from "../../utils/classNames";

export interface CardProps {
  action?: ReactNode;
  as?: "article" | "div" | "section";
  children: ReactNode;
  className?: string;
  eyebrow?: string;
  title?: string;
}

export function Card({
  action,
  as: Component = "section",
  children,
  className,
  eyebrow,
  title,
}: CardProps) {
  return (
    <Component className={classNames("card", className)}>
      {(eyebrow || title || action) && (
        <header className="card-header">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2 className="card-title">{title}</h2>}
          </div>
          {action && <div className="card-action">{action}</div>}
        </header>
      )}
      {children}
    </Component>
  );
}
