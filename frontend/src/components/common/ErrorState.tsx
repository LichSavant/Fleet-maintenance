import { Button } from "../ui/Button";
import { Icon } from "../ui/Icon";

export interface ErrorStateProps {
  description: string;
  onRetry?: () => void;
  retryLabel?: string;
  title: string;
}

export function ErrorState({
  description,
  onRetry,
  retryLabel = "Try again",
  title,
}: ErrorStateProps) {
  return (
    <div className="state-panel" role="alert">
      <span className="state-icon state-icon-danger" aria-hidden="true">
        <Icon name="alert" />
      </span>
      <h3>{title}</h3>
      <p>{description}</p>
      {onRetry && (
        <div className="state-action">
          <Button onClick={onRetry} variant="secondary">
            {retryLabel}
          </Button>
        </div>
      )}
    </div>
  );
}
