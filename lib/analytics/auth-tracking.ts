import { trackServerEvent } from './server-analytics'

/**
 * Authentication analytics tracking
 * Focuses on high-impact events for troubleshooting (Pareto principle)
 */

// Track successful authentication events
export async function trackAuthSuccess(
  event: 'auth_signup_success' | 'auth_signin_success',
  properties: {
    method: 'google' | 'email' | 'credentials'
    user_id?: string
    email_domain?: string
    signup_source?: 'direct_link' | 'invitation' | 'organic'
  },
  userId?: string
) {
  return trackServerEvent(event, {
    auth_method: properties.method,
    email_domain: properties.email_domain,
    signup_source: properties.signup_source,
    first_time_user: event === 'auth_signup_success',
  }, userId || properties.user_id)
}

// Track authentication errors
export async function trackAuthError(
  event: 'auth_signup_error' | 'auth_signin_error',
  properties: {
    error_type: 'validation_failed' | 'duplicate_email' | 'wrong_credentials' | 'google_oauth_failed' | 'rate_limited' | 'network_error' | 'server_error'
    error_message?: string
    auth_method: 'google' | 'email' | 'credentials'
    field?: 'email' | 'password' | 'name'
    ip_address?: string
  }
) {
  return trackServerEvent(event, {
    error_type: properties.error_type,
    error_message: properties.error_message,
    auth_method: properties.auth_method,
    failed_field: properties.field,
    // Don't log full IP for privacy, just general location info
    has_ip: !!properties.ip_address,
  })
}

// Track rate limiting events
export async function trackRateLimit(
  endpoint: 'signup' | 'signin',
  properties: {
    ip_address?: string
    attempts_count: number
    window_seconds: number
  }
) {
  return trackServerEvent('auth_rate_limit_hit', {
    endpoint,
    attempts_count: properties.attempts_count,
    window_seconds: properties.window_seconds,
    has_ip: !!properties.ip_address,
  })
}

// Track page visits for conversion analysis
export async function trackAuthPageVisit(
  page: 'signin' | 'signup',
  properties?: {
    referrer?: string
    user_agent?: string
    is_returning_user?: boolean
  }
) {
  return trackServerEvent('auth_page_visit', {
    page_type: page,
    has_referrer: !!properties?.referrer,
    is_returning_user: properties?.is_returning_user || false,
  })
}

// Track Google OAuth specific issues
export async function trackGoogleOAuthEvent(
  event: 'google_oauth_started' | 'google_oauth_success' | 'google_oauth_error' | 'google_oauth_cancelled',
  properties?: {
    error_message?: string
    callback_url?: string
    state?: string
  }
) {
  return trackServerEvent(event, {
    error_message: properties?.error_message,
    has_callback_url: !!properties?.callback_url,
    has_state: !!properties?.state,
  })
}

// Track authentication method preferences (for UX optimization)
export async function trackAuthMethodAttempt(
  method: 'google_clicked' | 'email_form_started' | 'email_form_submitted',
  properties?: {
    page: 'signin' | 'signup'
    time_on_page_seconds?: number
  }
) {
  return trackServerEvent('auth_method_attempt', {
    auth_method: method,
    page_type: properties?.page,
    time_on_page_seconds: properties?.time_on_page_seconds,
  })
}

// Client-side auth analytics helpers
export const AUTH_ANALYTICS_EVENTS = {
  // Page visits
  SIGNIN_PAGE_VISIT: 'auth_signin_page_visit',
  SIGNUP_PAGE_VISIT: 'auth_signup_page_visit',

  // User interactions
  GOOGLE_BUTTON_CLICK: 'auth_google_button_click',
  EMAIL_FORM_START: 'auth_email_form_start',
  EMAIL_FORM_SUBMIT: 'auth_email_form_submit',

  // Success events
  SIGNIN_SUCCESS: 'auth_signin_success_client',
  SIGNUP_SUCCESS: 'auth_signup_success_client',

  // Error events
  SIGNIN_ERROR: 'auth_signin_error_client',
  SIGNUP_ERROR: 'auth_signup_error_client',
  VALIDATION_ERROR: 'auth_validation_error',
} as const

/**
 * Extract domain from email for analytics (privacy-safe)
 */
export function getEmailDomain(email: string): string {
  try {
    return email.split('@')[1]?.toLowerCase() || 'unknown'
  } catch {
    return 'unknown'
  }
}

/**
 * Get error type from error message for consistent categorization
 */
export function categorizeAuthError(error: string): string {
  const errorLower = error.toLowerCase()

  if (errorLower.includes('email') && errorLower.includes('exists')) {
    return 'duplicate_email'
  }
  if (errorLower.includes('invalid') && (errorLower.includes('email') || errorLower.includes('password'))) {
    return 'wrong_credentials'
  }
  if (errorLower.includes('password') && errorLower.includes('character')) {
    return 'validation_failed'
  }
  if (errorLower.includes('rate') || errorLower.includes('too many')) {
    return 'rate_limited'
  }
  if (errorLower.includes('google') || errorLower.includes('oauth')) {
    return 'google_oauth_failed'
  }
  if (errorLower.includes('network') || errorLower.includes('connection')) {
    return 'network_error'
  }

  return 'server_error'
}