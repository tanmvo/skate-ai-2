import * as React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { vi } from 'vitest';
import { mockLLMResponses, mockMessages as llmMockMessages } from './fixtures/llm-responses';
import { createMockUseChat, createMockHooks, resetMocks } from './mocks/ai-sdk-mock';

// Export the globally available router mock
export const mockRouter = (global as any).mockRouterFunctions || {
  push: vi.fn(),
  replace: vi.fn(),
  prefetch: vi.fn(),
  back: vi.fn(),
  forward: vi.fn(),
  refresh: vi.fn(),
};

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

// Test wrapper with SWR cache clearing
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
      {children}
    </SWRConfig>
  );
};

// Custom render function
export const renderWithProviders = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => {
  return render(ui, { wrapper: TestWrapper, ...options });
};

// Mock study data
export const mockStudy = {
  id: 'study_test_123',
  name: 'Test Study',
  createdAt: '2025-01-15T10:00:00Z',
  updatedAt: '2025-01-15T10:00:00Z',
  userId: 'usr_mvp_dev_2025',
  _count: {
    documents: 2,
    messages: 5,
  },
};

export const mockStudies = [
  mockStudy,
  {
    id: 'study_test_456',
    name: 'Another Study',
    createdAt: '2025-01-14T15:30:00Z',
    updatedAt: '2025-01-14T15:30:00Z',
    userId: 'usr_mvp_dev_2025',
    _count: {
      documents: 1,
      messages: 0,
    },
  },
];

// Mock document data
export const mockDocument = {
  id: 'doc_test_123',
  fileName: 'test-document.pdf',
  originalName: 'Test Document.pdf',
  mimeType: 'application/pdf',
  fileSize: 1024000,
  processingStatus: 'COMPLETED',
  uploadedAt: '2025-01-15T10:30:00Z',
  studyId: 'study_test_123',
};

export const mockDocuments = [
  mockDocument,
  {
    id: 'doc_test_456',
    fileName: 'interview-transcript.docx',
    originalName: 'Interview Transcript.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    fileSize: 512000,
    processingStatus: 'PROCESSING',
    uploadedAt: '2025-01-15T11:00:00Z',
    studyId: 'study_test_123',
  },
];

// Mock chat messages in AI SDK v5 format
export const mockMessages = [
  {
    id: 'msg_user_1',
    role: 'user' as const,
    parts: [
      {
        type: 'text',
        text: 'What are the main themes in this document?',
      }
    ],
    content: 'What are the main themes in this document?',
    createdAt: new Date('2025-01-15T12:00:00Z'),
  },
  {
    id: 'msg_assistant_1',
    role: 'assistant' as const,
    parts: [
      {
        type: 'text',
        text: 'Based on the document analysis, I can identify three main themes: user frustrations with the current system, desire for better automation, and concerns about data privacy.',
      }
    ],
    content: 'Based on the document analysis, I can identify three main themes: user frustrations with the current system, desire for better automation, and concerns about data privacy.',
    createdAt: new Date('2025-01-15T12:00:30Z'),
  },
];

// File creation helper for upload tests
export const createMockFile = (name: string, type: string, size: number = 1024) => {
  const file = new File(['test content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

// Export enhanced test utilities
export { 
  mockLLMResponses, 
  llmMockMessages,
  createMockUseChat,
  createMockHooks,
  resetMocks 
};

// Enhanced render function with better provider setup
export const renderWithMocks = (
  ui: React.ReactElement,
  options?: {
    useChatOverrides?: Parameters<typeof createMockUseChat>[0];
    hookOverrides?: Partial<ReturnType<typeof createMockHooks>>;
  } & Omit<RenderOptions, 'wrapper'>
) => {
  // Reset mocks before each render
  resetMocks();
  
  return render(ui, { wrapper: TestWrapper, ...options });
};

// Re-export everything from testing library
export * from '@testing-library/react';
export { renderHook } from '@testing-library/react';