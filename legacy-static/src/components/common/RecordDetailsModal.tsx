import type { ReactNode } from "react";

import { Button } from "../ui/Button";
import { Modal } from "../ui/Modal";

export interface RecordDetail {
  label: string;
  value: ReactNode;
}

export interface RecordDetailsModalProps {
  details: readonly RecordDetail[];
  isOpen: boolean;
  onClose: () => void;
  title: string;
}

export function RecordDetailsModal({
  details,
  isOpen,
  onClose,
  title,
}: RecordDetailsModalProps) {
  return (
    <Modal
      footer={<Button onClick={onClose}>Close</Button>}
      isOpen={isOpen}
      onClose={onClose}
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
    </Modal>
  );
}
