"use client";

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  context?: string; // Additional context for error reporting
}

interface State {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary specifically for citation components to prevent crashes
 * from propagating up and breaking the entire chat interface
 */
export class CitationErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const contextInfo = this.props.context ? `[${this.props.context}]` : '';
    console.error(`Citation component error ${contextInfo}:`, error, errorInfo);
    
    // Call custom error handler if provided
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo);
      } catch (handlerError) {
        console.error('Error handler failed:', handlerError);
      }
    }
  }

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI or default fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="my-2 p-2 bg-red-50 dark:bg-red-950/20 rounded text-red-700 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          <span>Failed to render citation. Message content is preserved.</span>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * HOC to wrap components with citation error boundary
 */
export function withCitationErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function CitationErrorBoundaryWrapper(props: P) {
    return (
      <CitationErrorBoundary fallback={fallback}>
        <WrappedComponent {...props} />
      </CitationErrorBoundary>
    );
  };
}