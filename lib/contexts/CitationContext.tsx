"use client";

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { useDocuments } from '../hooks/useDocuments';

/**
 * Citation context value providing document validation utilities
 */
interface CitationContextValue {
  /** Current study ID for scoping document validation */
  studyId: string;
  /** Check if a document exists in the current study */
  isDocumentValid: (documentId: string) => boolean;
  /** Loading state for documents */
  isLoading: boolean;
}

const CitationContext = createContext<CitationContextValue | undefined>(undefined);

interface CitationProviderProps {
  children: ReactNode;
  studyId: string;
}

/**
 * Citation Provider Component
 *
 * Provides citation-related utilities to the component tree via React Context.
 * Centralizes document validation logic and eliminates prop drilling.
 *
 * **Scope:** Study-level - should wrap the chat interface for a specific study.
 *
 * **What it provides:**
 * - Document existence validation
 * - Loading states for documents
 * - Study ID for scoping
 *
 * **What it does NOT provide:**
 * - Citation data itself (use `useCitations()` hook in components)
 * - Citation parsing (use `useCitationParsing()` hook)
 *
 * @example
 * ```tsx
 * function StudyPage({ studyId }) {
 *   return (
 *     <CitationProvider studyId={studyId}>
 *       <ChatPanel />
 *     </CitationProvider>
 *   );
 * }
 * ```
 */
export function CitationProvider({ children, studyId }: CitationProviderProps) {
  // Fetch documents for validation
  const { documents, isLoading } = useDocuments(studyId);

  // Memoize context value to prevent unnecessary re-renders
  const value: CitationContextValue = useMemo(() => {
    // Create document ID lookup for O(1) existence checks
    const documentIds = new Set(documents.map(doc => doc.id));

    return {
      studyId,
      isDocumentValid: (documentId: string) => documentIds.has(documentId),
      isLoading,
    };
  }, [studyId, documents, isLoading]);

  return (
    <CitationContext.Provider value={value}>
      {children}
    </CitationContext.Provider>
  );
}

/**
 * Hook to access citation context
 *
 * Provides document validation utilities from the citation context.
 * Must be used within a `CitationProvider`.
 *
 * @throws Error if used outside of CitationProvider
 *
 * @example
 * ```tsx
 * function CitationBadge({ documentId }) {
 *   const { isDocumentValid } = useCitationContext();
 *   const exists = isDocumentValid(documentId);
 *
 *   return (
 *     <span className={exists ? 'text-primary' : 'text-muted'}>
 *       Citation
 *     </span>
 *   );
 * }
 * ```
 */
export function useCitationContext(): CitationContextValue {
  const context = useContext(CitationContext);

  if (context === undefined) {
    throw new Error('useCitationContext must be used within a CitationProvider');
  }

  return context;
}

export { CitationContext };
