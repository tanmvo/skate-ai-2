'use client'

import { usePathname } from 'next/navigation'
import { useEffect } from 'react'
import { useAnalytics } from './hooks/use-analytics'

export function PageTracker() {
  const pathname = usePathname()
  const { trackPageView, trackSessionStart } = useAnalytics()

  useEffect(() => {
    // Track session start on initial load
    trackSessionStart()
  }, [trackSessionStart])

  useEffect(() => {
    // Track page views on route changes
    const pageName = getPageName(pathname)
    trackPageView(pageName, pathname)
  }, [pathname, trackPageView])

  return null
}

function getPageName(pathname: string): string {
  if (pathname === '/') return 'Dashboard'
  if (pathname.startsWith('/study/')) {
    const segments = pathname.split('/')
    if (segments.length === 3) return 'Study Detail'
    return 'Study'
  }
  if (pathname === '/settings') return 'Settings'
  if (pathname === '/profile') return 'Profile'
  
  // Fallback to cleaned pathname
  return pathname
    .split('/')
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ') || 'Unknown'
}