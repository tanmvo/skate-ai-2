import { renderHook } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useCitationParsing } from '@/lib/hooks/useCitationParsing';
import { CitationMap } from '@/lib/types/citations';

describe('useCitationParsing', () => {
  const mockCitations: CitationMap = {
    '1': { documentId: 'doc_1', documentName: 'Interview-Alice.pdf' },
    '2': { documentId: 'doc_2', documentName: 'Survey-Results.pdf' },
    '3': { documentId: 'doc_3', documentName: 'Field-Notes.pdf' },
  };

  describe('Citation Lookup Creation', () => {
    it('should create citation lookup map from citation map', () => {
      const { result } = renderHook(() => useCitationParsing(mockCitations));

      expect(result.current.citationLookup.size).toBe(3);
      expect(result.current.citationLookup.get('Interview-Alice.pdf')).toEqual({
        citationNumber: 1,
        documentId: 'doc_1',
      });
      expect(result.current.citationLookup.get('Survey-Results.pdf')).toEqual({
        citationNumber: 2,
        documentId: 'doc_2',
      });
    });

    it('should handle null citation map', () => {
      const { result } = renderHook(() => useCitationParsing(null));

      expect(result.current.citationLookup.size).toBe(0);
      expect(result.current.hasCitations).toBe(false);
      expect(result.current.remarkPlugin).toBeNull();
    });

    it('should handle empty citation map', () => {
      const { result } = renderHook(() => useCitationParsing({}));

      expect(result.current.citationLookup.size).toBe(0);
      expect(result.current.hasCitations).toBe(false);
      expect(result.current.remarkPlugin).toBeNull();
    });
  });

  describe('Remark Plugin Creation', () => {
    it('should create remark plugin when citations exist', () => {
      const { result } = renderHook(() => useCitationParsing(mockCitations));

      expect(result.current.remarkPlugin).not.toBeNull();
      expect(typeof result.current.remarkPlugin).toBe('function');
      expect(result.current.hasCitations).toBe(true);
    });

    it('should return null plugin when no citations', () => {
      const { result } = renderHook(() => useCitationParsing(null));

      expect(result.current.remarkPlugin).toBeNull();
      expect(result.current.hasCitations).toBe(false);
    });
  });

  describe('Memoization Behavior', () => {
    it('should memoize lookup when citations unchanged', () => {
      const { result, rerender } = renderHook(
        ({ citations }) => useCitationParsing(citations),
        { initialProps: { citations: mockCitations } }
      );

      const firstLookup = result.current.citationLookup;
      const firstPlugin = result.current.remarkPlugin;

      // Rerender with same citations
      rerender({ citations: mockCitations });

      // Should return same instances (memoized)
      expect(result.current.citationLookup).toBe(firstLookup);
      expect(result.current.remarkPlugin).toBe(firstPlugin);
    });

    it('should recompute when citations change', () => {
      const { result, rerender } = renderHook(
        ({ citations }) => useCitationParsing(citations),
        { initialProps: { citations: mockCitations } }
      );

      const firstLookup = result.current.citationLookup;

      // Rerender with different citations
      const newCitations: CitationMap = {
        '1': { documentId: 'doc_new', documentName: 'NewDoc.pdf' },
      };
      rerender({ citations: newCitations });

      // Should create new instances
      expect(result.current.citationLookup).not.toBe(firstLookup);
      expect(result.current.citationLookup.size).toBe(1);
      expect(result.current.citationLookup.get('NewDoc.pdf')).toEqual({
        citationNumber: 1,
        documentId: 'doc_new',
      });
    });

    it('should handle transition from null to citations', () => {
      const { result, rerender } = renderHook(
        ({ citations }) => useCitationParsing(citations),
        { initialProps: { citations: null } }
      );

      expect(result.current.hasCitations).toBe(false);
      expect(result.current.remarkPlugin).toBeNull();

      // Update to have citations
      rerender({ citations: mockCitations });

      expect(result.current.hasCitations).toBe(true);
      expect(result.current.remarkPlugin).not.toBeNull();
      expect(result.current.citationLookup.size).toBe(3);
    });

    it('should handle transition from citations to null', () => {
      const { result, rerender } = renderHook(
        ({ citations }) => useCitationParsing(citations),
        { initialProps: { citations: mockCitations } }
      );

      expect(result.current.hasCitations).toBe(true);

      // Update to null
      rerender({ citations: null });

      expect(result.current.hasCitations).toBe(false);
      expect(result.current.remarkPlugin).toBeNull();
      expect(result.current.citationLookup.size).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single citation', () => {
      const singleCitation: CitationMap = {
        '1': { documentId: 'doc_1', documentName: 'Single.pdf' },
      };

      const { result } = renderHook(() => useCitationParsing(singleCitation));

      expect(result.current.citationLookup.size).toBe(1);
      expect(result.current.hasCitations).toBe(true);
      expect(result.current.remarkPlugin).not.toBeNull();
    });

    it('should handle citations with special characters in names', () => {
      const specialCitations: CitationMap = {
        '1': { documentId: 'doc_1', documentName: 'File (Copy) [2024].pdf' },
        '2': { documentId: 'doc_2', documentName: 'Doc with spaces.pdf' },
      };

      const { result } = renderHook(() => useCitationParsing(specialCitations));

      expect(result.current.citationLookup.size).toBe(2);
      expect(result.current.citationLookup.get('File (Copy) [2024].pdf')).toEqual({
        citationNumber: 1,
        documentId: 'doc_1',
      });
    });

    it('should handle large citation maps efficiently', () => {
      // Create citation map with 100 entries
      const largeCitations: CitationMap = {};
      for (let i = 1; i <= 100; i++) {
        largeCitations[i.toString()] = {
          documentId: `doc_${i}`,
          documentName: `Document${i}.pdf`,
        };
      }

      const { result } = renderHook(() => useCitationParsing(largeCitations));

      expect(result.current.citationLookup.size).toBe(100);
      expect(result.current.hasCitations).toBe(true);
      expect(result.current.citationLookup.get('Document50.pdf')).toEqual({
        citationNumber: 50,
        documentId: 'doc_50',
      });
    });
  });

  describe('Return Value Structure', () => {
    it('should return all required fields', () => {
      const { result } = renderHook(() => useCitationParsing(mockCitations));

      expect(result.current).toHaveProperty('citationLookup');
      expect(result.current).toHaveProperty('remarkPlugin');
      expect(result.current).toHaveProperty('hasCitations');
    });

    it('should have correct types', () => {
      const { result } = renderHook(() => useCitationParsing(mockCitations));

      expect(result.current.citationLookup).toBeInstanceOf(Map);
      expect(typeof result.current.hasCitations).toBe('boolean');
      expect(typeof result.current.remarkPlugin).toBe('function');
    });
  });
});
