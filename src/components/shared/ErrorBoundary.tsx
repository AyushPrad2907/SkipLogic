import { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { normalizeError, AppError } from '@/lib/errors';
import { logger } from '@/lib/logger';
import { AlertTriangle, RefreshCw, RotateCcw, ShieldAlert } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: AppError | null;
  showDiagnostics: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      showDiagnostics: false,
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    const normalized = normalizeError(error, 'UNKNOWN_ERROR');
    return {
      hasError: true,
      error: normalized,
      showDiagnostics: false,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const normalized = normalizeError(error, 'UNKNOWN_ERROR');
    logger.error('React ErrorBoundary caught unhandled error', {
      category: normalized.category,
      code: normalized.code,
      componentStack: errorInfo.componentStack,
    });
  }

  handleReset = (): void => {
    if (this.props.onReset) {
      this.props.onReset();
    }
    this.setState({
      hasError: false,
      error: null,
      showDiagnostics: false,
    });
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      const { fallbackTitle = 'Something went wrong while rendering this section' } = this.props;
      const { error, showDiagnostics } = this.state;
      const isDev = process.env.NODE_ENV !== 'production';

      return (
        <Card className="p-6 border-danger/40 bg-surface space-y-4 max-w-2xl mx-auto my-6 shadow-xl">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-danger/10 text-danger rounded-xl shrink-0 border border-danger/20">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-text-primary">{fallbackTitle}</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                {error?.userMessage || 'An unexpected failure occurred. Please try again.'}
              </p>
            </div>
          </div>

          {/* Action controls */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50">
            <Button
              onClick={this.handleReset}
              className="flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Try Again
            </Button>
            <Button
              variant="secondary"
              onClick={this.handleReload}
              className="flex items-center gap-1.5 cursor-pointer text-xs"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Reload Application
            </Button>

            {isDev && error && (
              <button
                onClick={() => this.setState({ showDiagnostics: !showDiagnostics })}
                className="text-[11px] font-mono text-text-muted hover:text-text-primary ml-auto underline cursor-pointer"
              >
                {showDiagnostics ? 'Hide Diagnostics' : 'Show Dev Diagnostics'}
              </button>
            )}
          </div>

          {/* Development-only diagnostics accordion */}
          {isDev && showDiagnostics && error && (
            <div className="p-3 bg-surface-elevated border border-border/80 rounded-lg text-xs font-mono space-y-1 text-text-muted overflow-x-auto">
              <div className="flex items-center gap-2 text-danger font-bold">
                <ShieldAlert className="h-3.5 w-3.5" /> Diagnostic Details (Dev Only)
              </div>
              <div>Category: <strong className="text-text-primary">{error.category}</strong></div>
              <div>Code: <strong className="text-text-primary">{error.code}</strong></div>
              {error.technicalDetails && (
                <div className="mt-1 pt-1 border-t border-border/40 whitespace-pre-wrap text-[11px]">
                  {error.technicalDetails}
                </div>
              )}
            </div>
          )}
        </Card>
      );
    }

    return this.props.children;
  }
}
