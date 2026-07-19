import { EmptyState } from "./EmptyState";
import { Card } from "../ui/Card";
import { StatusBadge, type StatusTone } from "../ui/StatusBadge";

export interface DashboardListItem {
  description: string;
  id: string;
  meta?: string;
  status?: string;
  tone?: StatusTone;
  title: string;
}

export interface DashboardListProps {
  className?: string;
  emptyDescription: string;
  emptyTitle: string;
  eyebrow?: string;
  items: readonly DashboardListItem[];
  title: string;
}

export function DashboardList({
  className,
  emptyDescription,
  emptyTitle,
  eyebrow,
  items,
  title,
}: DashboardListProps) {
  return (
    <Card className={className} eyebrow={eyebrow} title={title}>
      {items.length === 0 ? (
        <EmptyState description={emptyDescription} title={emptyTitle} />
      ) : (
        <div className="dashboard-list">
          {items.map((item) => (
            <article className="dashboard-list-item" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <p>{item.description}</p>
                {item.meta && <span>{item.meta}</span>}
              </div>
              {item.status && (
                <StatusBadge tone={item.tone}>{item.status}</StatusBadge>
              )}
            </article>
          ))}
        </div>
      )}
    </Card>
  );
}
