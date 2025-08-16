import { vi } from 'vitest'

// PostHog Client Mock
export const createMockPostHogClient = () => ({
  identify: vi.fn(),
  capture: vi.fn(),
  debug: vi.fn(),
  shutdown: vi.fn(),
  init: vi.fn(),
  reset: vi.fn(),
  isFeatureEnabled: vi.fn().mockReturnValue(false),
  getFeatureFlag: vi.fn(),
  onFeatureFlags: vi.fn(),
  reloadFeatureFlags: vi.fn(),
  group: vi.fn(),
  alias: vi.fn(),
  set: vi.fn(),
  set_once: vi.fn(),
  unset: vi.fn(),
  people: {
    set: vi.fn(),
    set_once: vi.fn(),
    unset: vi.fn(),
  },
})

// PostHog Node Client Mock  
export const createMockPostHogNodeClient = () => ({
  capture: vi.fn(),
  identify: vi.fn(),
  alias: vi.fn(),
  groupIdentify: vi.fn(),
  shutdown: vi.fn(),
  flush: vi.fn(),
  isFeatureEnabled: vi.fn().mockReturnValue(false),
  getFeatureFlag: vi.fn(),
  getAllFlags: vi.fn().mockReturnValue({}),
  reloadFeatureFlags: vi.fn(),
})

// Analytics Hook Mock
export const createMockAnalyticsHook = () => ({
  identify: vi.fn(),
  track: vi.fn(),
  trackDocumentUpload: vi.fn(),
  trackChatInteraction: vi.fn(),
  trackSearchQuery: vi.fn(),
  trackCitationClick: vi.fn(),
  trackMessageCopy: vi.fn(),
  trackStudyCreated: vi.fn(),
  trackPageView: vi.fn(),
  trackUserSignup: vi.fn(),
  trackSessionStart: vi.fn(),
})

// Server Analytics Functions Mock
export const createMockServerAnalytics = () => ({
  trackServerEvent: vi.fn(),
  trackDocumentUploadEvent: vi.fn(),
  trackChatEvent: vi.fn(),
  trackSearchEvent: vi.fn(),
  trackStudyEvent: vi.fn(),
  trackErrorEvent: vi.fn(),
  trackPerformanceEvent: vi.fn(),
})

// Common Test Data
export const mockAnalyticsData = {
  users: {
    testUser: {
      id: 'test-user-123',
      email: 'test@example.com',
      name: 'Test User',
      createdAt: '2024-01-01T00:00:00Z',
    },
    defaultUser: {
      id: 'usr_mvp_dev_2025',
      email: 'dev@skateai.com',
      name: 'MVP Dev User',
      createdAt: '2024-01-01T00:00:00Z',
    },
  },
  studies: {
    testStudy: {
      id: 'study-test-123',
      name: 'Test User Research Study',
      documentCount: 3,
      messageCount: 15,
    },
    emptyStudy: {
      id: 'study-empty-456',
      name: 'Empty Study',
      documentCount: 0,
      messageCount: 0,
    },
  },
  documents: {
    pdfDocument: {
      id: 'doc-pdf-123',
      fileName: 'research-notes.pdf',
      fileType: 'application/pdf',
      fileSize: 2048000, // 2MB
      processingTimeMs: 3500,
    },
    docxDocument: {
      id: 'doc-docx-456',
      fileName: 'interview-transcript.docx',
      fileType: 'application/docx',
      fileSize: 512000, // 512KB
      processingTimeMs: 1200,
    },
    txtDocument: {
      id: 'doc-txt-789',
      fileName: 'notes.txt',
      fileType: 'text/plain',
      fileSize: 25600, // 25KB
      processingTimeMs: 200,
    },
  },
  chatInteractions: {
    shortMessage: {
      messageLength: 45,
      responseTimeMs: 1500,
      tokenCount: 120,
      toolCallsCount: 1,
    },
    longMessage: {
      messageLength: 350,
      responseTimeMs: 4500,
      tokenCount: 890,
      toolCallsCount: 3,
    },
    quickResponse: {
      messageLength: 100,
      responseTimeMs: 800,
      tokenCount: 200,
      toolCallsCount: 0,
    },
  },
  searchQueries: {
    shortQuery: {
      query: 'user feedback',
      resultCount: 8,
      searchType: 'keyword' as const,
      processingTimeMs: 150,
    },
    longQuery: {
      query: 'detailed analysis of user experience pain points and improvement opportunities',
      resultCount: 23,
      searchType: 'semantic' as const,
      processingTimeMs: 450,
    },
    emptyResults: {
      query: 'nonexistent topic',
      resultCount: 0,
      searchType: 'hybrid' as const,
      processingTimeMs: 100,
    },
  },
  errors: {
    validationError: {
      errorType: 'ValidationError',
      errorMessage: 'Invalid request parameters',
      endpoint: '/api/chat',
      statusCode: 400,
    },
    serverError: {
      errorType: 'InternalServerError',
      errorMessage: 'Database connection failed',
      endpoint: '/api/upload',
      statusCode: 500,
    },
    rateLimitError: {
      errorType: 'RateLimitError',
      errorMessage: 'API rate limit exceeded',
      endpoint: '/api/ai/chat',
      statusCode: 429,
    },
  },
  performance: {
    fastApiCall: {
      endpoint: '/api/studies',
      durationMs: 120,
      success: true,
    },
    slowApiCall: {
      endpoint: '/api/upload',
      durationMs: 5500,
      success: true,
    },
    failedApiCall: {
      endpoint: '/api/process',
      durationMs: 2000,
      success: false,
    },
  },
}

