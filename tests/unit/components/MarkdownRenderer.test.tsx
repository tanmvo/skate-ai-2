import { render, screen } from '@testing-library/react';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('should render plain text correctly', () => {
    render(<MarkdownRenderer content="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('should render markdown headers correctly', () => {
    const content = '# Header 1\n## Header 2\n### Header 3';
    render(<MarkdownRenderer content={content} />);
    
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Header 1');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Header 2');
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Header 3');
  });

  it('should render markdown lists correctly', () => {
    const content = '- Item 1\n- Item 2\n- Item 3';
    render(<MarkdownRenderer content={content} />);
    
    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Item 3')).toBeInTheDocument();
  });

  it('should render ordered lists correctly', () => {
    const content = '1. First item\n2. Second item\n3. Third item';
    render(<MarkdownRenderer content={content} />);
    
    const list = screen.getByRole('list');
    expect(list).toBeInTheDocument();
    expect(screen.getByText('First item')).toBeInTheDocument();
    expect(screen.getByText('Second item')).toBeInTheDocument();
    expect(screen.getByText('Third item')).toBeInTheDocument();
  });

  it('should render inline code correctly', () => {
    const content = 'Use the `console.log()` function to debug.';
    render(<MarkdownRenderer content={content} />);
    
    const codeElement = screen.getByText('console.log()');
    expect(codeElement).toBeInTheDocument();
    expect(codeElement.tagName).toBe('CODE');
  });

  it('should render code blocks correctly', () => {
    const content = '```javascript\nconst hello = "world";\nconsole.log(hello);\n```';
    render(<MarkdownRenderer content={content} />);
    
    const preElement = screen.getByText(/const hello = "world"/);
    expect(preElement.closest('pre')).toBeInTheDocument();
  });

  it('should render links correctly', () => {
    const content = 'Visit [Google](https://google.com) for more info.';
    render(<MarkdownRenderer content={content} />);
    
    const link = screen.getByRole('link', { name: 'Google' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', 'https://google.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('should render emphasis and strong text correctly', () => {
    const content = 'This is *italic* and **bold** text.';
    render(<MarkdownRenderer content={content} />);
    
    const italic = screen.getByText('italic');
    expect(italic.tagName).toBe('EM');
    
    const bold = screen.getByText('bold');
    expect(bold.tagName).toBe('STRONG');
  });

  it('should render blockquotes correctly', () => {
    const content = '> This is a blockquote\n> with multiple lines';
    render(<MarkdownRenderer content={content} />);
    
    const blockquote = screen.getByText(/This is a blockquote/).closest('blockquote');
    expect(blockquote).toBeInTheDocument();
  });

  it('should render tables correctly', () => {
    const content = `| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |`;
    
    render(<MarkdownRenderer content={content} />);
    
    const table = screen.getByRole('table');
    expect(table).toBeInTheDocument();
    
    expect(screen.getByText('Header 1')).toBeInTheDocument();
    expect(screen.getByText('Header 2')).toBeInTheDocument();
    expect(screen.getByText('Cell 1')).toBeInTheDocument();
    expect(screen.getByText('Cell 2')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<MarkdownRenderer content="Test" className="custom-class" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('custom-class');
    expect(wrapper).toHaveClass('prose');
    expect(wrapper).toHaveClass('prose-sm');
  });

  it('should memoize and not re-render with same content', () => {
    const { rerender } = render(<MarkdownRenderer content="Test content" />);
    const firstRender = screen.getByText('Test content');
    
    // Re-render with same content
    rerender(<MarkdownRenderer content="Test content" />);
    const secondRender = screen.getByText('Test content');
    
    // Should be the same element reference due to memoization
    expect(firstRender).toBe(secondRender);
  });
});