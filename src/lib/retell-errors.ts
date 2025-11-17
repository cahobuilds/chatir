/**
 * Retell API Error Handling Utilities
 * Provides typed error handling for Retell SDK operations
 */

import {
  APIError,
  APIConnectionError,
  APIConnectionTimeoutError,
  RateLimitError,
  AuthenticationError,
  NotFoundError,
  BadRequestError,
  InternalServerError,
} from 'retell-sdk';

export interface RetellErrorDetails {
  message: string;
  status?: number;
  type: 'api' | 'connection' | 'timeout' | 'rate_limit' | 'auth' | 'not_found' | 'bad_request' | 'server_error' | 'unknown';
  retryable: boolean;
}

/**
 * Extracts error details from Retell SDK errors
 */
export function extractRetellError(error: unknown): RetellErrorDetails {
  // Handle Retell SDK typed errors
  if (error instanceof APIError) {
    return {
      message: error.message,
      status: error.status,
      type: 'api',
      retryable: isRetryableStatus(error.status),
    };
  }

  if (error instanceof APIConnectionError) {
    return {
      message: error.message || 'Failed to connect to Retell API',
      type: 'connection',
      retryable: true, // Connection errors are always retryable
    };
  }

  if (error instanceof APIConnectionTimeoutError) {
    return {
      message: error.message || 'Request to Retell API timed out',
      type: 'timeout',
      retryable: true, // Timeouts are retryable
    };
  }

  if (error instanceof RateLimitError) {
    return {
      message: error.message || 'Rate limit exceeded',
      status: error.status,
      type: 'rate_limit',
      retryable: true, // Rate limits are retryable after delay
    };
  }

  if (error instanceof AuthenticationError) {
    return {
      message: error.message || 'Authentication failed',
      status: error.status,
      type: 'auth',
      retryable: false, // Auth errors are not retryable
    };
  }

  if (error instanceof NotFoundError) {
    return {
      message: error.message || 'Resource not found',
      status: error.status,
      type: 'not_found',
      retryable: false, // Not found errors are not retryable
    };
  }

  if (error instanceof BadRequestError) {
    return {
      message: error.message || 'Bad request',
      status: error.status,
      type: 'bad_request',
      retryable: false, // Bad request errors are not retryable
    };
  }

  if (error instanceof InternalServerError) {
    return {
      message: error.message || 'Internal server error',
      status: error.status,
      type: 'server_error',
      retryable: true, // Server errors are retryable
    };
  }

  // Handle generic errors
  if (error instanceof Error) {
    return {
      message: error.message,
      type: 'unknown',
      retryable: false,
    };
  }

  return {
    message: 'Unknown error occurred',
    type: 'unknown',
    retryable: false,
  };
}

/**
 * Determines if an HTTP status code is retryable
 */
function isRetryableStatus(status?: number): boolean {
  if (!status) return false;
  
  // Retryable status codes:
  // - 408 Request Timeout
  // - 409 Conflict (sometimes retryable)
  // - 429 Too Many Requests
  // - 5xx Server Errors
  return status === 408 || status === 429 || (status >= 500 && status < 600);
}

/**
 * Formats error for user-friendly display
 */
export function formatRetellError(error: unknown): string {
  const details = extractRetellError(error);

  switch (details.type) {
    case 'api':
      if (details.status === 401) {
        return 'Invalid Retell API key. Please check your credentials.';
      }
      if (details.status === 403) {
        return 'Access denied. Please check your Retell API permissions.';
      }
      if (details.status === 404) {
        return 'Resource not found in Retell API.';
      }
      if (details.status === 429) {
        return 'Rate limit exceeded. Please try again later.';
      }
      if (details.status && details.status >= 500) {
        return 'Retell API server error. Please try again later.';
      }
      return details.message || 'Retell API error occurred.';

    case 'connection':
      return 'Failed to connect to Retell API. Please check your internet connection.';

    case 'timeout':
      return 'Request to Retell API timed out. Please try again.';

    case 'rate_limit':
      return 'Rate limit exceeded. Please try again later.';

    case 'auth':
      return 'Invalid Retell API key. Please check your credentials.';

    case 'not_found':
      return 'Resource not found in Retell API.';

    case 'bad_request':
      return details.message || 'Invalid request. Please check your parameters.';

    case 'server_error':
      return 'Retell API server error. Please try again later.';

    default:
      return details.message || 'An unexpected error occurred.';
  }
}

/**
 * Logs error details for debugging
 */
export function logRetellError(error: unknown, context?: string): void {
  const details = extractRetellError(error);
  const prefix = context ? `[Retell ${context}]` : '[Retell]';

  console.error(`${prefix} Error:`, {
    type: details.type,
    message: details.message,
    status: details.status,
    retryable: details.retryable,
    originalError: error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error,
  });
}

