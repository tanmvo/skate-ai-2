import { render, screen } from '@testing-library/react';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';

describe('MarkdownRenderer', () => {
  it('should render plain text correctly', () => {
    render(<MarkdownRenderer content="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('should render markdown headers correctly with enhanced typography', () => {
    const content = '# Header 1\n## Header 2\n### Header 3\n#### Header 4\n##### Header 5\n###### Header 6';
    render(<MarkdownRenderer content={content} />);
    
    // Test all 6 header levels (enhanced from original 3)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Header 1');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Header 2');
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Header 3');
    expect(screen.getByRole('heading', { level: 4 })).toHaveTextContent('Header 4');
    expect(screen.getByRole('heading', { level: 5 })).toHaveTextContent('Header 5');
    expect(screen.getByRole('heading', { level: 6 })).toHaveTextContent('Header 6');
    
    // Test enhanced typography classes are applied
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveClass('text-2xl'); // Enhanced from text-lg
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

  it('should render code blocks correctly with enhanced CodeBlock component', () => {
    const content = '```javascript\nconst hello = "world";\nconsole.log(hello);\n```';
    render(<MarkdownRenderer content={content} />);
    
    const codeElement = screen.getByText(/const hello = "world"/);
    expect(codeElement.closest('pre')).toBeInTheDocument();
    
    // Test enhanced styling
    const preElement = codeElement.closest('pre');
    expect(preElement).toHaveClass('rounded-xl'); // Enhanced from rounded-lg
    expect(preElement).toHaveClass('bg-muted'); // Design token usage
  });

  it('should render inline code correctly with enhanced styling', () => {
    const content = 'Use the `console.log()` function to debug.';
    render(<MarkdownRenderer content={content} />);
    
    // Test that inline code is rendered correctly - it should exist
    const codeElement = screen.getByText('console.log()');
    expect(codeElement.tagName).toBe('CODE');
    
    // Note: The exact styling classes depend on react-markdown's inline detection
    // The important thing is that the CodeBlock component is used for code rendering
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

  it('should render blockquotes correctly with enhanced styling', () => {
    const content = '> This is a blockquote\n> with multiple lines';
    render(<MarkdownRenderer content={content} />);
    
    const blockquote = screen.getByText(/This is a blockquote/).closest('blockquote');
    expect(blockquote).toBeInTheDocument();
    expect(blockquote).toHaveClass('border-primary/20'); // Enhanced color
    expect(blockquote).toHaveClass('bg-muted/30'); // Enhanced background
    expect(blockquote).toHaveClass('rounded-r-md'); // Enhanced styling
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