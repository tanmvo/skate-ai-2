'use client'

import { SessionProvider } from "next-auth/react"
import { AnalyticsProvider } from "@/lib/analytics/posthog-provider"
import { ConsentBanner } from "@/components/analytics/consent-banner"
import { PageTracker } from "@/lib/analytics/page-tracking"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AnalyticsProvider>
        <PageTracker />
        {children}
        <ConsentBanner />
      </AnalyticsProvider>
    </SessionProvider>
  )
}