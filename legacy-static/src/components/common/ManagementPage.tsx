import type { ReactNode } from "react";

import { PageHeader } from "../layout/PageHeader";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";

export interface ManagementPageProps {
  addLabel?: string;
  breadcrumb: string;
  children: ReactNode;
  controls: ReactNode;
  description: string;
  feedback?: { message: string; tone: "error" | "success" } | null;
  onAdd?: () => void;
  title: string;
}

export function ManagementPage({
  addLabel,
  breadcrumb,
  children,
  controls,
  description,
  feedback,
  onAdd,
  title,
}: ManagementPageProps) {
  return (
    <div className="management-page">
      <PageHeader
        actions={
          addLabel && onAdd ? (
            <Button onClick={onAdd}>{addLabel}</Button>
          ) : undefined
        }
        breadcrumbs={[{ label: "Management" }, { label: breadcrumb }]}
        eyebrow="Fleet records"
        subtitle={description}
        title={title}
      />
      {feedback && (
        <p
          className={`management-feedback management-feedback-${feedback.tone}`}
          role={feedback.tone === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      )}
      <Card className="management-card">
        <div className="management-toolbar">{controls}</div>
        {children}
      </Card>
    </div>
  );
}
