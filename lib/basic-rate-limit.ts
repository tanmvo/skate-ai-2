/**
 * Basic in-memory rate limiting for closed beta
 * Simple implementation to prevent abuse during beta testing
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimits = new Map<string, RateLimitEntry>()

export async function checkBasicRateLimit(
  key: string,
  limit: number,
  windowSec: number
): Promise<{ allowed: boolean; remaining: number }> {
  const now = Date.now()
  const entry = rateLimits.get(key)

  if (!entry || now > entry.resetTime) {
    rateLimits.set(key, { count: 1, resetTime: now + (windowSec * 1000) })
    return { allowed: true, remaining: limit - 1 }
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0 }
  }

  entry.count++
  return { allowed: true, remaining: limit - entry.count }
}

/**
 * Rate limiting configuration for different operations
 */
export const RATE_LIMITS = {
  SIGNUP: { limit: 5, window: 3600 }, // 5 signups per hour per IP
  SIGNIN: { limit: 10, window: 900 },  // 10 signin attempts per 15 min per IP
  API_GENERAL: { limit: 100, window: 60 } // 100 API calls per minute per user
} as const

/**
 * Clean up expired rate limit entries periodically
 */
export function cleanupExpiredRateLimits() {
  const now = Date.now()
  for (const [key, entry] of rateLimits.entries()) {
    if (now > entry.resetTime) {
      rateLimits.delete(key)
    }
  }
}

// Clean up expired entries every 5 minutes
if (typeof window === 'undefined') { // Only run on server
  setInterval(cleanupExpiredRateLimits, 5 * 60 * 1000)
}