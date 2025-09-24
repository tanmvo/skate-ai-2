import posthog from 'posthog-js'

export const initPostHog = () => {
  if (typeof window !== 'undefined') {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      ui_host: 'https://us.posthog.com',
      person_profiles: 'identified_only', // Privacy-focused
      capture_pageview: false, // Manual page tracking
      capture_pageleave: true,
      disable_session_recording: true, // Temporarily disabled due to infinite loop issue
      autocapture: {
        css_selector_allowlist: [
          '[data-ph-capture]', // Explicit opt-in elements
        ],
      },
      loaded: (posthog) => {
        if (process.env.NODE_ENV === 'development') {
          posthog.debug()
        }
      },
    })
  }
}