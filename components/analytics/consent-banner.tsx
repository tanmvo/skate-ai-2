'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { initPostHog } from '@/lib/analytics/posthog-config'

export function ConsentBanner() {
  const [showBanner, setShowBanner] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const consent = localStorage.getItem('analytics-consent')
    if (!consent) {
      setShowBanner(true)
    } else if (consent === 'granted') {
      initPostHog()
    }
  }, [])

  const acceptAll = () => {
    localStorage.setItem('analytics-consent', 'granted')
    localStorage.setItem('analytics-consent-date', new Date().toISOString())
    initPostHog()
    setShowBanner(false)
  }

  const rejectAll = () => {
    localStorage.setItem('analytics-consent', 'denied')
    localStorage.setItem('analytics-consent-date', new Date().toISOString())
    setShowBanner(false)
  }

  if (!mounted || !showBanner) {
    return null
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Analytics & Privacy</CardTitle>
          <CardDescription>
            We use analytics to improve your research experience. Your research content is never tracked.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            We collect usage data to understand how you interact with Skate AI and improve the platform. 
            All research content and documents remain private.
          </p>
        </CardContent>
        <CardFooter className="flex gap-2">
          <Button onClick={acceptAll} className="flex-1">
            Accept
          </Button>
          <Button onClick={rejectAll} variant="outline" className="flex-1">
            Decline
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}