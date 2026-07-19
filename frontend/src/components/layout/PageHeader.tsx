import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

export interface PageHeaderProps {
  actions?: ReactNode;
  breadcrumbs?: BreadcrumbItem[];
  eyebrow?: string;
  subtitle?: string;
  title: string;
}

export function PageHeader({
  actions,
  breadcrumbs,
  eyebrow,
  subtitle,
  title,
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header-copy">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb">
            <ol className="breadcrumbs">
              {breadcrumbs.map((item, index) => (
                <li key={`${item.label}-${index}`}>
                  {item.to ? (
                    <Link to={item.to}>{item.label}</Link>
                  ) : (
                    item.label
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="page-header-actions">{actions}</div>}
    </header>
  );
}
