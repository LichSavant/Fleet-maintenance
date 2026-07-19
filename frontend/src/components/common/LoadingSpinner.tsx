import { classNames } from "../../utils/classNames";

export interface LoadingSpinnerProps {
  label?: string;
  size?: "small" | "medium" | "large";
}

export function LoadingSpinner({
  label = "Loading",
  size = "medium",
}: LoadingSpinnerProps) {
  return (
    <span className="loading-spinner-wrap" role="status">
      <span
        aria-hidden="true"
        className={classNames("loading-spinner", `loading-spinner-${size}`)}
      />
      <span className="sr-only">{label}</span>
    </span>
  );
}
