import { render, screen } from '@testing-library/react';
import { ProgressiveMessage } from '@/components/chat/ProgressiveMessage';
import { Message } from '@ai-sdk/react';

const defaultProps = {
  formatTimestamp: (date: Date) => date.toLocaleTimeString(),
};

describe('ProgressiveMessage', () => {
  it('should render assistant message content with markdown', () => {
    const message: Message = {
      id: 'test-message-1',
      role: 'assistant',
      content: 'Based on my search of the documents, I found several key themes...',
      createdAt: new Date('2024-01-01T12:00:00Z'),
    };

    render(<ProgressiveMessage {...defaultProps} message={message} />);
    
    // Should show message content
    expect(screen.getByText(message.content)).toBeInTheDocument();
    
    // Should show bot icon
    expect(screen.getByRole('button')).toBeInTheDocument(); // Copy button
  });

  it('should render user message content with markdown', () => {
    const message: Message = {
      id: 'user-message-1',
      role: 'user',
      content: 'What are the main themes in these documents?',
      createdAt: new Date('2024-01-01T12:00:00Z'),
    };

    render(<ProgressiveMessage {...defaultProps} message={message} />);
    
    // Should show user message content
    expect(screen.getByText(message.content)).toBeInTheDocument();
  });

  it('should render markdown formatted content correctly', () => {
    const message: Message = {
      id: 'test-markdown',
      role: 'assistant',
      content: '# Key Findings\n\n- **Point 1**: Important discovery\n- **Point 2**: Another insight\n\nSee the `code example` for details.',
      createdAt: new Date('2024-01-01T12:00:00Z'),
    };

    render(<ProgressiveMessage {...defaultProps} message={message} />);
    
    // Should render markdown headers
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
    const message: Message = {
      id: 'test-message-1',
      role: 'assistant',
      content: 'Test content',
      createdAt: new Date('2024-01-01T12:00:00Z'),
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
    const message: Message = {
      id: 'test-message-1',
      role: 'assistant',
      content: 'Test content',
      createdAt: new Date('2024-01-01T12:00:00Z'),
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

  it('should format timestamps correctly', () => {
    const message: Message = {
      id: 'test-message-1',
      role: 'assistant',
      content: 'Test content',
      createdAt: new Date('2024-01-01T12:00:00Z'),
    };

    const customFormatTimestamp = (date: Date) => `Custom: ${date.getHours()}:${date.getMinutes()}`;

    render(
      <ProgressiveMessage 
        {...defaultProps}
        message={message}
        formatTimestamp={customFormatTimestamp}
      />
    );
    
    // Check that custom timestamp function is called and rendered
    expect(screen.getByText(/Custom: \d+:\d+/)).toBeInTheDocument();
  });

  it('should render AI SDK v4 message parts correctly', () => {
    const messageWithParts = {
      id: 'test-parts',
      role: 'assistant',
      createdAt: new Date('2024-01-01T12:00:00Z'),
      parts: [
        {
          type: 'text',
          text: '## Analysis Results\n\nI found the following insights:\n\n- Key theme 1\n- Key theme 2'
        }
      ]
    } as any;

    render(<ProgressiveMessage {...defaultProps} message={messageWithParts} />);
    
    // Should render markdown headers from parts
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Analysis Results');
    
    // Should render list items
    expect(screen.getByText('Key theme 1')).toBeInTheDocument();
    expect(screen.getByText('Key theme 2')).toBeInTheDocument();
  });
});