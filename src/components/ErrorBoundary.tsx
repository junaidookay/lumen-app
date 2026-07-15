import { Component, type ReactNode, type ErrorInfo } from "react";
import { captureError } from "@/lib/monitoring/errors";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  boundary: string;
  onError?: (error: Error) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    captureError(error, {
      boundary: this.props.boundary,
      componentStack: info.componentStack,
    });
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback ?? (
          <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-destructive/20 bg-destructive/5 p-6">
            <div className="text-center">
              <p className="text-sm font-medium text-destructive">Something went wrong</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {this.state.error?.message ?? "An unexpected error occurred"}
              </p>
              <button
                onClick={() => this.setState({ hasError: false, error: null })}
                className="mt-3 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
              >
                Try again
              </button>
            </div>
          </div>
        )
      );
    }

    return this.props.children;
  }
}
