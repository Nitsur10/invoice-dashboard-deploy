'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, MessageCircle } from 'lucide-react';
import { Button } from './button';
import { Card, CardContent, CardHeader, CardTitle } from './card';

interface Props {
  children: ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  level?: 'page' | 'component' | 'feature';
  context?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Error Boundary component following React best practices
 * Provides graceful error handling with recovery options
 */
export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.group('🚨 Error Boundary Caught Error');
      console.error('Error:', error);
      console.error('Error Info:', errorInfo);
      console.error('Context:', this.props.context || 'Unknown');
      console.groupEnd();
    }

    // In production, you would send this to your error reporting service
    // Example: Sentry, LogRocket, Bugsnag, etc.
    this.logErrorToService(error, errorInfo);

    this.setState({
      error,
      errorInfo,
    });
  }

  private logErrorToService = (error: Error, errorInfo: ErrorInfo) => {
    // TODO: Integrate with your error reporting service
    // Example for Sentry:
    // Sentry.captureException(error, {
    //   contexts: {
    //     react: {
    //       componentStack: errorInfo.componentStack,
    //     },
    //   },
    //   tags: {
    //     section: this.props.context || 'unknown',
    //     level: this.props.level || 'component',
    //   },
    // });
    
    // For now, log to console in production as well
    console.error('Error logged:', { error, errorInfo, context: this.props.context });
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleGoHome = () => {
    window.location.href = '/';
  };

  private handleReport = () => {
    // Open support/feedback mechanism
    const subject = encodeURIComponent(`Dashboard Error Report: ${this.state.error?.name || 'Unknown Error'}`);
    const body = encodeURIComponent(`
Error Details:
- Context: ${this.props.context || 'Unknown'}
- Level: ${this.props.level || 'component'}
- Error: ${this.state.error?.message || 'Unknown error'}
- User Agent: ${navigator.userAgent}
- Timestamp: ${new Date().toISOString()}

Please describe what you were doing when this error occurred:
    `.trim());
    
    window.open(`mailto:support@rudraprojects.com?subject=${subject}&body=${body}`);
  };

  public render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} resetError={this.handleReset} />;
      }

      // Default error UI based on error level
      return this.renderErrorUI();
    }

    return this.props.children;
  }

  private renderErrorUI() {
    const { level = 'component', context } = this.props;
    const { error } = this.state;

    if (level === 'page') {
      return (
        <div className="min-h-screen flex items-center justify-center p-4 dashboard-bg">
          <Card className="max-w-lg w-full glass-card border-red-200/50 dark:border-red-800/30">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center mb-4">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
              <CardTitle className="text-xl text-red-900 dark:text-red-100">
                Page Error
              </CardTitle>
              <p className="text-sm text-red-700 dark:text-red-300 mt-2">
                Something went wrong loading this page
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {process.env.NODE_ENV === 'development' && (
                <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-md border border-red-200 dark:border-red-800/30">
                  <p className="text-xs text-red-800 dark:text-red-200 font-mono break-all">
                    {error?.message || 'Unknown error occurred'}
                  </p>
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button 
                  onClick={this.handleGoHome} 
                  className="flex-1"
                  variant="default"
                >
                  <Home className="w-4 h-4 mr-2" />
                  Go Home
                </Button>
                <Button 
                  onClick={this.handleReload} 
                  variant="outline"
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Reload Page
                </Button>
              </div>
              <Button 
                onClick={this.handleReport}
                variant="ghost" 
                size="sm"
                className="w-full text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Report Issue
              </Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    // Component-level error UI
    return (
      <Card className="glass-card border-amber-200/50 dark:border-amber-800/30 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-amber-900 dark:text-amber-100">
                {context ? `${context} Error` : 'Component Error'}
              </h3>
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                This section couldn't load properly
              </p>
              {process.env.NODE_ENV === 'development' && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2 font-mono break-all">
                  {error?.message}
                </p>
              )}
            </div>
            <div className="flex-shrink-0">
              <Button 
                onClick={this.handleReset}
                variant="ghost" 
                size="sm"
                className="text-amber-700 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-200 h-6 px-2"
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
}

/**
 * Higher-order component for wrapping components with error boundaries
 */
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
}

/**
 * Hook for manual error reporting
 */
export const useErrorHandler = () => {
  const reportError = React.useCallback((error: Error, context?: string) => {
    // Log error and trigger error boundary
    console.error('Manual error report:', { error, context });
    
    // In a real app, you'd report to your error service here
    throw error;
  }, []);

  return { reportError };
};