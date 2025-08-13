import { render, screen } from '@testing-library/react';
import { ProgressiveMessage } from '@/components/chat/ProgressiveMessage';
import { UIMessage } from '@ai-sdk/react';

const defaultProps = {
  formatTimestamp: (date: Date) => date.toLocaleTimeString(),
};

describe('ProgressiveMessage', () => {
  it('should render assistant message content with markdown', () => {
    const message: UIMessage = {
      id: 'test-message-1',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: 'Based on my search of the documents, I found several key themes...'
        }
      ],
    };

    render(<ProgressiveMessage {...defaultProps} message={message} />);
    
    // Should show message content
    expect(screen.getByText('Based on my search of the documents, I found several key themes...')).toBeInTheDocument();
    
    // Should show bot icon
    expect(screen.getByRole('button')).toBeInTheDocument(); // Copy button
  });

  it('should render user message content with markdown', () => {
    const message: UIMessage = {
      id: 'user-message-1',
      role: 'user',
      parts: [
        {
          type: 'text',
          text: 'What are the main themes in these documents?'
        }
      ],
    };

    render(<ProgressiveMessage {...defaultProps} message={message} />);
    
    // Should show user message content
    expect(screen.getByText('What are the main themes in these documents?')).toBeInTheDocument();
  });

  it('should render markdown formatted content correctly', () => {
    const message: UIMessage = {
      id: 'test-markdown',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: '# Key Findings\n\n- **Point 1**: Important discovery\n- **Point 2**: Another insight\n\nSee the `code example` for details.'
        }
      ],
    };

    render(<ProgressiveMessage {...defaultProps} message={message} />);
    
    // Should render markdown headers (our enhanced typography: H1 is now text-2xl which is 24px)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Key Findings');
    
    // Should render markdown list
    expect(screen.getByText('Point 1')).toBeInTheDocument();
    expect(screen.getByText('Point 2')).toBeInTheDocument();
    
    // Should render inline code
    const codeElement = screen.getByText('code example');
    expect(codeElement).toBeInTheDocument();
    expect(codeElement.tagName).toBe('CODE');
  });

  it('should handle persistence errors correctly', () => {
    const message: UIMessage = {
      id: 'test-message-1',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: 'Test content'
        }
      ],
    };

    const mockRetry = vi.fn();

    render(
      <ProgressiveMessage 
        {...defaultProps}
        message={message}
        persistenceError={true}
        onRetryPersistence={mockRetry}
      />
    );
    
    // Should show retry button for persistence errors
    const retryButton = screen.getByTitle('Message not saved - click to retry');
    expect(retryButton).toBeInTheDocument();
  });

  it('should call copy function when copy button is clicked', () => {
    const message: UIMessage = {
      id: 'test-message-1',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: 'Test content'
        }
      ],
    };

    const mockCopy = vi.fn();

    render(
      <ProgressiveMessage 
        {...defaultProps}
        message={message}
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

  // Note: Timestamp display removed from ProgressiveMessage - timestamps are handled at chat level

  it('should render AI SDK v5 message parts correctly', () => {
    const messageWithParts: UIMessage = {
      id: 'test-parts',
      role: 'assistant',
      parts: [
        {
          type: 'text',
          text: '## Analysis Results\n\nI found the following insights:\n\n- Key theme 1\n- Key theme 2'
        }
      ]
    };

    render(<ProgressiveMessage {...defaultProps} message={messageWithParts} />);
    
    // Should render markdown headers from parts (H2 is now text-xl which is 20px)
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Analysis Results');
    
    // Should render list items
    expect(screen.getByText('Key theme 1')).toBeInTheDocument();
    expect(screen.getByText('Key theme 2')).toBeInTheDocument();
  });

  it('should render tool calls from reconstructed message parts', () => {
    const messageWithToolCalls: UIMessage = {
      id: 'test-tool-calls',
      role: 'assistant',
      parts: [
        {
          type: 'tool-search_all_documents',
          toolCallId: 'tool-123',
          state: 'output-available',
          input: { query: 'pain points' },
          output: 'Found 5 relevant passages'
        },
        {
          type: 'text',
          text: 'Based on the search results, here are the key findings:'
        }
      ]
    };

    render(<ProgressiveMessage {...defaultProps} message={messageWithToolCalls} />);
    
    // Should render tool call completion indicator
    expect(screen.getByText(/Found 5 passage/)).toBeInTheDocument();
    
    // Should render text content after tool calls
    expect(screen.getByText('Based on the search results, here are the key findings:')).toBeInTheDocument();
  });
});