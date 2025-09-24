'use client'

import { usePostHog } from 'posthog-js/react'

export const useAnalytics = () => {
  const posthog = usePostHog()

  const identify = (userId?: string, properties?: Record<string, unknown>) => {
    // Only identify authenticated users - analytics disabled for unauthenticated users
    if (!userId) return

    posthog?.identify(userId, {
      ...properties,
      timestamp: new Date().toISOString(),
    })
  }

  const track = (event: string, properties?: Record<string, unknown>) => {
    posthog?.capture(event, {
      ...properties,
      timestamp: new Date().toISOString(),
    })
  }

  // Research-specific tracking methods
  const trackDocumentUpload = (filename: string, fileType: string, fileSize: number) => {
    track('document_uploaded', {
      filename: filename.substring(filename.lastIndexOf('.') + 1), // Extension only
      file_type: fileType,
      file_size: fileSize,
      file_size_mb: Math.round(fileSize / (1024 * 1024) * 100) / 100,
    })
  }

  const trackChatInteraction = (studyId: string, messageLength: number, responseTime: number) => {
    track('chat_interaction_completed', {
      study_id: studyId,
      message_length: messageLength,
      response_time_ms: responseTime,
      response_time_seconds: Math.round(responseTime / 1000 * 10) / 10,
    })
  }

  const trackSearchQuery = (query: string, resultCount: number, searchType: 'semantic' | 'keyword' | 'hybrid') => {
    track('search_performed', {
      query_length: query.length,
      query_word_count: query.trim().split(/\s+/).length,
      result_count: resultCount,
      search_type: searchType,
      has_results: resultCount > 0,
    })
  }

  const trackCitationClick = (documentId: string, chunkId: string, position: number) => {
    track('citation_clicked', {
      document_id: documentId,
      chunk_id: chunkId,
      citation_position: position,
    })
  }

  const trackMessageCopy = (studyId: string, chatId?: string, messageType: string = 'general_response') => {
    track('message_copied', {
      study_id: studyId,
      chat_id: chatId,
      message_type: messageType, // For future analysis: 'summary' | 'theme' | 'quote_extraction' | 'general_response'
    })
  }

  const trackStudyCreated = (studyId: string, studyName: string) => {
    track('study_created', {
      study_id: studyId,
      study_name_length: studyName.length,
    })
  }

  const trackPageView = (pageName: string, path: string) => {
    posthog?.capture('$pageview', {
      $current_url: window.location.href,
      page_name: pageName,
      path: path,
    })
  }

  const trackUserSignup = (method?: string) => {
    track('user_signed_up', {
      signup_method: method || 'direct',
    })
  }

  // Authentication tracking methods
  const trackAuthPageVisit = (page: 'signin' | 'signup') => {
    track('auth_page_visit', {
      page_type: page,
      referrer: document.referrer || 'direct',
      timestamp: new Date().toISOString(),
    })
  }

  const trackAuthMethodAttempt = (method: 'google' | 'email', action: 'click' | 'start' | 'submit', page: 'signin' | 'signup') => {
    track('auth_method_attempt', {
      auth_method: method,
      action_type: action,
      page_type: page,
    })
  }

  const trackAuthSuccess = (method: 'google' | 'email', page: 'signin' | 'signup') => {
    track('auth_success_client', {
      auth_method: method,
      page_type: page,
    })
  }

  const trackAuthError = (method: 'google' | 'email', errorType: string, errorMessage: string, page: 'signin' | 'signup') => {
    track('auth_error_client', {
      auth_method: method,
      error_type: errorType,
      error_message: errorMessage,
      page_type: page,
    })
  }

  const trackValidationError = (field: string, errorMessage: string, page: 'signin' | 'signup') => {
    track('auth_validation_error', {
      field_name: field,
      error_message: errorMessage,
      page_type: page,
    })
  }

  const trackSessionStart = () => {
    track('session_started', {
      referrer: document.referrer,
      user_agent: navigator.userAgent,
    })
  }

  return {
    identify,
    track,
    trackDocumentUpload,
    trackChatInteraction,
    trackSearchQuery,
    trackCitationClick,
    trackMessageCopy,
    trackStudyCreated,
    trackPageView,
    trackUserSignup,
    trackSessionStart,
    // Authentication tracking
    trackAuthPageVisit,
    trackAuthMethodAttempt,
    trackAuthSuccess,
    trackAuthError,
    trackValidationError,
  }
}