// Test Utilities
export const createAnalyticsTestUtils = () => {
  const mockPostHog = createMockPostHogClient()
  const mockServerAnalytics = createMockServerAnalytics()
  const mockAnalyticsHook = createMockAnalyticsHook()

  const resetAllMocks = () => {
    vi.clearAllMocks()
  }

  const expectEventTracked = (eventName: string, properties?: Record<string, any>) => {
    expect(mockPostHog.capture).toHaveBeenCalledWith(
      eventName,
      expect.objectContaining({
        timestamp: expect.any(String),
        ...properties,
      })
    )
  }

  const expectServerEventTracked = (eventName: string, properties?: Record<string, any>) => {
    expect(mockServerAnalytics.trackServerEvent).toHaveBeenCalledWith(
      eventName,
      expect.objectContaining({
        server_side: true,
        timestamp: expect.any(String),
        environment: expect.any(String),
        ...properties,
      }),
      expect.any(String)
    )
  }

  const expectUserIdentified = (userId: string, properties?: Record<string, any>) => {
    expect(mockPostHog.identify).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({
        timestamp: expect.any(String),
        ...properties,
      })
    )
  }

  return {
    mocks: {
      postHog: mockPostHog,
      serverAnalytics: mockServerAnalytics,
      analyticsHook: mockAnalyticsHook,
    },
    utils: {
      resetAllMocks,
      expectEventTracked,
      expectServerEventTracked,
      expectUserIdentified,
    },
    data: mockAnalyticsData,
  }
}

// Environment Mock Helpers
export const mockAnalyticsEnvironment = (overrides: Record<string, any> = {}) => {
  const defaultEnv = {
    NODE_ENV: 'test',
    NEXT_PUBLIC_POSTHOG_KEY: 'test-posthog-key-123',
    POSTHOG_API_KEY: 'test-posthog-api-key-456',
  }

  return {
    ...defaultEnv,
    ...overrides,
  }
}

// Browser Environment Mock
export const mockBrowserEnvironment = () => {
  const mockWindow = {
    location: {
      href: 'https://test.example.com/study/123',
      pathname: '/study/123',
      search: '?tab=chat',
      hash: '#message-456',
    },
    navigator: {
      userAgent: 'Mozilla/5.0 (Test Browser) Test/1.0',
    },
    document: {
      referrer: 'https://google.com/search?q=research+tools',
    },
  }

  Object.defineProperty(global, 'window', {
    value: mockWindow,
    writable: true,
  })

  Object.defineProperty(global, 'document', {
    value: mockWindow.document,
    writable: true,
  })

  Object.defineProperty(global, 'navigator', {
    value: mockWindow.navigator,
    writable: true,
  })

  return mockWindow
}

// Time Mock Helpers
export const mockAnalyticsTime = (date: string = '2024-01-01T12:00:00Z') => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date(date))

  return {
    advanceTime: (ms: number) => vi.advanceTimersByTime(ms),
    setTime: (newDate: string) => vi.setSystemTime(new Date(newDate)),
    cleanup: () => vi.useRealTimers(),
  }
}

// Default export for common usage
export default {
  createMockPostHogClient,
  createMockPostHogNodeClient,
  createMockAnalyticsHook,
  createMockServerAnalytics,
  createAnalyticsTestUtils,
  mockAnalyticsData,
  mockAnalyticsEnvironment,
  mockBrowserEnvironment,
  mockAnalyticsTime,
}