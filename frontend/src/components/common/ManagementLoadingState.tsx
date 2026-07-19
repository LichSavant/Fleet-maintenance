import { LoadingSpinner } from "./LoadingSpinner";

export interface ManagementLoadingStateProps {
  label: string;
}

export function ManagementLoadingState({ label }: ManagementLoadingStateProps) {
  return (
    <div className="management-loading" role="status">
      <LoadingSpinner label={label} />
      <p>{label}</p>
    </div>
  );
}
