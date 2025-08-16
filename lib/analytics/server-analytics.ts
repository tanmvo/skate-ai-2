import { PostHog } from 'posthog-node'
import { getCurrentUserId } from '@/lib/auth'

// Initialize PostHog server client
const serverPostHog = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: 'https://us.i.posthog.com',
  flushAt: 1, // Send events immediately in development
  flushInterval: 1000, // Flush every second
})

// Graceful shutdown
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    serverPostHog.shutdown()
  })
}

/**
 * Track server-side events with consistent user identification
 */
export async function trackServerEvent(
  event: string,
  properties?: Record<string, unknown>,
  userId?: string
) {
  try {
    const actualUserId = userId || getCurrentUserId()
    
    serverPostHog.capture({
      distinctId: actualUserId,
      event,
      properties: {
        ...properties,
        server_side: true,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      },
    })
  } catch (error) {
    console.error('Failed to track server event:', error)
  }
}

/**
 * Track document upload events
 */
export async function trackDocumentUploadEvent(
  event: 'document_upload_started' | 'document_processing_started' | 'document_processing_completed' | 'document_processing_failed',
  properties: {
    studyId: string
    fileName: string
    fileType: string
    fileSize: number
    processingTimeMs?: number
    errorType?: string
    errorMessage?: string
  },
  userId?: string
) {
  return trackServerEvent(event, {
    study_id: properties.studyId,
    file_name: properties.fileName.substring(properties.fileName.lastIndexOf('.') + 1), // Extension only
    file_type: properties.fileType,
    file_size: properties.fileSize,
    file_size_mb: Math.round(properties.fileSize / (1024 * 1024) * 100) / 100,
    processing_time_ms: properties.processingTimeMs,
    processing_time_seconds: properties.processingTimeMs ? Math.round(properties.processingTimeMs / 1000 * 10) / 10 : undefined,
    error_type: properties.errorType,
    error_message: properties.errorMessage,
  }, userId)
}

/**
 * Track chat interaction events
 */
export async function trackChatEvent(
  event: 'chat_session_started' | 'message_sent' | 'ai_response_started' | 'ai_response_completed' | 'ai_response_failed',
  properties: {
    studyId: string
    messageLength?: number
    responseTimeMs?: number
    tokenCount?: number
    toolCallsCount?: number
    errorType?: string
    errorMessage?: string
  },
  userId?: string
) {
  return trackServerEvent(event, {
    study_id: properties.studyId,
    message_length: properties.messageLength,
    response_time_ms: properties.responseTimeMs,
    response_time_seconds: properties.responseTimeMs ? Math.round(properties.responseTimeMs / 1000 * 10) / 10 : undefined,
    token_count: properties.tokenCount,
    tool_calls_count: properties.toolCallsCount,
    error_type: properties.errorType,
    error_message: properties.errorMessage,
  }, userId)
}

/**
 * Track search and tool usage events
 */
export async function trackSearchEvent(
  event: 'search_tool_used' | 'tool_call_completed' | 'citation_generated',
  properties: {
    studyId: string
    toolName?: string
    query?: string
    resultCount?: number
    searchType?: 'semantic' | 'keyword' | 'hybrid'
    processingTimeMs?: number
  },
  userId?: string
) {
  return trackServerEvent(event, {
    study_id: properties.studyId,
    tool_name: properties.toolName,
    query_length: properties.query?.length,
    query_word_count: properties.query ? properties.query.trim().split(/\s+/).length : undefined,
    result_count: properties.resultCount,
    search_type: properties.searchType,
    has_results: properties.resultCount ? properties.resultCount > 0 : undefined,
    processing_time_ms: properties.processingTimeMs,
  }, userId)
}

/**
 * Track study management events
 */
export async function trackStudyEvent(
  event: 'study_created' | 'study_renamed' | 'study_deleted' | 'study_accessed',
  properties: {
    studyId: string
    studyName?: string
    documentCount?: number
    messageCount?: number
  },
  userId?: string
) {
  return trackServerEvent(event, {
    study_id: properties.studyId,
    study_name_length: properties.studyName?.length,
    document_count: properties.documentCount,
    message_count: properties.messageCount,
  }, userId)
}

/**
 * Track error events
 */
export async function trackErrorEvent(
  event: 'api_error_occurred' | 'upload_error_occurred' | 'chat_error_occurred',
  properties: {
    errorType: string
    errorMessage: string
    endpoint?: string
    statusCode?: number
    stackTrace?: string
  },
  userId?: string
) {
  return trackServerEvent(event, {
    error_type: properties.errorType,
    error_message: properties.errorMessage,
    endpoint: properties.endpoint,
    status_code: properties.statusCode,
    // Don't log full stack trace for privacy, just error name
    has_stack_trace: !!properties.stackTrace,
  }, userId)
}

/**
 * Track performance metrics
 */
export async function trackPerformanceEvent(
  event: 'api_response_time' | 'document_processing_time' | 'search_query_time',
  properties: {
    endpoint?: string
    durationMs: number
    success: boolean
  },
  userId?: string
) {
  return trackServerEvent(event, {
    endpoint: properties.endpoint,
    duration_ms: properties.durationMs,
    duration_seconds: Math.round(properties.durationMs / 1000 * 10) / 10,
    success: properties.success,
  }, userId)
}

export default serverPostHog