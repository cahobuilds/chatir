/**
 * Structured Logger Utility
 * Provides consistent logging across the application with different log levels
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment: boolean;
  private isServer: boolean;

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
    this.isServer = typeof window === 'undefined';
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const prefix = this.isServer ? '[SERVER]' : '[CLIENT]';
    const levelUpper = level.toUpperCase().padEnd(5);
    
    if (context) {
      return `${timestamp} ${prefix} [${levelUpper}] ${message} ${JSON.stringify(context)}`;
    }
    return `${timestamp} ${prefix} [${levelUpper}] ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    // In production, only log warn and error
    if (!this.isDevelopment) {
      return level === 'warn' || level === 'error';
    }
    // In development, log everything
    return true;
  }

  debug(message: string, context?: LogContext): void {
    if (this.shouldLog('debug')) {
      console.debug(this.formatMessage('debug', message, context));
    }
  }

  info(message: string, context?: LogContext): void {
    if (this.shouldLog('info')) {
      console.log(this.formatMessage('info', message, context));
    }
  }

  warn(message: string, context?: LogContext): void {
    if (this.shouldLog('warn')) {
      console.warn(this.formatMessage('warn', message, context));
    }
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    if (this.shouldLog('error')) {
      const errorContext = {
        ...context,
        error: error instanceof Error 
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : error,
      };
      console.error(this.formatMessage('error', message, errorContext));
    }
  }

  // Specialized logging methods
  api(method: string, path: string, statusCode?: number, duration?: number, context?: LogContext): void {
    const apiContext = {
      method,
      path,
      statusCode,
      duration: duration ? `${duration}ms` : undefined,
      ...context,
    };
    if (statusCode && statusCode >= 400) {
      this.error(`API ${method} ${path}`, undefined, apiContext);
    } else {
      this.info(`API ${method} ${path}`, apiContext);
    }
  }

  sse(event: string, interactionId?: string, context?: LogContext): void {
    this.info(`SSE Event: ${event}`, {
      interactionId,
      ...context,
    });
  }
}

// Export singleton instance
export const logger = new Logger();

// Export type for use in other files
export type { LogLevel, LogContext };

