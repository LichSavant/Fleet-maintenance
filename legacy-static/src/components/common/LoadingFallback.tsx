import { LoadingSpinner } from "./LoadingSpinner";

export function LoadingFallback() {
  return (
    <main className="status-page" aria-busy="true" aria-live="polite">
      <LoadingSpinner label="Loading ForgeFleet" size="large" />
      <p>Loading ForgeFleet…</p>
    </main>
  );
}
