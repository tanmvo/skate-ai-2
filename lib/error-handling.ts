/**
 * Error handling utilities for chat and API error management
 */

export interface RetryOptions {
  maxAttempts: number;
  delay: number;
  backoff: boolean;
}

export const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  delay: 1000,
  backoff: true,
};

export class ChatError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'ChatError';
  }
}

export class RateLimitError extends ChatError {
  constructor(retryAfter?: number) {
    super(
      'Too many requests. Please wait a moment before trying again.',
      'RATE_LIMIT_EXCEEDED',
      429,
      true
    );
    this.retryAfter = retryAfter;
  }
  
  retryAfter?: number;
}

export class ServiceUnavailableError extends ChatError {
  constructor(service: string) {
    super(
      `${service} is temporarily unavailable. Please try again later.`,
      'SERVICE_UNAVAILABLE',
      503,
      true
    );
  }
}

export class OverloadedError extends ChatError {
  constructor(retryAfter?: number) {
    super(
      'Claude is experiencing high load. Retrying automatically...',
      'OVERLOADED_ERROR',
      529,
      true
    );
    this.retryAfter = retryAfter;
  }

  retryAfter?: number;
}

export function sanitizeError(error: unknown): { message: string; code: string; retryable: boolean } {
  if (error instanceof ChatError) {
    return {
      message: error.message,
      code: error.code,
      retryable: error.retryable,
    };
  }

  if (error instanceof Error) {
    // Sanitize common error patterns
    const message = error.message;
    
    // Database connection errors
    if (message.includes('connect') && message.includes('database')) {
      return {
        message: 'Database temporarily unavailable. Please try again.',
        code: 'DATABASE_ERROR',
        retryable: true,
      };
    }
    
    // API key errors
    if (message.includes('API key') || message.includes('authentication')) {
      return {
        message: 'AI service temporarily unavailable.',
        code: 'AUTH_ERROR',
        retryable: false,
      };
    }
    
    // Timeout errors
    if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
      return {
        message: 'Request timed out. Please try again.',
        code: 'TIMEOUT_ERROR',
        retryable: true,
      };
    }
    
    // Network errors
    if (message.includes('network') || message.includes('ECONNREFUSED')) {
      return {
        message: 'Network error. Please check your connection.',
        code: 'NETWORK_ERROR',
        retryable: true,
      };
    }

    // Claude overloaded errors (from stream)
    if (message.includes('overloaded_error') || message.includes('Overloaded')) {
      return {
        message: 'Claude is experiencing high load. Retrying automatically...',
        code: 'OVERLOADED_ERROR',
        retryable: true,
      };
    }
  }

  // Generic fallback
  return {
    message: 'An unexpected error occurred. Please try again.',
    code: 'UNKNOWN_ERROR',
    retryable: true,
  };
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: unknown;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on non-retryable errors
      const sanitized = sanitizeError(error);
      if (!sanitized.retryable) {
        throw error;
      }
      
      // Don't retry on final attempt
      if (attempt === config.maxAttempts) {
        throw error;
      }
      
      // Calculate delay with optional backoff
      const delay = config.backoff 
        ? config.delay * Math.pow(2, attempt - 1)
        : config.delay;
      
      console.warn(`Attempt ${attempt} failed, retrying in ${delay}ms:`, sanitized.message);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timeoutId));
  });
}

// Rate limiting storage (in-memory for MVP, move to Redis for production)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  maxRequests: number = 20,
  windowMs: number = 60000 // 1 minute
): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const key = `rate_limit:${identifier}`;
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // Reset window
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true };
  }
  
  if (current.count >= maxRequests) {
    const retryAfter = Math.ceil((current.resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  // Increment counter
  current.count++;
  rateLimitStore.set(key, current);
  
  return { allowed: true };
}

// Cleanup old rate limit entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now > value.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 300000); // Cleanup every 5 minutes

// Retry utilities for overloaded errors
export function calculateRetryDelay(attempt: number): number {
  // Exponential backoff: 1s, 2s, 4s
  return Math.min(1000 * Math.pow(2, attempt - 1), 4000);
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface RetryState {
  attempt: number;
  isRetrying: boolean;
  retryCountdown: number;
  maxAttempts: number;
}

export const DEFAULT_RETRY_STATE: RetryState = {
  attempt: 0,
  isRetrying: false,
  retryCountdown: 0,
  maxAttempts: 3,
};