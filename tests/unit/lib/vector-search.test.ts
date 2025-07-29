import { describe, it, expect } from 'vitest';
import {
  cosineSimilarity,
  formatSearchResults,
  DEFAULT_SEARCH_OPTIONS,
  type SearchResult
} from '@/lib/vector-search';

describe('vector-search', () => {
  describe('cosineSimilarity', () => {
    it('should calculate cosine similarity correctly', () => {
      const vectorA = [1, 0, 0];
      const vectorB = [1, 0, 0];
      
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBeCloseTo(1.0, 6);
    });

    it('should handle orthogonal vectors', () => {
      const vectorA = [1, 0, 0];
      const vectorB = [0, 1, 0];
      
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBeCloseTo(0.0, 6);
    });

    it('should handle opposite vectors', () => {
      const vectorA = [1, 0, 0];
      const vectorB = [-1, 0, 0];
      
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBeCloseTo(-1.0, 6);
    });

    it('should calculate similarity for complex vectors', () => {
      const vectorA = [0.1, 0.2, 0.3, 0.4];
      const vectorB = [0.2, 0.1, 0.4, 0.3];
      
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it('should handle zero vectors', () => {
      const vectorA = [0, 0, 0];
      const vectorB = [1, 2, 3];
      
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBe(0);
    });

    it('should throw error for mismatched vector lengths', () => {
      const vectorA = [1, 2, 3];
      const vectorB = [1, 2];
      
      expect(() => cosineSimilarity(vectorA, vectorB)).toThrow(
        'Vectors must have the same length'
      );
    });

    it('should handle normalized vectors', () => {
      // Unit vectors
      const vectorA = [1/Math.sqrt(2), 1/Math.sqrt(2), 0];
      const vectorB = [1/Math.sqrt(2), 0, 1/Math.sqrt(2)];
      
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBeCloseTo(0.5, 6);
    });

    it('should handle high-dimensional vectors', () => {
      // Test with larger vectors similar to real embeddings
      const size = 100;
      const vectorA = Array.from({ length: size }, (_, i) => Math.sin(i / 10));
      const vectorB = Array.from({ length: size }, (_, i) => Math.cos(i / 10));
      
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBeGreaterThan(-1);
      expect(similarity).toBeLessThan(1);
    });

    it('should be symmetric', () => {
      const vectorA = [0.1, 0.2, 0.3];
      const vectorB = [0.4, 0.5, 0.6];
      
      const similarityAB = cosineSimilarity(vectorA, vectorB);
      const similarityBA = cosineSimilarity(vectorB, vectorA);
      
      expect(similarityAB).toBeCloseTo(similarityBA, 10);
    });

    it('should handle identical vectors', () => {
      const vector = [0.123, 0.456, 0.789];
      
      const similarity = cosineSimilarity(vector, [...vector]);
      expect(similarity).toBeCloseTo(1.0, 10);
    });
  });

  describe('formatSearchResults', () => {
    it('should format search results correctly', () => {
      const results: SearchResult[] = [
        {
          chunkId: 'chunk1',
          content: 'First result about cats',
          similarity: 0.95,
          documentId: 'doc1',
          documentName: 'animals.pdf',
          chunkIndex: 0,
        },
        {
          chunkId: 'chunk2',
          content: 'Second result about dogs',
          similarity: 0.85,
          documentId: 'doc2',
          documentName: 'pets.pdf',
          chunkIndex: 1,
        },
      ];

      const formatted = formatSearchResults(results);

      expect(formatted).toContain('[1] animals.pdf (95% match)');
      expect(formatted).toContain('First result about cats');
      expect(formatted).toContain('[2] pets.pdf (85% match)');
      expect(formatted).toContain('Second result about dogs');
      expect(formatted).toContain('---');
    });

    it('should handle empty results', () => {
      const formatted = formatSearchResults([]);
      expect(formatted).toBe('No relevant content found.');
    });

    it('should handle single result', () => {
      const results: SearchResult[] = [
        {
          chunkId: 'chunk1',
          content: 'Single result',
          similarity: 0.75,
          documentId: 'doc1',
          documentName: 'single.pdf',
          chunkIndex: 0,
        },
      ];

      const formatted = formatSearchResults(results);
      expect(formatted).toContain('[1] single.pdf (75% match)');
      expect(formatted).toContain('Single result');
      expect(formatted).not.toContain('---'); // No separator for single result
    });

    it('should round similarity percentages correctly', () => {
      const results: SearchResult[] = [
        {
          chunkId: 'chunk1',
          content: 'Test content',
          similarity: 0.123456, // Should round to 12%
          documentId: 'doc1',
          documentName: 'test.pdf',
          chunkIndex: 0,
        },
        {
          chunkId: 'chunk2',
          content: 'Another test',
          similarity: 0.987654, // Should round to 99%
          documentId: 'doc2',
          documentName: 'test2.pdf',
          chunkIndex: 1,
        },
      ];

      const formatted = formatSearchResults(results);
      expect(formatted).toContain('(12% match)');
      expect(formatted).toContain('(99% match)');
    });

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(1000);
      const results: SearchResult[] = [
        {
          chunkId: 'chunk1',
          content: longContent,
          similarity: 0.8,
          documentId: 'doc1',
          documentName: 'long.pdf',
          chunkIndex: 0,
        },
      ];

      const formatted = formatSearchResults(results);
      expect(formatted).toContain('[1] long.pdf (80% match)');
      expect(formatted).toContain(longContent);
    });

    it('should handle special characters in content', () => {
      const results: SearchResult[] = [
        {
          chunkId: 'chunk1',
          content: 'Content with "quotes" and special chars: @#$%^&*()',
          similarity: 0.9,
          documentId: 'doc1',
          documentName: 'special.pdf',
          chunkIndex: 0,
        },
      ];

      const formatted = formatSearchResults(results);
      expect(formatted).toContain('Content with "quotes" and special chars: @#$%^&*()');
    });

    it('should trim whitespace from content', () => {
      const results: SearchResult[] = [
        {
          chunkId: 'chunk1',
          content: '   Content with whitespace   ',
          similarity: 0.8,
          documentId: 'doc1',
          documentName: 'test.pdf',
          chunkIndex: 0,
        },
      ];

      const formatted = formatSearchResults(results);
      expect(formatted).toContain('Content with whitespace'); // Trimmed
      expect(formatted).not.toContain('   Content'); // No leading whitespace
    });
  });

  describe('DEFAULT_SEARCH_OPTIONS', () => {
    it('should have reasonable default values', () => {
      expect(DEFAULT_SEARCH_OPTIONS.limit).toBe(5);
      expect(DEFAULT_SEARCH_OPTIONS.minSimilarity).toBe(0.1);
    });

    it('should have limit as a positive integer', () => {
      expect(DEFAULT_SEARCH_OPTIONS.limit).toBeGreaterThan(0);
      expect(Number.isInteger(DEFAULT_SEARCH_OPTIONS.limit)).toBe(true);
    });

    it('should have minSimilarity between 0 and 1', () => {
      expect(DEFAULT_SEARCH_OPTIONS.minSimilarity).toBeGreaterThanOrEqual(0);
      expect(DEFAULT_SEARCH_OPTIONS.minSimilarity).toBeLessThanOrEqual(1);
    });
  });

  describe('similarity edge cases', () => {
    it('should handle very small numbers', () => {
      const vectorA = [1e-10, 2e-10, 3e-10];
      const vectorB = [1e-10, 2e-10, 3e-10];
      
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBeCloseTo(1.0, 5);
    });

    it('should handle very large numbers', () => {
      const vectorA = [1e6, 2e6, 3e6];
      const vectorB = [1e6, 2e6, 3e6];
      
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBeCloseTo(1.0, 10);
    });

    it('should handle mixed positive and negative values', () => {
      const vectorA = [1, -2, 3, -4, 5];
      const vectorB = [-1, 2, -3, 4, -5];
      
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBeCloseTo(-1.0, 10); // Perfect negative correlation
    });

    it('should handle sparse vectors (mostly zeros)', () => {
      const vectorA = [1, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      const vectorB = [0, 0, 0, 0, 0, 0, 0, 0, 0, 1];
      
      const similarity = cosineSimilarity(vectorA, vectorB);
      expect(similarity).toBeCloseTo(0.0, 10); // Orthogonal
    });
  });
});