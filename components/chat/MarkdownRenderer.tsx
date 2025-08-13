import { memo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import type { Components } from "react-markdown";
import { CodeBlock } from "./CodeBlock";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

const customComponents: Components = {
  // Enhanced code handling with CodeBlock component
  code: CodeBlock,
  // Let CodeBlock handle pre styling to avoid double backgrounds
  pre: ({ children }) => <>{children}</>,
  // Links with primary color
  a: ({ href, children }) => (
    <a href={href} className="text-primary underline hover:text-primary/80" target="_blank" rel="noopener noreferrer">
      {children}
    </a>
  ),
  // Headers with enhanced hierarchy
  h1: ({ children }) => (
    <h1 className="text-2xl font-semibold mb-3 mt-6 first:mt-0 text-foreground">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold mb-2 mt-5 first:mt-0 text-foreground">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold mb-2 mt-4 first:mt-0 text-foreground">
      {children}
    </h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-semibold mb-1 mt-3 first:mt-0 text-foreground">
      {children}
    </h4>
  ),
  h5: ({ children }) => (
    <h5 className="text-sm font-semibold mb-1 mt-2 first:mt-0 text-foreground">
      {children}
    </h5>
  ),
  h6: ({ children }) => (
    <h6 className="text-xs font-semibold mb-1 mt-2 first:mt-0 text-foreground">
      {children}
    </h6>
  ),
  // Lists with professional hanging indent
  ul: ({ children }) => (
    <ul className="list-disc list-outside ml-4 space-y-1 my-3">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-outside ml-4 space-y-1 my-3">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-sm leading-relaxed">
      {children}
    </li>
  ),
  // Paragraphs with better breathing room
  p: ({ children }) => (
    <p className="text-sm leading-relaxed mb-3 last:mb-0 text-foreground">
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
  // Enhanced blockquotes
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-primary/20 pl-4 my-3 italic text-muted-foreground bg-muted/30 py-2 rounded-r-md">
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
    <div className={cn(
      "prose prose-sm lg:prose-base max-w-none dark:prose-invert",
      "prose-headings:scroll-mt-20",
      "prose-code:text-foreground",
      className
    )}>
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