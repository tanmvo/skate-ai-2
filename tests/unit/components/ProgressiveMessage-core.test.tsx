import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { ProgressiveMessage } from '../../../components/chat/ProgressiveMessage';
import { renderWithProviders } from '../../test-utils';

// Mock dependencies
vi.mock('@/lib/hooks/useToolProgress', () => ({
  useToolProgress: () => ({
    toolStates: {},
    setToolState: vi.fn(),
  }),
}));

describe('ProgressiveMessage Core Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Message Rendering', () => {
    it('should render user message container', () => {
      const userMessage = {
        id: 'msg-1',
        role: 'user' as const,
        content: 'What are the main themes?',
        createdAt: new Date(),
      };

      renderWithProviders(
        <ProgressiveMessage 
          message={userMessage} 
          onCitationClick={vi.fn()} 
        />
      );

      // Check that the user message container exists
      const messageContainer = document.querySelector('[data-role="user"]');
      expect(messageContainer).toBeInTheDocument();
    });

    it('should render assistant message container', () => {
      const assistantMessage = {
        id: 'msg-2',
        role: 'assistant' as const,
        content: 'Based on the documents, the main themes are...',
        createdAt: new Date(),
      };

      renderWithProviders(
        <ProgressiveMessage 
          message={assistantMessage} 
          onCitationClick={vi.fn()} 
        />
      );

      // Check that the assistant message container exists
      const messageContainer = document.querySelector('[data-role="assistant"]');
      expect(messageContainer).toBeInTheDocument();
      // Check for bot icon
      expect(document.querySelector('.lucide-bot')).toBeInTheDocument();
    });

    it('should render assistant message with attachments', () => {
      const messageWithTools = {
        id: 'msg-3',
        role: 'assistant' as const,
        content: '',
        createdAt: new Date(),
        experimental_attachments: [
          {
            name: 'search_results',
            contentType: 'application/json',
            content: JSON.stringify({
              type: 'tool-search_all_documents',
              toolCallId: 'tool-123',
              input: { query: 'themes' },
              output: 'Found 5 passages about themes',
            }),
          },
        ],
      };

      renderWithProviders(
        <ProgressiveMessage 
          message={messageWithTools} 
          onCitationClick={vi.fn()} 
        />
      );

      // Check that the assistant message container exists with attachments
      const messageContainer = document.querySelector('[data-role="assistant"]');
      expect(messageContainer).toBeInTheDocument();
    });
  });

  describe('Component Structure', () => {
    it('should handle citation callback prop', () => {
      const onCitationClick = vi.fn();
      const messageWithCitation = {
        id: 'msg-5',
        role: 'assistant' as const,
        content: 'According to the research [1], the findings show...',
        createdAt: new Date(),
      };

      renderWithProviders(
        <ProgressiveMessage 
          message={messageWithCitation} 
          onCitationClick={onCitationClick} 
        />
      );

      // Check that the assistant message container exists
      const messageContainer = document.querySelector('[data-role="assistant"]');
      expect(messageContainer).toBeInTheDocument();
    });
  });
});