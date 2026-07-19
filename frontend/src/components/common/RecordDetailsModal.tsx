import type { ReactNode } from "react";

import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

export interface RecordDetail {
  label: string;
  value: ReactNode;
}

export interface RecordDetailsModalProps {
  children?: ReactNode;
  details: readonly RecordDetail[];
  isOpen: boolean;
  onClose: () => void;
  size?: "small" | "medium" | "large";
  title: string;
}

export function RecordDetailsModal({
  children,
  details,
  isOpen,
  onClose,
  size,
  title,
}: RecordDetailsModalProps) {
  return (
    <Modal
      footer={<Button onClick={onClose}>Close</Button>}
      isOpen={isOpen}
      onClose={onClose}
      size={size}
      title={title}
    >
      <dl className="record-details">
        {details.map((detail) => (
          <div key={detail.label}>
            <dt>{detail.label}</dt>
            <dd>{detail.value}</dd>
          </div>
        ))}
      </dl>
      {children}
    </Modal>
  );
}
