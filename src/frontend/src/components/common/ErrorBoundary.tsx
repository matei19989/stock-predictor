import { Component, type ReactNode, type ErrorInfo } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  resetKey: number;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, resetKey: 0 };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback ?? (
        <div className="flex min-h-[400px] flex-col items-center justify-center gap-4 p-8 text-center">
          <h2 className="text-xl font-semibold text-destructive">Something went wrong</h2>
          <p className="max-w-sm text-sm text-muted-foreground">{this.state.error?.message}</p>
          <button
            className="text-sm underline hover:no-underline"
            onClick={() => this.setState((prev) => ({ hasError: false, error: null, resetKey: prev.resetKey + 1 }))}
          >
            Try again
          </button>
        </div>
      );
    }
    return (
      <div key={this.state.resetKey}>
        {this.props.children}
      </div>
    );
  }
}
