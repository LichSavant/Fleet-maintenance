import { Button } from "./Button";
import { Modal } from "./Modal";

export interface ConfirmDialogProps {
  cancelLabel?: string;
  confirmLabel?: string;
  description: string;
  isConfirming?: boolean;
  isOpen: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  title: string;
  tone?: "default" | "danger";
}

export function ConfirmDialog({
  cancelLabel = "Cancel",
  confirmLabel = "Confirm",
  description,
  isConfirming = false,
  isOpen,
  onCancel,
  onConfirm,
  title,
  tone = "default",
}: ConfirmDialogProps) {
  return (
    <Modal
      description={description}
      footer={
        <>
          <Button disabled={isConfirming} onClick={onCancel} variant="ghost">
            {cancelLabel}
          </Button>
          <Button
            isLoading={isConfirming}
            onClick={onConfirm}
            variant={tone === "danger" ? "danger" : "primary"}
          >
            {confirmLabel}
          </Button>
        </>
      }
      isOpen={isOpen}
      onClose={onCancel}
      size="small"
      title={title}
    >
      <p className="confirm-message">This action requires confirmation.</p>
    </Modal>
  );
}
