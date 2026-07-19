import { Button } from "../ui/Button";

export interface RecordActionsProps {
  deactivateDisabled?: boolean;
  onDeactivate: () => void;
  onEdit: () => void;
  onView: () => void;
}

export function RecordActions({
  deactivateDisabled = false,
  onDeactivate,
  onEdit,
  onView,
}: RecordActionsProps) {
  return (
    <div className="record-actions">
      <Button onClick={onView} size="small" variant="ghost">
        View
      </Button>
      <Button onClick={onEdit} size="small" variant="secondary">
        Edit
      </Button>
      <Button
        disabled={deactivateDisabled}
        onClick={onDeactivate}
        size="small"
        variant="danger"
      >
        Deactivate
      </Button>
    </div>
  );
}
