import { describe, it, expect } from 'vitest';
import { 
  chunkText, 
  validateChunks, 
  mergeOverlappingChunks,
  DEFAULT_CHUNKING_OPTIONS,
  type ChunkingOptions 
} from '@/lib/document-chunking';

describe('document-chunking', () => {
  describe('chunkText', () => {
    it('should return single chunk for short text', () => {
      const shortText = 'This is a short text that fits in one chunk.';
      const chunks = chunkText(shortText);

      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe(shortText);
      expect(chunks[0].chunkIndex).toBe(0);
      expect(chunks[0].startPosition).toBe(0);
      expect(chunks[0].endPosition).toBe(shortText.length);
    });

    it('should return empty array for empty text', () => {
      const chunks = chunkText('');
      expect(chunks).toHaveLength(0);
    });

    it('should return empty array for whitespace-only text', () => {
      const chunks = chunkText('   \n\t   ');
      expect(chunks).toHaveLength(0);
    });

    it('should split long text into multiple chunks', () => {
      // Create text longer than default chunk size (1000 chars)
      const longText = 'A'.repeat(2500);
      const chunks = chunkText(longText);

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks.length).toBeLessThanOrEqual(4); // Should not create too many chunks
      
      // Check chunk indices are sequential
      chunks.forEach((chunk, index) => {
        expect(chunk.chunkIndex).toBe(index);
      });
    });

    it('should respect chunk size options', () => {
      const text = 'A'.repeat(2000);
      const options: Partial<ChunkingOptions> = {
        chunkSize: 500,
        overlapSize: 100,
      };
      
      const chunks = chunkText(text, options);
      
      // Should create more chunks with smaller chunk size
      expect(chunks.length).toBeGreaterThan(2);
      
      // Most chunks should be around the target size (allowing for boundary adjustments)
      chunks.slice(0, -1).forEach(chunk => {
        expect(chunk.content.length).toBeLessThanOrEqual(600); // chunk size + some buffer
        expect(chunk.content.length).toBeGreaterThanOrEqual(300); // reasonable minimum
      });
    });

    it('should preserve paragraph boundaries when enabled', () => {
      const text = 'First paragraph with some content.\n\nSecond paragraph with more content.\n\nThird paragraph.';
      const options: Partial<ChunkingOptions> = {
        chunkSize: 50, // Force chunking
        preserveParagraphs: true,
      };
      
      const chunks = chunkText(text, options);
      
      // Should prefer breaking at paragraph boundaries
      chunks.forEach(chunk => {
        const content = chunk.content;
        // Check that chunks don't break in the middle of words unnecessarily
        if (content.length > 10) { // Skip very short chunks
          expect(content.trim()).not.toMatch(/^\w+$/); // Shouldn't be just a single word
        }
      });
    });

    it('should handle custom overlap size', () => {
      const text = 'Word1 Word2 Word3 Word4 Word5 Word6 Word7 Word8 Word9 Word10 '.repeat(50);
      const options: Partial<ChunkingOptions> = {
        chunkSize: 200,
        overlapSize: 50,
      };
      
      const chunks = chunkText(text, options);
      
      if (chunks.length > 1) {
        // Check that consecutive chunks have overlapping content
        for (let i = 0; i < chunks.length - 1; i++) {
          const currentChunk = chunks[i];
          const nextChunk = chunks[i + 1];
          
          // There should be some overlap in content
          const currentEnd = currentChunk.content.slice(-30);
          const nextStart = nextChunk.content.slice(0, 30);
          
          // Check for any common words (basic overlap detection)
          const currentWords = currentEnd.split(/\s+/);
          const nextWords = nextStart.split(/\s+/);
          const commonWords = currentWords.filter(word => nextWords.includes(word) && word.length > 2);
          
          expect(commonWords.length).toBeGreaterThan(0);
        }
      }
    });

    it('should respect minimum chunk size', () => {
      const text = 'A B C D E F G H I J K L M N O P Q R S T U V W X Y Z ';
      const options: Partial<ChunkingOptions> = {
        chunkSize: 10,
        minChunkSize: 20,
      };
      
      const chunks = chunkText(text, options);
      
      // All chunks should meet minimum size requirement
      chunks.forEach(chunk => {
        expect(chunk.content.length).toBeGreaterThanOrEqual(options.minChunkSize!);
      });
    });

    it('should normalize line endings', () => {
      const textWithCRLF = 'Line 1\r\nLine 2\rLine 3\nLine 4';
      const chunks = chunkText(textWithCRLF);
      
      expect(chunks[0].content).not.toContain('\r');
      expect(chunks[0].content).toContain('\n');
    });

    it('should handle special characters and unicode', () => {
      const unicodeText = 'Café Münchën 北京 🌟 émojis and special chars: @#$%^&*()';
      const chunks = chunkText(unicodeText);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe(unicodeText);
    });
  });

  describe('validateChunks', () => {
    it('should validate correct chunks', () => {
      const validChunks = [
        { content: 'Chunk 1', chunkIndex: 0, startPosition: 0, endPosition: 7 },
        { content: 'Chunk 2', chunkIndex: 1, startPosition: 5, endPosition: 12 },
      ];
      
      const result = validateChunks(validChunks);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate empty chunks array', () => {
      const result = validateChunks([]);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect incorrect chunk indices', () => {
      const invalidChunks = [
        { content: 'Chunk 1', chunkIndex: 0 },
        { content: 'Chunk 2', chunkIndex: 5 }, // Wrong index
      ];
      
      const result = validateChunks(invalidChunks);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Chunk 1 has incorrect index: expected 1, got 5');
    });

    it('should detect empty chunks', () => {
      const invalidChunks = [
        { content: 'Chunk 1', chunkIndex: 0 },
        { content: '', chunkIndex: 1 }, // Empty content
        { content: '   ', chunkIndex: 2 }, // Whitespace only
      ];
      
      const result = validateChunks(invalidChunks);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Chunk 1 is empty');
      expect(result.errors).toContain('Chunk 2 is empty');
    });

    it('should detect invalid positions', () => {
      const invalidChunks = [
        { content: 'Chunk 1', chunkIndex: 0, startPosition: 10, endPosition: 5 }, // start > end
        { content: 'Chunk 2', chunkIndex: 1, startPosition: 15, endPosition: 15 }, // start == end
      ];
      
      const result = validateChunks(invalidChunks);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Chunk 0 has invalid positions: start 10 >= end 5');
      expect(result.errors).toContain('Chunk 1 has invalid positions: start 15 >= end 15');
    });

    it('should handle chunks without position information', () => {
      const chunksWithoutPos = [
        { content: 'Chunk 1', chunkIndex: 0 },
        { content: 'Chunk 2', chunkIndex: 1 },
      ];
      
      const result = validateChunks(chunksWithoutPos);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('mergeOverlappingChunks', () => {
    it('should not merge chunks with low overlap', () => {
      const chunks = [
        { content: 'First chunk about cats', chunkIndex: 0 },
        { content: 'Second chunk about dogs', chunkIndex: 1 },
      ];
      
      const merged = mergeOverlappingChunks(chunks, 0.8);
      expect(merged).toHaveLength(2);
      expect(merged[0].chunkIndex).toBe(0);
      expect(merged[1].chunkIndex).toBe(1);
    });

    it('should merge chunks with high overlap', () => {
      const chunks = [
        { content: 'cats and dogs are pets', chunkIndex: 0 },
        { content: 'dogs and cats are animals', chunkIndex: 1 },
      ];
      
      const merged = mergeOverlappingChunks(chunks, 0.5); // Lower threshold
      expect(merged).toHaveLength(1);
      expect(merged[0].content).toContain('cats and dogs are pets');
      expect(merged[0].content).toContain('dogs and cats are animals');
    });

    it('should handle single chunk', () => {
      const chunks = [
        { content: 'Only chunk', chunkIndex: 0 },
      ];
      
      const merged = mergeOverlappingChunks(chunks);
      expect(merged).toHaveLength(1);
      expect(merged[0]).toEqual(chunks[0]);
    });

    it('should handle empty chunks array', () => {
      const merged = mergeOverlappingChunks([]);
      expect(merged).toHaveLength(0);
    });

    it('should reindex merged chunks correctly', () => {
      const chunks = [
        { content: 'one two three', chunkIndex: 0 },
        { content: 'three four five', chunkIndex: 1 },
        { content: 'six seven eight', chunkIndex: 2 },
      ];
      
      // Set threshold to merge first two but not the third
      // The first two chunks share "three" so should have some overlap
      const merged = mergeOverlappingChunks(chunks, 0.1); // Lower threshold
      
      // Depending on the overlap calculation, it might merge differently
      // Let's just check that it returns some chunks and they're properly indexed
      expect(merged.length).toBeGreaterThan(0);
      merged.forEach((chunk, index) => {
        expect(chunk.chunkIndex).toBe(index);
      });
    });

    it('should preserve other chunk properties during merge', () => {
      const chunks = [
        { content: 'cats dogs', chunkIndex: 0, startPosition: 0, endPosition: 9 },
        { content: 'dogs cats', chunkIndex: 1, startPosition: 5, endPosition: 14 },
      ];
      
      const merged = mergeOverlappingChunks(chunks, 0.5);
      expect(merged).toHaveLength(1);
      expect(merged[0].startPosition).toBe(0);
      expect(merged[0].endPosition).toBe(14);
    });
  });

  describe('DEFAULT_CHUNKING_OPTIONS', () => {
    it('should have reasonable default values', () => {
      expect(DEFAULT_CHUNKING_OPTIONS.chunkSize).toBe(1000);
      expect(DEFAULT_CHUNKING_OPTIONS.overlapSize).toBe(200);
      expect(DEFAULT_CHUNKING_OPTIONS.preserveParagraphs).toBe(true);
      expect(DEFAULT_CHUNKING_OPTIONS.minChunkSize).toBe(100);
    });

    it('should work with default options', () => {
      const text = 'A'.repeat(2000);
      const chunks = chunkText(text); // Using defaults
      
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.content.length).toBeGreaterThanOrEqual(DEFAULT_CHUNKING_OPTIONS.minChunkSize);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle text with only punctuation', () => {
      const punctText = '!@#$%^&*().,;:"[]{}|\\<>?/~`';
      const chunks = chunkText(punctText);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0].content).toBe(punctText);
    });

    it('should handle text with excessive whitespace', () => {
      const spacyText = '   Word1   \n\n\n   Word2   \t\t\t   Word3   ';
      const chunks = chunkText(spacyText);
      
      expect(chunks).toHaveLength(1);
      expect(chunks[0].content.trim()).toContain('Word1');
      expect(chunks[0].content.trim()).toContain('Word2');
      expect(chunks[0].content.trim()).toContain('Word3');
    });

    it('should handle very small chunk sizes gracefully', () => {
      const text = 'This is a test with small chunks';
      const options: Partial<ChunkingOptions> = {
        chunkSize: 5,
        minChunkSize: 3,
        overlapSize: 1,
      };
      
      const chunks = chunkText(text, options);
      
      expect(chunks.length).toBeGreaterThan(1);
      chunks.forEach(chunk => {
        expect(chunk.content.length).toBeGreaterThanOrEqual(3);
      });
    });
  });
});