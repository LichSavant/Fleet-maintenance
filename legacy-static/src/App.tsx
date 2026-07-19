import { Suspense } from "react";
import { BrowserRouter } from "react-router-dom";

import { ErrorBoundary } from "./components/common/ErrorBoundary";
import { LoadingFallback } from "./components/common/LoadingFallback";
import { AuthProvider } from "./context/AuthContext";
import { AppRoutes } from "./routes/AppRoutes";

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<LoadingFallback />}>
            <AppRoutes />
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
