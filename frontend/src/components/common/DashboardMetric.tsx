import type { ReactNode } from "react";

import { Card } from "../ui/Card";

export interface DashboardMetricProps {
  detail?: string;
  label: string;
  value: ReactNode;
}

export function DashboardMetric({
  detail,
  label,
  value,
}: DashboardMetricProps) {
  return (
    <Card as="article" className="dashboard-metric">
      <p>{label}</p>
      <strong>{value}</strong>
      {detail && <span>{detail}</span>}
    </Card>
  );
}
