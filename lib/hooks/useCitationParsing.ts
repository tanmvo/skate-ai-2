import { useMemo } from 'react';
import { CitationMap } from '@/lib/types/citations';
import { createDocumentNameLookup } from '@/lib/utils/citation-parsing';
import { visit } from 'unist-util-visit';
import type { Root, Text, PhrasingContent } from 'mdast';

/**
 * Result type for useCitationParsing hook
 */
export interface UseCitationParsingResult {
  citationLookup: Map<string, { citationNumber: number; documentId: string }>;
  remarkPlugin: (() => (tree: Root) => void) | null;
  hasCitations: boolean;
}

/**
 * Remark plugin factory to transform ^[Doc.pdf] syntax into custom citation nodes
 *
 * @param citationLookup - Map of document names to citation numbers and IDs
 * @returns Remark plugin function
 */
function createRemarkCitationsPlugin(
  citationLookup: Map<string, { citationNumber: number; documentId: string }>
) {
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
              value: node.value.substring(lastIndex, match.index),
            });
          }

          const docName = match[1].trim();
          const citationInfo = citationLookup.get(docName);

          if (citationInfo) {
            // Create a custom HTML node for the citation
            parts.push({
              type: 'html',
              value: `<cite data-citation="${citationInfo.citationNumber}" data-doc="${docName}"></cite>`,
            });
          } else {
            // Keep original if not found
            parts.push({
              type: 'text',
              value: match[0],
            });
          }

          lastIndex = regex.lastIndex;
        }

        // Add remaining text
        if (lastIndex < node.value.length) {
          parts.push({
            type: 'text',
            value: node.value.substring(lastIndex),
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

/**
 * Custom hook for parsing citations from markdown content
 *
 * Features:
 * - Memoizes citation lookup creation for performance
 * - Memoizes remark plugin initialization
 * - Prevents re-computation on every render during streaming
 * - Handles null/empty citation maps gracefully
 *
 * This hook extracts the citation parsing logic from MarkdownRenderer
 * and makes it reusable across components.
 *
 * @param citationMap - Citation map from database or streaming parser
 * @returns Object with citation lookup, remark plugin, and has citations flag
 *
 * @example
 * ```tsx
 * function MarkdownRenderer({ content, citations }) {
 *   const { citationLookup, remarkPlugin, hasCitations } = useCitationParsing(citations);
 *
 *   const remarkPlugins = hasCitations
 *     ? [remarkGfm, remarkPlugin]
 *     : [remarkGfm];
 *
 *   return <ReactMarkdown remarkPlugins={remarkPlugins}>{content}</ReactMarkdown>;
 * }
 * ```
 */
export function useCitationParsing(
  citationMap: CitationMap | null
): UseCitationParsingResult {
  // Memoize citation lookup creation
  const citationLookup = useMemo(() => {
    if (!citationMap || Object.keys(citationMap).length === 0) {
      return new Map<string, { citationNumber: number; documentId: string }>();
    }

    return createDocumentNameLookup(citationMap);
  }, [citationMap]);

  // Memoize remark plugin initialization
  const remarkPlugin = useMemo(() => {
    if (citationLookup.size === 0) {
      return null;
    }

    return createRemarkCitationsPlugin(citationLookup);
  }, [citationLookup]);

  const hasCitations = citationLookup.size > 0;

  return {
    citationLookup,
    remarkPlugin,
    hasCitations,
  };
}
