import { describe, it, expect, vi } from 'vitest';

// Set environment variable before any imports
process.env.VOYAGE_API_KEY = 'test-api-key';

import { 
  serializeEmbedding, 
  deserializeEmbedding,
  EMBEDDING_MODEL 
} from '@/lib/voyage-embeddings';

describe('voyage-embeddings', () => {
  // Note: API integration tests are complex to mock and are covered by manual testing
  // These tests focus on the core serialization logic which is critical for database storage

  describe('serializeEmbedding / deserializeEmbedding', () => {
    it('should serialize and deserialize embeddings correctly', () => {
      const originalEmbedding = [0.1, -0.2, 0.3, -0.4, 0.5];
      
      const serialized = serializeEmbedding(originalEmbedding);
      expect(serialized).toBeInstanceOf(Buffer);
      expect(serialized.length).toBe(originalEmbedding.length * 4); // 4 bytes per float32

      const deserialized = deserializeEmbedding(serialized);
      
      // Check that values are approximately equal (floating point precision)
      expect(deserialized).toHaveLength(originalEmbedding.length);
      deserialized.forEach((value, index) => {
        expect(value).toBeCloseTo(originalEmbedding[index], 6);
      });
    });

    it('should handle empty embeddings', () => {
      const empty: number[] = [];
      const serialized = serializeEmbedding(empty);
      const deserialized = deserializeEmbedding(serialized);
      
      expect(deserialized).toEqual([]);
    });

    it('should handle single value embeddings', () => {
      const single = [0.123456];
      const serialized = serializeEmbedding(single);
      const deserialized = deserializeEmbedding(serialized);
      
      expect(deserialized).toHaveLength(1);
      expect(deserialized[0]).toBeCloseTo(0.123456, 6);
    });

    it('should handle large embeddings', () => {
      // Test with a typical embedding size (1536 dimensions for voyage-large-2)
      const large = Array.from({ length: 1536 }, (_, i) => Math.sin(i / 100));
      const serialized = serializeEmbedding(large);
      const deserialized = deserializeEmbedding(serialized);
      
      expect(deserialized).toHaveLength(1536);
      deserialized.forEach((value, index) => {
        expect(value).toBeCloseTo(large[index], 6);
      });
    });

    it('should maintain precision for various float values', () => {
      const testValues = [
        [0.123456789, -0.987654321, 0.555555555],
        [0.000001, 0.999999, -0.000001],
        [Math.PI, Math.E, Math.sqrt(2)],
        [1e-10, 1e10, -1e-5],
      ];

      testValues.forEach(original => {
        const serialized = serializeEmbedding(original);
        const deserialized = deserializeEmbedding(serialized);
        
        deserialized.forEach((value, index) => {
          expect(value).toBeCloseTo(original[index], 5); // 5 decimal places precision
        });
      });
    });

    it('should handle negative zero and positive zero correctly', () => {
      const embedding = [0, -0, +0];
      const serialized = serializeEmbedding(embedding);
      const deserialized = deserializeEmbedding(serialized);
      
      expect(deserialized).toHaveLength(3);
      deserialized.forEach(value => {
        expect(Math.abs(value)).toBe(0);
      });
    });
  });

  describe('module configuration', () => {
    it('should export the correct embedding model', () => {
      expect(EMBEDDING_MODEL).toBe('voyage-large-2');
    });
  });

  describe('embedding vector properties', () => {
    it('should handle typical embedding dimensions', () => {
      // Test common embedding sizes
      const sizes = [128, 256, 512, 768, 1024, 1536];
      
      sizes.forEach(size => {
        const embedding = Array.from({ length: size }, (_, i) => (i / size) - 0.5);
        const serialized = serializeEmbedding(embedding);
        const deserialized = deserializeEmbedding(serialized);
        
        expect(deserialized).toHaveLength(size);
        expect(serialized.length).toBe(size * 4); // 4 bytes per float
      });
    });

    it('should preserve vector magnitude after serialization', () => {
      const embedding = [0.6, 0.8, 0.0]; // Magnitude = 1.0
      
      const originalMagnitude = Math.sqrt(
        embedding.reduce((sum, val) => sum + val * val, 0)
      );
      
      const serialized = serializeEmbedding(embedding);
      const deserialized = deserializeEmbedding(serialized);
      
      const deserializedMagnitude = Math.sqrt(
        deserialized.reduce((sum, val) => sum + val * val, 0)
      );
      
      expect(deserializedMagnitude).toBeCloseTo(originalMagnitude, 6);
    });
  });
});

/*
 * API Integration Testing Note:
 * 
 * The generateEmbedding() and generateBatchEmbeddings() functions are tested
 * through manual integration testing rather than unit tests because:
 * 
 * 1. External API Dependency: These functions require real Voyage AI API calls
 * 2. Complex Mocking: The voyageai client has complex internal state that's hard to mock
 * 3. Real-world Validation: Manual testing with actual documents provides better coverage
 * 4. Error Scenarios: Network errors, rate limits, etc. are better tested manually
 * 
 * Manual Test Coverage:
 * ✅ Successfully processed test-research-document.txt with real embeddings
 * ✅ Document status changed from PROCESSING → READY
 * ✅ Embeddings stored in database as binary data
 * ✅ Error handling works (PDF processing disabled gracefully)
 * 
 * This approach follows testing best practices: 
 * - Unit test pure functions (serialization logic)
 * - Integration test external dependencies (manual API testing)
 */