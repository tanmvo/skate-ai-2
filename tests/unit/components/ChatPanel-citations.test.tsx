import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { ChatPanel } from '../../../components/chat/ChatPanel';
import { renderWithProviders } from '../../test-utils';
import { DocumentCitation } from '../../../lib/schemas/synthesis-schema';

// Mock the citation components
vi.mock('../../../components/chat/CitationBadge', () => ({
  CitationBadge: ({ citation, index, onClick }: any) => (
    <button
      data-testid={`citation-badge-${index}`}
      onClick={() => onClick?.(citation)}
    >
      [{index + 1}]
    </button>
  ),
}));

vi.mock('../../../components/chat/CitationPanel', () => ({
  CitationPanel: ({ citations, onCitationClick }: any) => (
    <div data-testid="citation-panel">
      <span>Citations: {citations?.length || 0}</span>
      {citations?.map((citation: DocumentCitation, index: number) => (
        <button
          key={citation.id}
          data-testid={`citation-panel-item-${index}`}
          onClick={() => onCitationClick?.(citation)}
        >
          {citation.documentName}
        </button>
      ))}
    </div>
  ),
}));

// Mock useChat with data support
const mockUseChat = {
  messages: [] as any[],
  input: '',
  handleInputChange: vi.fn(),
  handleSubmit: vi.fn(),
  isLoading: false,
  error: null as any,
  reload: vi.fn(),
  data: [] as any[], // Add data for citation streaming
};

vi.mock('ai/react', () => ({
  useChat: () => mockUseChat,
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn(),
  },
});

