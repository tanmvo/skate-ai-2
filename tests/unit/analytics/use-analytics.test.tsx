import { renderHook, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'
import { useAnalytics } from '@/lib/analytics/hooks/use-analytics'

// Mock PostHog
const mockPostHog = {
  identify: vi.fn(),
  capture: vi.fn(),
}

// Mock the PostHog React hook
vi.mock('posthog-js/react', () => ({
  usePostHog: () => mockPostHog,
}))

// Mock constants
vi.mock('@/lib/constants', () => ({
  DEFAULT_USER_ID: 'test-user-123',
}))

describe('useAnalytics', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-01T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('identify', () => {
    it('should identify user with provided ID', () => {
      const { result } = renderHook(() => useAnalytics())
      
      act(() => {
        result.current.identify('user-456', { name: 'Test User' })
      })

      expect(mockPostHog.identify).toHaveBeenCalledWith('user-456', {
        name: 'Test User',
        timestamp: '2024-01-01T12:00:00.000Z',
      })
    })

    it('should use default user ID when none provided', () => {
      const { result } = renderHook(() => useAnalytics())
      
      act(() => {
        result.current.identify()
      })

      expect(mockPostHog.identify).toHaveBeenCalledWith('test-user-123', {
        timestamp: '2024-01-01T12:00:00.000Z',
      })
    })
  })

  describe('track', () => {
    it('should track events with properties', () => {
      const { result } = renderHook(() => useAnalytics())
      
      act(() => {
        result.current.track('test_event', { key: 'value' })
      })

      expect(mockPostHog.capture).toHaveBeenCalledWith('test_event', {
        key: 'value',
        timestamp: '2024-01-01T12:00:00.000Z',
      })
    })

    it('should track events without properties', () => {
      const { result } = renderHook(() => useAnalytics())
      
      act(() => {
        result.current.track('simple_event')
      })

      expect(mockPostHog.capture).toHaveBeenCalledWith('simple_event', {
        timestamp: '2024-01-01T12:00:00.000Z',
      })
    })
  })

  describe('trackDocumentUpload', () => {
    it('should track document upload with correct properties', () => {
      const { result } = renderHook(() => useAnalytics())
      
      act(() => {
        result.current.trackDocumentUpload('document.pdf', 'application/pdf', 1024000)
      })

      expect(mockPostHog.capture).toHaveBeenCalledWith('document_uploaded', {
        filename: 'pdf',
        file_type: 'application/pdf',
        file_size: 1024000,
        file_size_mb: 0.98,
        timestamp: '2024-01-01T12:00:00.000Z',
      })
    })

    it('should extract file extension correctly', () => {
      const { result } = renderHook(() => useAnalytics())
      
      act(() => {
        result.current.trackDocumentUpload('/path/to/research-notes.docx', 'application/docx', 500000)
      })

      expect(mockPostHog.capture).toHaveBeenCalledWith('document_uploaded', 
        expect.objectContaining({
          filename: 'docx',
        })
      )
    })
  })

  describe('trackChatInteraction', () => {
    it('should track chat interaction with correct metrics', () => {
      const { result } = renderHook(() => useAnalytics())
      
      act(() => {
        result.current.trackChatInteraction('study-123', 150, 2500)
      })

      expect(mockPostHog.capture).toHaveBeenCalledWith('chat_interaction_completed', {
        study_id: 'study-123',
        message_length: 150,
        response_time_ms: 2500,
        response_time_seconds: 2.5,
        timestamp: '2024-01-01T12:00:00.000Z',
      })
    })

    it('should round response time correctly', () => {
      const { result } = renderHook(() => useAnalytics())
      
      act(() => {
        result.current.trackChatInteraction('study-456', 100, 1234)
      })

      expect(mockPostHog.capture).toHaveBeenCalledWith('chat_interaction_completed', 
        expect.objectContaining({
          response_time_seconds: 1.2,
        })
      )
    })
  })

  describe('trackSearchQuery', () => {
    it('should track search with query analysis', () => {
      const { result } = renderHook(() => useAnalytics())
      
      act(() => {
        result.current.trackSearchQuery('user experience design patterns', 15, 'hybrid')
      })

      expect(mockPostHog.capture).toHaveBeenCalledWith('search_performed', {
        query_length: 31,
        query_word_count: 4,
        result_count: 15,
        search_type: 'hybrid',
        has_results: true,
        timestamp: '2024-01-01T12:00:00.000Z',
      })
    })

    it('should handle empty search results', () => {
      const { result } = renderHook(() => useAnalytics())
      
      act(() => {
        result.current.trackSearchQuery('rare topic', 0, 'semantic')
      })

      expect(mockPostHog.capture).toHaveBeenCalledWith('search_performed', 
        expect.objectContaining({
          result_count: 0,
          has_results: false,
        })
      )
    })

    it('should handle whitespace in query correctly', () => {
      const { result } = renderHook(() => useAnalytics())
      
      act(() => {
        result.current.trackSearchQuery('  multiple   spaces  ', 5, 'keyword')
      })

      expect(mockPostHog.capture).toHaveBeenCalledWith('search_performed', 
        expect.objectContaining({
          query_word_count: 2, // 'multiple' and 'spaces'
        })
      )
    })
  })

  describe('trackCitationClick', () => {
    it('should track citation clicks with position', () => {
      const { result } = renderHook(() => useAnalytics())
      
      act(() => {
        result.current.trackCitationClick('doc-789', 'chunk-456', 2)
      })

      expect(mockPostHog.capture).toHaveBeenCalledWith('citation_clicked', {
        document_id: 'doc-789',
        chunk_id: 'chunk-456',
        citation_position: 2,
        timestamp: '2024-01-01T12:00:00.000Z',
      })
    })
  })

  describe('trackStudyCreated', () => {
    it('should track study creation with name length', () => {
      const { result } = renderHook(() => useAnalytics())
      
      act(() => {
        result.current.trackStudyCreated('study-999', 'User Research Interview Analysis')
      })

      expect(mockPostHog.capture).toHaveBeenCalledWith('study_created', {
        study_id: 'study-999',
        study_name_length: 32,
        timestamp: '2024-01-01T12:00:00.000Z',
      })
    })
  })

  describe('trackPageView', () => {
    it('should track page views with current URL', () => {
      // Mock window.location
      Object.defineProperty(window, 'location', {
        value: { href: 'https://example.com/study/123' },
        writable: true,
      })

      const { result } = renderHook(() => useAnalytics())
      
      act(() => {
        result.current.trackPageView('Study Detail', '/study/123')
      })

      expect(mockPostHog.capture).toHaveBeenCalledWith('$pageview', {
        $current_url: 'https://example.com/study/123',
        page_name: 'Study Detail',
        path: '/study/123',
      })
    })
  })

  describe('trackUserSignup', () => {
    it('should track signup with method', () => {
      const { result } = renderHook(() => useAnalytics())
      
      act(() => {
        result.current.trackUserSignup('google')
      })

      expect(mockPostHog.capture).toHaveBeenCalledWith('user_signed_up', {
        signup_method: 'google',
        timestamp: '2024-01-01T12:00:00.000Z',
      })
    })

    it('should use default signup method when none provided', () => {
      const { result } = renderHook(() => useAnalytics())
      
      act(() => {
        result.current.trackUserSignup()
      })

      expect(mockPostHog.capture).toHaveBeenCalledWith('user_signed_up', {
        signup_method: 'direct',
        timestamp: '2024-01-01T12:00:00.000Z',
      })
    })
  })

  describe('trackSessionStart', () => {
    it('should track session start with browser data', () => {
      // Mock document.referrer and navigator.userAgent
      Object.defineProperty(document, 'referrer', {
        value: 'https://google.com',
        writable: true,
      })
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Test Browser)',
        writable: true,
      })

      const { result } = renderHook(() => useAnalytics())
      
      act(() => {
        result.current.trackSessionStart()
      })

      expect(mockPostHog.capture).toHaveBeenCalledWith('session_started', {
        referrer: 'https://google.com',
        user_agent: 'Mozilla/5.0 (Test Browser)',
        timestamp: '2024-01-01T12:00:00.000Z',
      })
    })
  })

  describe('edge cases', () => {
    it('should handle undefined PostHog instance gracefully', () => {
      // Mock usePostHog to return undefined
      vi.doMock('posthog-js/react', () => ({
        usePostHog: () => undefined,
      }))

      const { result } = renderHook(() => useAnalytics())
      
      expect(() => {
        act(() => {
          result.current.track('test_event')
          result.current.identify('user-123')
        })
      }).not.toThrow()
    })
  })
})