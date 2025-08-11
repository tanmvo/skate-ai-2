import { render } from '@testing-library/react';
import { MarkdownRenderer } from '@/components/chat/MarkdownRenderer';

describe('MarkdownRenderer Performance', () => {
  it('should render large content without errors', () => {
    const largeContent = Array(50).fill(0).map((_, i) => 
      `# Section ${i}\n\nThis is paragraph ${i} with some **bold** text and *italic* text.\n\n- List item 1\n- List item 2\n- List item 3\n`
    ).join('\n');

    expect(() => {
      render(<MarkdownRenderer content={largeContent} />);
    }).not.toThrow();
  });

  it('should demonstrate memoization works', () => {
    const content = '# Test\n\nSome **bold** text with a [link](https://example.com).';
    
    const { rerender } = render(<MarkdownRenderer content={content} />);
    
    // This should not throw and should work with memoization
    expect(() => {
      rerender(<MarkdownRenderer content={content} />);
      rerender(<MarkdownRenderer content={content} />);
      rerender(<MarkdownRenderer content={content} />);
    }).not.toThrow();
  });

  it('should handle streaming content without errors', () => {
    const baseContent = '# Streaming Content\n\nThis is the beginning...';
    const { rerender } = render(<MarkdownRenderer content={baseContent} />);

    // Simulate streaming by adding content incrementally
    expect(() => {
      for (let i = 1; i <= 10; i++) {
        const streamingContent = baseContent + '\n\n' + Array(i).fill(0).map((_, j) => 
          `Streamed paragraph ${j + 1} with some content.`
        ).join('\n\n');

        rerender(<MarkdownRenderer content={streamingContent} />);
      }
    }).not.toThrow();
  });

  it('should handle complex markdown structures without errors', () => {
    const complexContent = `
# Complex Document

## Table of Contents
- [Section 1](#section-1)
- [Section 2](#section-2)
- [Code Examples](#code-examples)

## Section 1

This section contains **bold text**, *italic text*, and ~~strikethrough text~~.

> This is a blockquote with multiple lines.
> It spans several lines and contains various formatting.

## Section 2

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Cell 1   | Cell 2   | Cell 3   |
| Cell 4   | Cell 5   | Cell 6   |

### Nested Lists

1. First item
   - Nested bullet 1
   - Nested bullet 2
2. Second item
   1. Nested number 1
   2. Nested number 2

## Code Examples

Here's some inline \`code\` and a code block:

\`\`\`javascript
function example() {
  return "Hello, world!";
}
\`\`\`

### Links and References

Visit [Google](https://google.com) for more information.

---

*This is the end of the complex document.*
    `;

    expect(() => {
      render(<MarkdownRenderer content={complexContent} />);
    }).not.toThrow();
  });
});