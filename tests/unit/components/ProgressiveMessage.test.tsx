import { render, screen } from '@testing-library/react';
import { ProgressiveMessage } from '@/components/chat/ProgressiveMessage';
import { Message } from 'ai/react';
import { ToolCallEvent } from '@/lib/types/chat-phases';

const mockMessage: Message = {
  id: 'test-message-1',
  role: 'assistant',
  content: 'Based on my search of the documents, I found several key themes...',
  createdAt: new Date('2024-01-01T12:00:00Z'),
};

const mockToolCallEvents: ToolCallEvent[] = [
  {
    type: 'tool-call-start',
    toolName: 'search_all_documents',
    parameters: { query: 'key themes' },
    timestamp: Date.now() - 2000,
  },
  {
    type: 'tool-call-end',
    toolName: 'search_all_documents',
    success: true,
    timestamp: Date.now() - 1000,
  },
];

const mockDataStream = [
  {
    type: 'tool-call-start',
    toolName: 'search_all_documents',
    parameters: { query: 'key themes' },
    timestamp: Date.now() - 2000,
  },
  {
    type: 'tool-call-end',
    toolName: 'search_all_documents',
    success: true,
    timestamp: Date.now() - 1000,
  },
  {
    type: 'citations',
    citations: [],
  },
];

const defaultProps = {
  message: mockMessage,
  dataStream: mockDataStream,
  citations: [],
  persistenceError: false,
  formatTimestamp: (date: Date) => date.toLocaleTimeString(),
};

describe('ProgressiveMessage', () => {
  it('should render thinking bubble when tool calls exist', () => {
    render(<ProgressiveMessage {...defaultProps} />);
    
    // Should show thinking bubble
    expect(screen.getByText('Analysis complete')).toBeInTheDocument();
    
    // Should show message content
    expect(screen.getByText(mockMessage.content)).toBeInTheDocument();
  });

  it('should not render thinking bubble for user messages', () => {
    const userMessage: Message = {
      id: 'user-message-1',
      role: 'user',
      content: 'What are the main themes in these documents?',
      createdAt: new Date('2024-01-01T12:00:00Z'),
    };

    render(<ProgressiveMessage {...defaultProps} message={userMessage} />);
    
    // Should show user message content
    expect(screen.getByText(userMessage.content)).toBeInTheDocument();
    
    // User messages should never show thinking bubbles
    expect(screen.queryByText('Analysis complete')).not.toBeInTheDocument();
  });

  it('should show active thinking state when tool calls are in progress', () => {
    const activeDataStream = [
      {
        type: 'tool-call-start',
        toolName: 'search_all_documents',
        parameters: { query: 'key themes' },
        timestamp: Date.now() - 1000,
      },
      // No end event, so tool is still active
    ];

    render(
      <ProgressiveMessage 
        {...defaultProps} 
        dataStream={activeDataStream}
      />
    );
    
    // Should show active thinking state
    expect(screen.getByText('Searching all documents...')).toBeInTheDocument();
  });

  it('should handle citations correctly', () => {
    const citations = [
      {
        documentId: 'doc-1',
        documentName: 'test.pdf',
        chunkId: 'chunk-1',
        content: 'Sample citation content',
        similarity: 0.85,
        chunkIndex: 0,
      },
    ];

    render(
      <ProgressiveMessage 
        {...defaultProps} 
        citations={citations}
      />
    );
    
    // Should show message with citations
    expect(screen.getByText(mockMessage.content)).toBeInTheDocument();
    
    // Citation badge should be rendered
    expect(screen.getByText('[1]')).toBeInTheDocument(); // Citation number
  });

  it('should handle persistence errors correctly', () => {
    const mockRetry = vi.fn();

    render(
      <ProgressiveMessage 
        {...defaultProps} 
        persistenceError={true}
        onRetryPersistence={mockRetry}
      />
    );
    
    // Should show retry button for persistence errors
    const retryButton = screen.getByTitle('Message not saved - click to retry');
    expect(retryButton).toBeInTheDocument();
  });

  it('should call copy function when copy button is clicked', () => {
    const mockCopy = vi.fn();

    render(
      <ProgressiveMessage 
        {...defaultProps} 
        onCopy={mockCopy}
      />
    );
    
    // Should have copy button
    const copyButtons = screen.getAllByRole('button');
    const copyButton = copyButtons.find(button => 
      button.querySelector('svg')?.classList.contains('lucide-copy')
    );
    
    expect(copyButton).toBeInTheDocument();
  });

  it('should format timestamps correctly', () => {
    const customFormatTimestamp = (date: Date) => `Custom: ${date.getHours()}:${date.getMinutes()}`;

    render(
      <ProgressiveMessage 
        {...defaultProps} 
        formatTimestamp={customFormatTimestamp}
      />
    );
    
    // Check that custom timestamp function is called and rendered
    expect(screen.getByText(/Custom: \d+:\d+/)).toBeInTheDocument();
  });
});