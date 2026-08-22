/**
 * ErrorBoundary — top-level React error boundary.
 * Catches any unhandled render error and shows a recovery UI instead of
 * a black / blank screen.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <App />
 *   </ErrorBoundary>
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Optional custom fallback element */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });
    // Log to console so devs can still inspect
    console.error('[ErrorBoundary] Unhandled render error:', error, errorInfo);
  }

  private handleReload = () => {
    // Clear cached React state and force a clean reload
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center space-y-6">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto rounded-2xl bg-destructive/10 border border-destructive/30 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>

            {/* Heading */}
            <div>
              <h1 className="text-xl font-bold text-foreground mb-2">
                Something went wrong
              </h1>
              <p className="text-sm text-muted-foreground">
                An unexpected error occurred. Your data is safe — this is a display problem only.
              </p>
            </div>

            {/* Error detail (dev-friendly, collapsed) */}
            {this.state.error && (
              <details className="text-left text-xs text-muted-foreground bg-muted rounded-xl p-3 cursor-pointer">
                <summary className="font-medium mb-1">Error details</summary>
                <pre className="whitespace-pre-wrap break-words mt-2 opacity-70">
                  {this.state.error.message}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReload}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Reload page
              </button>
              <button
                onClick={this.handleGoHome}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-border text-sm font-medium text-foreground hover:bg-accent transition-colors"
              >
                Go to home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
