import * as Sentry from '@sentry/react';
import { Integrations } from '@sentry/tracing';
import { init as initApm } from '@elastic/apm-rum';
import * as NewRelic from 'newrelic';
import winston from 'winston';
import { DatadogWinston } from 'datadog-winston';
import { metrics } from 'datadog-metrics';
import { onCLS, onFID, onLCP } from 'web-vitals';

// Initialize Sentry
export const initSentry = () => {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [new Integrations.BrowserTracing()],
    tracesSampleRate: 1.0,
    environment: process.env.NODE_ENV,
    beforeSend(event) {
      if (process.env.NODE_ENV !== 'production') {
        return null;
      }
      return event;
    },
  });
};

// Initialize Elastic APM
export const initApmMonitoring = () => {
  const apm = initApm({
    serviceName: 'eriethio-cms',
    serverUrl: process.env.ELASTIC_APM_SERVER_URL,
    environment: process.env.NODE_ENV,
    distributedTracingOrigins: ['http://localhost:3000'],
  });

  return apm;
};

// Initialize Winston Logger with Datadog
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.Console(),
    new DatadogWinston({
      apiKey: process.env.DATADOG_API_KEY,
      hostname: 'eriethio-cms',
      service: 'cms',
      ddsource: 'nodejs',
    }),
  ],
});

// Initialize Datadog Metrics
export const initDatadogMetrics = () => {
  metrics.init({
    host: 'eriethio-cms',
    prefix: 'cms.',
    defaultTags: [`env:${process.env.NODE_ENV}`],
  });
};

// Performance Monitoring
export const initPerformanceMonitoring = () => {
  // Core Web Vitals monitoring
  onCLS(metric => {
    metrics.gauge('web_vitals.cls', metric.value);
    logger.info('CLS Update', { metric });
  });

  onFID(metric => {
    metrics.gauge('web_vitals.fid', metric.value);
    logger.info('FID Update', { metric });
  });

  onLCP(metric => {
    metrics.gauge('web_vitals.lcp', metric.value);
    logger.info('LCP Update', { metric });
  });

  // Custom performance metrics
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      metrics.gauge(`performance.${entry.name}`, entry.duration);
      logger.info('Performance Entry', { entry });
    });
  });

  observer.observe({ entryTypes: ['measure', 'resource', 'navigation'] });
};

// Error Monitoring
export const initErrorMonitoring = () => {
  window.addEventListener('error', (event) => {
    Sentry.captureException(event.error);
    logger.error('Uncaught Error', { error: event.error });
  });

  window.addEventListener('unhandledrejection', (event) => {
    Sentry.captureException(event.reason);
    logger.error('Unhandled Promise Rejection', { reason: event.reason });
  });
};

// API Monitoring
export const initApiMonitoring = () => {
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const startTime = performance.now();
    try {
      const response = await originalFetch(...args);
      const endTime = performance.now();
      
      metrics.histogram('api.response_time', endTime - startTime, {
        endpoint: args[0].toString(),
        status: response.status.toString(),
      });

      if (!response.ok) {
        logger.warn('API Error', {
          endpoint: args[0],
          status: response.status,
          statusText: response.statusText,
        });
      }

      return response;
    } catch (error) {
      logger.error('API Request Failed', {
        endpoint: args[0],
        error,
      });
      throw error;
    }
  };
};

// Resource Monitoring
export const initResourceMonitoring = () => {
  const resourceObserver = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.entryType === 'resource') {
        metrics.histogram('resource.load_time', entry.duration, {
          type: entry.initiatorType,
          name: entry.name,
        });
      }
    });
  });

  resourceObserver.observe({ entryTypes: ['resource'] });
};

// Memory Monitoring
export const initMemoryMonitoring = () => {
  setInterval(() => {
    if (performance.memory) {
      metrics.gauge('memory.used', performance.memory.usedJSHeapSize);
      metrics.gauge('memory.total', performance.memory.totalJSHeapSize);
      
      if (performance.memory.usedJSHeapSize / performance.memory.totalJSHeapSize > 0.9) {
        logger.warn('High Memory Usage', {
          used: performance.memory.usedJSHeapSize,
          total: performance.memory.totalJSHeapSize,
        });
      }
    }
  }, 60000);
};

// User Experience Monitoring
export const initUxMonitoring = () => {
  // Track page load
  window.addEventListener('load', () => {
    const navigationEntry = performance.getEntriesByType('navigation')[0];
    metrics.gauge('page.load_time', navigationEntry.duration);
  });

  // Track user interactions
  document.addEventListener('click', () => {
    metrics.increment('user.clicks');
  });

  // Track form submissions
  document.addEventListener('submit', () => {
    metrics.increment('user.form_submissions');
  });
};

// Initialize all monitoring
export const initMonitoring = () => {
  initSentry();
  initApmMonitoring();
  initDatadogMetrics();
  initPerformanceMonitoring();
  initErrorMonitoring();
  initApiMonitoring();
  initResourceMonitoring();
  initMemoryMonitoring();
  initUxMonitoring();

  logger.info('Monitoring initialized');
};