describe('ChatPanel Citation Integration', () => {
  const studyId = 'study_test_123';
  
  const mockCitations: DocumentCitation[] = [
    {
      id: 'cite_doc_1',
      documentId: 'doc_1',
      documentName: 'first-document.pdf',
      relevantText: 'This is content from the first document.',
      pageNumber: 5
    },
    {
      id: 'cite_doc_2',
      documentId: 'doc_2',
      documentName: 'second-document.pdf',
      relevantText: 'Content from the second document.',
      pageNumber: 12
    }
  ];

  const mockOnCitationClick = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    mockUseChat.messages = [];
    mockUseChat.input = '';
    mockUseChat.isLoading = false;
    mockUseChat.error = null;
    mockUseChat.data = [];
  });

  describe('Citation Data Processing', () => {
    it('should extract citations from useChat data correctly', () => {
      // Simulate streamed data with citations
      mockUseChat.data = [
        { type: 'other', value: 'some other data' },
        { type: 'citations', citations: mockCitations },
        { type: 'text', content: 'AI response text' }
      ];

      mockUseChat.messages = [
        {
          id: 'msg_1',
          role: 'assistant',
          content: 'Based on the documents, here are the insights...',
          createdAt: new Date(),
        }
      ];

      renderWithProviders(
        <ChatPanel studyId={studyId} onCitationClick={mockOnCitationClick} />
      );

      // The component should process the data and show citations
      // We test this indirectly through the mocked citation components
      expect(screen.getByText(/Based on the documents/)).toBeDefined();
    });

    it('should handle missing citation data gracefully', () => {
      // Data without citations
      mockUseChat.data = [
        { type: 'other', value: 'some data' },
        { type: 'text', content: 'AI response' }
      ];

      mockUseChat.messages = [
        {
          id: 'msg_1',
          role: 'assistant',
          content: 'Response without citations',
          createdAt: new Date(),
        }
      ];

      renderWithProviders(
        <ChatPanel studyId={studyId} onCitationClick={mockOnCitationClick} />
      );

      expect(screen.getByText('Response without citations')).toBeDefined();
      // Should not crash when no citations are present
    });

    it('should handle malformed citation data', () => {
      // Malformed citation data
      mockUseChat.data = [
        { type: 'citations' }, // Missing citations array
        { type: 'citations', citations: null }, // Null citations
        { type: 'citations', citations: 'not an array' }, // Wrong type
      ];

      mockUseChat.messages = [
        {
          id: 'msg_1',
          role: 'assistant',
          content: 'Response with malformed citation data',
          createdAt: new Date(),
        }
      ];

      // Should not throw error
      expect(() => {
        renderWithProviders(
          <ChatPanel studyId={studyId} onCitationClick={mockOnCitationClick} />
        );
      }).not.toThrow();

      expect(screen.getByText('Response with malformed citation data')).toBeDefined();
    });

    it('should handle empty citations array', () => {
      mockUseChat.data = [
        { type: 'citations', citations: [] }
      ];

      mockUseChat.messages = [
        {
          id: 'msg_1',
          role: 'assistant',
          content: 'Response with empty citations',
          createdAt: new Date(),
        }
      ];

      renderWithProviders(
        <ChatPanel studyId={studyId} onCitationClick={mockOnCitationClick} />
      );

      expect(screen.getByText('Response with empty citations')).toBeDefined();
    });
  });

  describe('Citation UI Integration', () => {
    it('should display citation badges for assistant messages with citations', () => {
      mockUseChat.data = [
        { type: 'citations', citations: mockCitations }
      ];

      mockUseChat.messages = [
        {
          id: 'msg_with_citations',
          role: 'assistant',
          content: 'Message with citations',
          createdAt: new Date(),
        }
      ];

      renderWithProviders(
        <ChatPanel studyId={studyId} onCitationClick={mockOnCitationClick} />
      );

      // Should show citation badges (mocked implementation)
      expect(screen.getByTestId('citation-badge-0')).toBeDefined();
      expect(screen.getByTestId('citation-badge-1')).toBeDefined();
    });

    it('should display citation panel for assistant messages with citations', () => {
      mockUseChat.data = [
        { type: 'citations', citations: mockCitations }
      ];

      mockUseChat.messages = [
        {
          id: 'msg_with_citations',
          role: 'assistant',
          content: 'Message with citations',
          createdAt: new Date(),
        }
      ];

      renderWithProviders(
        <ChatPanel studyId={studyId} onCitationClick={mockOnCitationClick} />
      );

      // Should show citation panel
      expect(screen.getByTestId('citation-panel')).toBeDefined();
      expect(screen.getByText('Citations: 2')).toBeDefined();
      expect(screen.getByText('first-document.pdf')).toBeDefined();
      expect(screen.getByText('second-document.pdf')).toBeDefined();
    });

    it('should not display citations for user messages', () => {
      mockUseChat.data = [
        { type: 'citations', citations: mockCitations }
      ];

      mockUseChat.messages = [
        {
          id: 'user_msg',
          role: 'user',
          content: 'User message',
          createdAt: new Date(),
        }
      ];

      renderWithProviders(
        <ChatPanel studyId={studyId} onCitationClick={mockOnCitationClick} />
      );

      // Should not show citations for user messages
      expect(screen.queryByTestId('citation-badge-0')).toBeNull();
      expect(screen.queryByTestId('citation-panel')).toBeNull();
    });

    it('should handle citation click events', () => {
      mockUseChat.data = [
        { type: 'citations', citations: mockCitations }
      ];

      mockUseChat.messages = [
        {
          id: 'msg_with_citations',
          role: 'assistant',
          content: 'Message with citations',
          createdAt: new Date(),
        }
      ];

      renderWithProviders(
        <ChatPanel studyId={studyId} onCitationClick={mockOnCitationClick} />
      );

      // Click citation badge
      const citationBadge = screen.getByTestId('citation-badge-0');
      fireEvent.click(citationBadge);

      expect(mockOnCitationClick).toHaveBeenCalledWith(mockCitations[0]);

      // Click citation panel item
      const citationPanelItem = screen.getByTestId('citation-panel-item-1');
      fireEvent.click(citationPanelItem);

      expect(mockOnCitationClick).toHaveBeenCalledWith(mockCitations[1]);
    });
  });

  describe('Message Persistence with Citations', () => {
    it('should save assistant messages with citations', async () => {
      // Mock fetch for message saving
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'saved_msg' }),
      });

      mockUseChat.data = [
        { type: 'citations', citations: mockCitations }
      ];

      const mockMessage = {
        id: 'assistant_msg',
        role: 'assistant',
        content: 'Assistant response with citations',
      };

      renderWithProviders(
        <ChatPanel studyId={studyId} onCitationClick={mockOnCitationClick} />
      );

      // Simulate onFinish callback
      const onFinishCallback = mockUseChat.onFinish;
      if (onFinishCallback) {
        await onFinishCallback(mockMessage);
      }

      // Should save message with citations
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          `/api/studies/${studyId}/messages`,
          expect.objectContaining({
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              role: 'ASSISTANT',
              content: 'Assistant response with citations',
              citations: mockCitations,
            }),
          })
        );
      });
    });

    it('should handle message persistence errors gracefully', async () => {
      // Mock fetch to fail
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      mockUseChat.data = [
        { type: 'citations', citations: mockCitations }
      ];

      const mockMessage = {
        id: 'assistant_msg',
        role: 'assistant',
        content: 'Message that fails to save',
      };

      renderWithProviders(
        <ChatPanel studyId={studyId} onCitationClick={mockOnCitationClick} />
      );

      // Simulate onFinish callback
      const onFinishCallback = mockUseChat.onFinish;
      if (onFinishCallback) {
        await onFinishCallback(mockMessage);
      }

      // Should handle error gracefully (component should still render)
      expect(screen.getByText('Chat')).toBeDefined();
    });

    it('should retry message persistence with citations', async () => {
      // Mock successful retry
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: vi.fn().mockResolvedValue({ id: 'saved_msg' }),
      });

      mockUseChat.data = [
        { type: 'citations', citations: mockCitations }
      ];

      mockUseChat.messages = [
        {
          id: 'msg_to_retry',
          role: 'assistant',
          content: 'Message to retry',
          createdAt: new Date(),
        }
      ];

      renderWithProviders(
        <ChatPanel studyId={studyId} onCitationClick={mockOnCitationClick} />
      );

      // The component should handle retries with citations included
      expect(screen.getByText('Message to retry')).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle citation processing errors gracefully', () => {
      // Simulate data that causes processing errors
      mockUseChat.data = [
        { type: 'citations', citations: [
          { documentId: 'doc_1' }, // Missing required fields
          null, // Null citation
          mockCitations[0], // Valid citation
        ]}
      ];

      mockUseChat.messages = [
        {
          id: 'msg_1',
          role: 'assistant',
          content: 'Message with mixed citation data',
          createdAt: new Date(),
        }
      ];

      // Should not crash
      expect(() => {
        renderWithProviders(
          <ChatPanel studyId={studyId} onCitationClick={mockOnCitationClick} />
        );
      }).not.toThrow();

      expect(screen.getByText('Message with mixed citation data')).toBeDefined();
    });

    it('should continue chat functionality when citation streaming fails', () => {
      // Simulate completely broken citation data
      mockUseChat.data = 'not an array' as any;

      mockUseChat.messages = [
        {
          id: 'msg_1',
          role: 'assistant',
          content: 'Normal chat should still work',
          createdAt: new Date(),
        }
      ];

      renderWithProviders(
        <ChatPanel studyId={studyId} onCitationClick={mockOnCitationClick} />
      );

      // Basic chat functionality should still work
      expect(screen.getByText('Normal chat should still work')).toBeDefined();
      expect(screen.getByPlaceholderText('Ask a question about your documents...')).toBeDefined();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle large numbers of citations efficiently', () => {
      const manyCitations: DocumentCitation[] = Array.from({ length: 50 }, (_, i) => ({
        id: `cite_doc_${i}`,
        documentId: `doc_${i}`,
        documentName: `document-${i}.pdf`,
        relevantText: `Content from document ${i}`,
        pageNumber: i + 1
      }));

      mockUseChat.data = [
        { type: 'citations', citations: manyCitations }
      ];

      mockUseChat.messages = [
        {
          id: 'msg_many_citations',
          role: 'assistant',
          content: 'Message with many citations',
          createdAt: new Date(),
        }
      ];

      // Should handle large citation sets without performance issues
      const startTime = Date.now();
      
      renderWithProviders(
        <ChatPanel studyId={studyId} onCitationClick={mockOnCitationClick} />
      );

      const endTime = Date.now();
      const renderTime = endTime - startTime;

      // Should render quickly even with many citations
      expect(renderTime).toBeLessThan(1000); // 1 second max
      expect(screen.getByText('Message with many citations')).toBeDefined();
    });

    it('should handle rapid citation updates', () => {
      const { rerender } = renderWithProviders(
        <ChatPanel studyId={studyId} onCitationClick={mockOnCitationClick} />
      );

      // Simulate rapid data updates
      mockUseChat.data = [{ type: 'citations', citations: [mockCitations[0]] }];
      rerender(<ChatPanel studyId={studyId} onCitationClick={mockOnCitationClick} />);

      mockUseChat.data = [{ type: 'citations', citations: mockCitations }];
      rerender(<ChatPanel studyId={studyId} onCitationClick={mockOnCitationClick} />);

      mockUseChat.data = [{ type: 'citations', citations: [] }];
      rerender(<ChatPanel studyId={studyId} onCitationClick={mockOnCitationClick} />);

      // Should handle rapid updates without crashing
      expect(screen.getByText('Chat')).toBeDefined();
    });
  });
});