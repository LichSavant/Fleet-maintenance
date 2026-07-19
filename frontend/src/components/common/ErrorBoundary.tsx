import { Component, type ErrorInfo, type ReactNode } from "react";

import { Button } from "../ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ForgeFleet render error", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <main className="status-page" id="main-content">
          <section className="status-card" aria-labelledby="error-title">
            <p className="eyebrow">Application error</p>
            <h1 id="error-title">ForgeFleet could not load this screen.</h1>
            <p>
              Reload the application to try again. No data was submitted by this
              page.
            </p>
            <Button onClick={() => window.location.reload()} type="button">
              Reload application
            </Button>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}
