import { memo, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { cn } from "@/lib/utils";
import type { Components } from "react-markdown";
import { CodeBlock } from "./CodeBlock";
import { CitationBadge } from "./CitationBadge";
import { CitationMap } from "@/lib/types/citations";
import { createDocumentNameLookup, parseStreamingCitations } from "@/lib/utils/citation-parsing";
import { TooltipProvider } from "@/components/ui/tooltip";
import { visit } from "unist-util-visit";
import type { Plugin } from "unified";
import type { Root, Text, PhrasingContent } from "mdast";

interface MarkdownRendererProps {
  content: string;
  citations?: CitationMap; // NEW: Citation data from database
  className?: string;
}

// Type definition for cite element props from remark plugin
interface CiteElementProps {
  'data-citation': string;
  'data-doc': string;
  node?: unknown;
}

// Remark plugin to transform ^[Doc.pdf] into custom citation nodes
function remarkCitations(citationLookup: Map<string, { citationNumber: number; documentId: string }>) {
  return () => {
    return (tree: Root) => {
      visit(tree, 'text', (node: Text, index, parent) => {
        if (!node.value.includes('^[')) {
          return;
        }

        // Split text by citation pattern
        const parts: PhrasingContent[] = [];
        const regex = /\^\[([^\]]+)\]/g;
        let lastIndex = 0;
        let match;

        while ((match = regex.exec(node.value)) !== null) {
          // Add text before citation
          if (match.index > lastIndex) {
            parts.push({
              type: 'text',
              value: node.value.substring(lastIndex, match.index)
            });
          }

          const docName = match[1].trim();
          const citationInfo = citationLookup.get(docName);

          if (citationInfo) {
            // Create a custom HTML node for the citation
            parts.push({
              type: 'html',
              value: `<cite data-citation="${citationInfo.citationNumber}" data-doc="${docName}"></cite>`
            });
          } else {
            // Keep original if not found
            parts.push({
              type: 'text',
              value: match[0]
            });
          }

          lastIndex = regex.lastIndex;
        }

        // Add remaining text
        if (lastIndex < node.value.length) {
          parts.push({
            type: 'text',
            value: node.value.substring(lastIndex)
          });
        }

        // Replace the text node with the parts
        if (parts.length > 0 && parent && typeof index === 'number') {
          parent.children.splice(index, 1, ...parts);
        }
      });
    };
  };
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
  ({ content, citations, className }: MarkdownRendererProps) => {
    // Create citation lookup and remark plugin
    const { citationLookup, remarkPlugin } = useMemo(() => {
      // If no validated citations from database, parse from content for real-time rendering
      const effectiveCitations = citations && Object.keys(citations).length > 0
        ? citations
        : parseStreamingCitations(content);

      // If still no citations found, skip citation processing
      if (Object.keys(effectiveCitations).length === 0) {
        return { citationLookup: new Map(), remarkPlugin: undefined };
      }

      const lookup = createDocumentNameLookup(effectiveCitations);
      const plugin = remarkCitations(lookup);

      return { citationLookup: lookup, remarkPlugin: plugin };
    }, [citations, content]);

    // Create custom components with citation rendering
    const componentsWithCitations = useMemo(() => {
      if (citationLookup.size === 0) {
        return customComponents;
      }

      return {
        ...customComponents,
        // Handle custom cite elements created by the remark plugin
        cite: (props: CiteElementProps) => {
          // Parse and validate citation number
          const citationNumber = parseInt(props['data-citation'], 10);
          const documentName = props['data-doc'];

          // Validate parsed number
          if (isNaN(citationNumber) || citationNumber < 1) {
            console.error('[MarkdownRenderer] Invalid citation number:', props['data-citation']);
            return null; // Graceful degradation
          }

          // Validate document name exists
          if (!documentName || documentName.trim() === '') {
            console.error('[MarkdownRenderer] Missing document name for citation:', citationNumber);
            return null; // Graceful degradation
          }

          return (
            <CitationBadge
              citationNumber={citationNumber}
              documentName={documentName}
              documentExists={true}
            />
          );
        },
      } as Components;
    }, [citationLookup]);

    return (
      <TooltipProvider delayDuration={200}>
        <div className={cn(
          "prose prose-sm lg:prose-base max-w-none dark:prose-invert",
          "prose-headings:scroll-mt-20",
          "prose-code:text-foreground",
          className
        )}>
          <ReactMarkdown
            remarkPlugins={remarkPlugin ? [remarkGfm, remarkPlugin] : [remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={componentsWithCitations}
          >
            {content}
          </ReactMarkdown>
        </div>
      </TooltipProvider>
    );
  },
  (prev, next) => prev.content === next.content && prev.citations === next.citations
);

MarkdownRenderer.displayName = "MarkdownRenderer";