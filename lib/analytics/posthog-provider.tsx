'use client'

import { PostHogProvider } from 'posthog-js/react'
import posthog from 'posthog-js'
import { useEffect, useState } from 'react'

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false)
  const [posthogClient, setPosthogClient] = useState<typeof posthog | null>(null)

  useEffect(() => {
    setIsClient(true)

    // Initialize PostHog only on client side
    if (!posthog.__loaded && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
      posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
        ui_host: 'https://us.posthog.com',
        person_profiles: 'identified_only',
        capture_pageview: false,
        capture_pageleave: true,
        disable_session_recording: true, // Temporarily disabled due to infinite loop issue
        autocapture: {
          css_selector_allowlist: [
            '[data-ph-capture]',
          ],
        },
        loaded: (posthog) => {
          if (process.env.NODE_ENV === 'development') {
            posthog.debug()
          }
        },
      })
    }

    setPosthogClient(posthog)
  }, [])

  if (!isClient || !posthogClient) {
    return <>{children}</>
  }

  return <PostHogProvider client={posthogClient}>{children}</PostHogProvider>
}