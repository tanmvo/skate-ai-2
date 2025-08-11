import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { Components } from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const customComponents: Components = {
  // Inline code with background highlighting
  code: ({ className, children, ...props }) => (
    <code className={cn("bg-muted px-1 py-0.5 rounded text-sm", className)} {...props}>
      {children}
    </code>
  ),
  // Code blocks with proper styling
  pre: ({ children }) => (
    <pre className="bg-muted p-4 rounded-lg overflow-x-auto border">
      {children}
    </pre>
  ),
  // Links with primary color
  a: ({ href, children }) => (
    <a href={href} className="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  // Headers with proper spacing
  h1: ({ children }) => (
    <h1 className="text-lg font-semibold mb-2 mt-4 first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-base font-semibold mb-2 mt-3 first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-sm font-semibold mb-1 mt-2 first:mt-0">
      {children}
    </h3>
  ),
  // Lists with proper spacing
  ul: ({ children }) => (
    <ul className="list-disc list-inside space-y-1 my-2">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside space-y-1 my-2">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-sm leading-relaxed">
      {children}
    </li>
  ),
  // Paragraphs with spacing
  p: ({ children }) => (
    <p className="text-sm leading-relaxed mb-2 last:mb-0">
      {children}
    </p>
  ),
  // Tables with proper styling
  table: ({ children }) => (
    <div className="overflow-x-auto my-2">
      <table className="min-w-full border-collapse border border-border">
        {children}
      </table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border bg-muted px-3 py-2 text-left text-sm font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-3 py-2 text-sm">
      {children}
    </td>
  ),
  // Blockquotes
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-muted-foreground/20 pl-4 my-2 italic text-muted-foreground">
      {children}
    </blockquote>
  ),
  // Strong/bold text
  strong: ({ children }) => (
    <strong className="font-semibold">
      {children}
    </strong>
  ),
  // Emphasis/italic text
  em: ({ children }) => (
    <em className="italic">
      {children}
    </em>
  ),
};

export const MarkdownRenderer = memo(
  ({ content, className }: MarkdownRendererProps) => (
    <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={customComponents}
      >
        {content}
      </ReactMarkdown>
    </div>
  ),
  (prev, next) => prev.content === next.content
);

MarkdownRenderer.displayName = "MarkdownRenderer";