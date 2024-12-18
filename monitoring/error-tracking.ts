import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import { apm } from '@elastic/apm-rum';
import winston from 'winston';
import { metrics } from 'datadog-metrics';

// Error types and severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface ErrorContext {
  user?: {
    id: string;
    email: string;
    role: string;
  };
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

// Initialize error tracking
export const initErrorTracking = () => {
  // Sentry initialization
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      new Integrations.BrowserTracing(),
      new Integrations.GlobalHandlers({
        onerror: true,
        onunhandledrejection: true,
      }),
    ],
    tracesSampleRate: 1.0,
    environment: process.env.NODE_ENV,
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'xhr') {
        // Remove sensitive data from XHR breadcrumbs
        delete breadcrumb.data?.params;
        delete breadcrumb.data?.headers?.Authorization;
      }
      return breadcrumb;
    },
    beforeSend(event) {
      // Remove sensitive data from error reports
      if (event.request?.headers?.Authorization) {
        delete event.request.headers.Authorization;
      }
      return event;
    },
  });

  // Global error handlers
  window.onerror = (message, source, lineno, colno, error) => {
    handleError(error || new Error(message as string), {
      tags: {
        source: source || 'unknown',
        type: 'uncaught_error',
      },
      extra: {
        line: lineno,
        column: colno,
      },
    });
    return false;
  };

  window.onunhandledrejection = (event) => {
    handleError(event.reason, {
      tags: {
        type: 'unhandled_promise',
      },
    });
  };

  // React error boundary
  class ErrorBoundary extends React.Component {
    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
      handleError(error, {
        tags: {
          type: 'react_error',
        },
        extra: errorInfo,
      });
    }

    render() {
      return this.props.children;
    }
  }

  return ErrorBoundary;
};

// Main error handling function
export const handleError = (
  error: Error,
  context: ErrorContext = {},
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
) => {
  // Log to Sentry
  Sentry.withScope(scope => {
    if (context.user) {
      scope.setUser(context.user);
    }
    if (context.tags) {
      scope.setTags(context.tags);
    }
    if (context.extra) {
      scope.setExtras(context.extra);
    }
    scope.setLevel(severityToSentryLevel(severity));
    Sentry.captureException(error);
  });

  // Log to Elastic APM
  apm.captureError(error, {
    custom: context.extra,
    tags: context.tags,
    user: context.user,
  });

  // Log to Winston
  logger.error(error.message, {
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
    },
    context,
    severity,
  });

  // Track in Datadog
  metrics.increment('errors', 1, [
    `severity:${severity}`,
    `type:${error.name}`,
    ...(context.tags ? Object.entries(context.tags).map(([k, v]) => `${k}:${v}`) : []),
  ]);
};

// API error handling
export const handleApiError = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const error = new Error(errorData.message || 'API Error');
    
    handleError(error, {
      tags: {
        type: 'api_error',
        status: response.status.toString(),
        endpoint: response.url,
      },
      extra: errorData,
    }, getApiErrorSeverity(response.status));
    
    throw error;
  }
  return response;
};

// React Query error handling
export const queryErrorHandler = (error: unknown) => {
  if (error instanceof Error) {
    handleError(error, {
      tags: {
        type: 'query_error',
      },
    });
  }
};

// Custom error classes
export class ValidationError extends Error {
  constructor(message: string, public fields: Record<string, string>) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message = 'Not authorized') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

// Error monitoring and analytics
export const initErrorMonitoring = () => {
  setInterval(() => {
    // Monitor error rates
    const errorMetrics = Sentry.getCurrentHub()
      .getClient()
      ?.getTransport()
      ?.getMetrics();

    if (errorMetrics) {
      Object.entries(errorMetrics).forEach(([key, value]) => {
        metrics.gauge(`errors.${key}`, value);
      });
    }
  }, 60000);
};

// Helper functions
const severityToSentryLevel = (severity: ErrorSeverity): Sentry.SeverityLevel => {
  switch (severity) {
    case ErrorSeverity.LOW:
      return 'warning';
    case ErrorSeverity.MEDIUM:
      return 'error';
    case ErrorSeverity.HIGH:
      return 'error';
    case ErrorSeverity.CRITICAL:
      return 'fatal';
    default:
      return 'error';
  }
};

const getApiErrorSeverity = (status: number): ErrorSeverity => {
  if (status >= 500) return ErrorSeverity.HIGH;
  if (status >= 400) return ErrorSeverity.MEDIUM;
  return ErrorSeverity.LOW;
};

// Error reporting hooks
export const useErrorHandler = () => {
  const queryClient = useQueryClient();

  return React.useCallback(
    (error: unknown, context?: ErrorContext) => {
      handleError(
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      
      // Invalidate queries on error if needed
      if (error instanceof AuthenticationError) {
        queryClient.invalidateQueries('auth');
      }
    },
    [queryClient]
  );
};

// Error boundary component with retry capability
export const ErrorBoundaryWithRetry = ({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: React.ComponentType<{ error: Error; resetError: () => void }>;
}) => {
  return (
    <Sentry.ErrorBoundary
      fallback={({ error, resetError }) => (
        <fallback.type error={error} resetError={resetError} />
      )}
    >
      {children}
    </Sentry.ErrorBoundary>
  );
};
