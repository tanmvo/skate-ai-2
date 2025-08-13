import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { extractTextFromBuffer } from '@/lib/document-processing';
import { chunkText } from '@/lib/document-chunking';
import { generateBatchEmbeddings, serializeEmbedding, deserializeEmbedding } from '@/lib/voyage-embeddings';
import { findRelevantChunks, cosineSimilarity } from '@/lib/vector-search';

// Create mock function first
const mockEmbed = vi.fn();

// Mock external dependencies
vi.mock('voyageai', () => ({
  VoyageAIClient: vi.fn().mockImplementation(() => ({
    embed: mockEmbed,
  })),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    documentChunk: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn(() => 'test-user-id'),
}));

describe('Embedding Pipeline Integration Tests', () => {
  const originalEnv = process.env.VOYAGE_API_KEY;

  beforeEach(() => {
    process.env.VOYAGE_API_KEY = 'test-api-key';
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env.VOYAGE_API_KEY = originalEnv;
  });

  describe('Complete document processing pipeline', () => {
    it('should process text document through complete pipeline', async () => {
      // Step 1: Mock document content
      const documentText = `
        Research Study: User Experience Analysis
        
        Introduction:
        This study examines user behavior patterns in digital interfaces.
        We conducted interviews with 15 participants to understand their pain points.
        
        Key Findings:
        - Users struggle with complex navigation menus
        - Loading times significantly impact user satisfaction
        - Mobile responsiveness is critical for user retention
        
        Methodology:
        We used qualitative research methods including semi-structured interviews.
        Each interview lasted approximately 45 minutes.
        
        Conclusions:
        The findings suggest that simplifying user interfaces leads to better outcomes.
        Future research should focus on accessibility improvements.
      `.trim();

      const mockBuffer = Buffer.from(documentText, 'utf8');

      // Step 2: Test text extraction
      const extractionResult = await extractTextFromBuffer(
        mockBuffer, 
        'text/plain', 
        'research-study.txt'
      );

      expect('text' in extractionResult).toBe(true);
      if ('text' in extractionResult) {
        expect(extractionResult.text).toContain('User Experience Analysis');
        expect(extractionResult.text).toContain('Key Findings');
        expect(extractionResult.metadata?.wordCount).toBeGreaterThan(50);
      }

      // Step 3: Test chunking
      const extractedText = 'text' in extractionResult ? extractionResult.text : '';
      const chunks = chunkText(extractedText, {
        chunkSize: 200, // Smaller chunks for testing
        overlapSize: 50,
      });

      expect(chunks.length).toBeGreaterThan(1);
      expect(chunks[0].content).toContain('Research Study');
      
      // Verify chunk indices are sequential
      chunks.forEach((chunk, index) => {
        expect(chunk.chunkIndex).toBe(index);
      });

      // Step 4: Mock embedding generation
      const { VoyageAIClient } = await vi.importMock<typeof import('voyageai')>('voyageai');
      const mockEmbeddings = chunks.map((_, index) => 
        Array.from({ length: 1536 }, (_, i) => Math.sin((index + 1) * i / 100))
      );

      mockEmbed.mockResolvedValue({
        data: mockEmbeddings.map(embedding => ({ embedding })),
        usage: { total_tokens: chunks.length * 50 },
      });

      // Step 5: Generate embeddings
      const chunkTexts = chunks.map(chunk => chunk.content);
      const embeddingResult = await generateBatchEmbeddings(chunkTexts);

      expect(embeddingResult.embeddings).toHaveLength(chunks.length);
      expect(embeddingResult.usage.totalTokens).toBeGreaterThan(0);

      // Step 6: Test serialization/deserialization
      const serializedEmbeddings = embeddingResult.embeddings.map(embedding => 
        serializeEmbedding(embedding)
      );

      const deserializedEmbeddings = serializedEmbeddings.map(buffer => 
        deserializeEmbedding(buffer)
      );

      // Verify embeddings are preserved through serialization
      deserializedEmbeddings.forEach((deserialized, index) => {
        const original = embeddingResult.embeddings[index];
        expect(deserialized).toHaveLength(original.length);
        
        // Check that values are approximately equal
        deserialized.forEach((value, i) => {
          expect(value).toBeCloseTo(original[i], 5);
        });
      });
    });

    it('should handle PDF document processing', async () => {
      // Skip PDF test for now since we need a real PDF buffer for integration testing
      // This test would require a more complex setup with actual PDF data
      const mockPdfBuffer = Buffer.from('mock-pdf-content');
      
      const extractionResult = await extractTextFromBuffer(
        mockPdfBuffer,
        'application/pdf',
        'research.pdf'
      );

      // For now, expect the extraction to fail gracefully with mock data
      expect('success' in extractionResult && extractionResult.success === false).toBe(true);
    });

    it('should handle DOCX document processing', async () => {
      // Mock DOCX buffer
      const mockDocxBuffer = Buffer.from('mock-docx-content');
      
      // Mock mammoth to return controlled content
      vi.doMock('mammoth', () => ({
        extractRawText: vi.fn().mockResolvedValue({
          value: 'Document content about research methodology and findings.',
          messages: [],
        }),
      }));

      const extractionResult = await extractTextFromBuffer(
        mockDocxBuffer,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'research.docx'
      );

      expect('text' in extractionResult).toBe(true);
      if ('text' in extractionResult) {
        expect(extractionResult.text).toContain('research methodology');
      }
    });
  });

  describe('Vector search integration', () => {
    it('should find relevant chunks using semantic search', async () => {
      // Mock embedded chunks in database
      const mockChunks = [
        {
          id: 'chunk1',
          content: 'Users reported difficulties with navigation menus and complex interfaces',
          chunkIndex: 0,
          embedding: Buffer.from('mock-embedding-1'),
          document: {
            id: 'doc1',
            fileName: 'user-research.pdf',
          },
        },
        {
          id: 'chunk2',
          content: 'Loading performance significantly affects user satisfaction and retention',
          chunkIndex: 1,
          embedding: Buffer.from('mock-embedding-2'),
          document: {
            id: 'doc1',
            fileName: 'user-research.pdf',
          },
        },
        {
          id: 'chunk3',
          content: 'Mobile responsiveness is crucial for modern web applications',
          chunkIndex: 2,
          embedding: Buffer.from('mock-embedding-3'),
          document: {
            id: 'doc2',
            fileName: 'mobile-study.pdf',
          },
        },
      ];

      const mockPrisma = require('@/lib/prisma').prisma;
      mockPrisma.documentChunk.findMany.mockResolvedValue(mockChunks);

      // Mock embeddings for query and chunks
      const queryEmbedding = [0.8, 0.1, 0.1]; // High on first dimension
      const chunkEmbeddings = [
        [0.9, 0.05, 0.05],  // Very similar to query
        [0.1, 0.8, 0.1],    // Different from query
        [0.7, 0.2, 0.1],    // Somewhat similar to query
      ];

      const { VoyageAIClient } = await vi.importMock<typeof import('voyageai')>('voyageai');
      mockEmbed.mockResolvedValue({
        data: [{ embedding: queryEmbedding }],
      });

      // Mock deserialization to return our test embeddings
      const mockDeserializeEmbedding = vi.fn();
      chunkEmbeddings.forEach((embedding, index) => {
        mockDeserializeEmbedding.mockReturnValueOnce(embedding);
      });
      
      vi.doMock('@/lib/voyage-embeddings', async () => {
        const actual = await vi.importActual('@/lib/voyage-embeddings');
        return {
          ...actual,
          generateEmbedding: vi.fn().mockResolvedValue({ embedding: queryEmbedding }),
          deserializeEmbedding: mockDeserializeEmbedding,
        };
      });

      // Test semantic search
      const results = await findRelevantChunks('navigation interface problems', {
        limit: 5,
        minSimilarity: 0.5,
      });

      // Should find the most similar chunks
      expect(results.length).toBeGreaterThan(0);
      
      // Results should be sorted by similarity (highest first)
      for (let i = 1; i < results.length; i++) {
        expect(results[i - 1].similarity).toBeGreaterThanOrEqual(results[i].similarity);
      }

      // Most similar should be chunk1 (navigation/interface content)
      expect(results[0].chunkId).toBe('chunk1');
      expect(results[0].similarity).toBeGreaterThan(0.8);
    });

    it('should handle cross-document search', async () => {
      const mockChunks = [
        {
          id: 'chunk1',
          content: 'First document discusses user interface design principles',
          chunkIndex: 0,
          embedding: Buffer.from('embedding1'),
          document: { id: 'doc1', fileName: 'design-principles.pdf' },
        },
        {
          id: 'chunk2',
          content: 'Second document covers user interface best practices',
          chunkIndex: 0,
          embedding: Buffer.from('embedding2'),
          document: { id: 'doc2', fileName: 'best-practices.pdf' },
        },
      ];

      const mockPrisma = require('@/lib/prisma').prisma;
      mockPrisma.documentChunk.findMany.mockResolvedValue(mockChunks);

      // Mock similar embeddings for both chunks
      const queryEmbedding = [1, 0, 0];
      const chunkEmbedding = [0.9, 0.1, 0];

      const { VoyageAIClient } = await vi.importMock<typeof import('voyageai')>('voyageai');
      mockEmbed.mockResolvedValue({
        data: [{ embedding: queryEmbedding }],
      });

      vi.doMock('@/lib/voyage-embeddings', async () => {
        const actual = await vi.importActual('@/lib/voyage-embeddings');
        return {
          ...actual,
          generateEmbedding: vi.fn().mockResolvedValue({ embedding: queryEmbedding }),
          deserializeEmbedding: vi.fn().mockReturnValue(chunkEmbedding),
        };
      });

      const results = await findRelevantChunks('user interface design');

      expect(results).toHaveLength(2);
      expect(results.map(r => r.documentName)).toEqual([
        'design-principles.pdf',
        'best-practices.pdf'
      ]);
    });
  });

  describe('Similarity calculations', () => {
    it('should calculate cosine similarity correctly for real embeddings', () => {
      // Test with embeddings that have known relationships
      const embedding1 = [0.1, 0.2, 0.3, 0.4, 0.5];
      const embedding2 = [0.1, 0.2, 0.3, 0.4, 0.5]; // Identical
      const embedding3 = [0.2, 0.1, 0.4, 0.3, 0.5]; // Similar but different
      const embedding4 = [-0.1, -0.2, -0.3, -0.4, -0.5]; // Opposite

      const similarity1_2 = cosineSimilarity(embedding1, embedding2);
      const similarity1_3 = cosineSimilarity(embedding1, embedding3);
      const similarity1_4 = cosineSimilarity(embedding1, embedding4);

      expect(similarity1_2).toBeCloseTo(1.0, 6); // Identical vectors
      expect(similarity1_3).toBeGreaterThan(0.8); // Similar vectors
      expect(similarity1_3).toBeLessThan(1.0);
      expect(similarity1_4).toBeCloseTo(-1.0, 6); // Opposite vectors
    });

    it('should handle high-dimensional embeddings', () => {
      // Test with embeddings similar to voyage-large-2 (1536 dimensions)
      const embedding1 = Array.from({ length: 1536 }, (_, i) => Math.sin(i / 100));
      const embedding2 = Array.from({ length: 1536 }, (_, i) => Math.sin(i / 100 + 0.1));
      const embedding3 = Array.from({ length: 1536 }, (_, i) => Math.cos(i / 100));

      const similarity1_2 = cosineSimilarity(embedding1, embedding2);
      const similarity1_3 = cosineSimilarity(embedding1, embedding3);

      expect(similarity1_2).toBeGreaterThan(0.5); // Shifted sin waves should be similar
      expect(similarity1_3).toBeGreaterThan(-1);  // Sin and cos should have some correlation
      expect(similarity1_3).toBeLessThan(1);
    });
  });

  describe('Error handling in pipeline', () => {
    it('should handle text extraction failures gracefully', async () => {
      const corruptBuffer = Buffer.from('corrupt-data');
      
      const result = await extractTextFromBuffer(
        corruptBuffer,
        'application/pdf',
        'corrupt.pdf'
      );

      expect('text' in result).toBe(false);
      if (!('text' in result)) {
        expect(result.error).toBeDefined();
        expect(result.success).toBe(false);
      }
    });

    it('should handle embedding generation failures', async () => {
      const { VoyageAIClient } = await vi.importMock<typeof import('voyageai')>('voyageai');
      mockEmbed.mockRejectedValue(new Error('API quota exceeded'));

      await expect(generateBatchEmbeddings(['test text'])).rejects.toThrow(
        'Batch embedding generation failed: API quota exceeded'
      );
    });

    it('should handle empty or invalid chunks', () => {
      const invalidText = '';
      const chunks = chunkText(invalidText);
      
      expect(chunks).toHaveLength(0);
    });

    it('should handle search with no embeddings available', async () => {
      const mockPrisma = require('@/lib/prisma').prisma;
      mockPrisma.documentChunk.findMany.mockResolvedValue([]);

      const { VoyageAIClient } = await vi.importMock<typeof import('voyageai')>('voyageai');
      mockEmbed.mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
      });

      const results = await findRelevantChunks('test query');
      expect(results).toHaveLength(0);
    });
  });

  describe('Performance considerations', () => {
    it('should handle large batch embedding requests', async () => {
      // Test with a large number of chunks (over the batch limit)
      const largeTextArray = Array.from({ length: 200 }, (_, i) => 
        `This is chunk number ${i} with some content for testing batch processing.`
      );

      const { VoyageAIClient } = await vi.importMock<typeof import('voyageai')>('voyageai');
      
      // Mock the API to handle batches
      mockEmbed.mockImplementation(({ input }: { input: string[] }) => ({
        data: input.map((_: string, index: number) => ({ 
          embedding: Array.from({ length: 10 }, (_: any, i: number) => (index + 1) * i / 100) 
        })),
        usage: { total_tokens: input.length * 20 },
      }));

      const result = await generateBatchEmbeddings(largeTextArray);

      expect(result.embeddings).toHaveLength(200);
      expect(result.usage.totalTokens).toBeGreaterThan(0);
      
      // Should have made multiple API calls due to batch size limits
      expect(mockEmbed).toHaveBeenCalledTimes(2); // 128 + 72
    });

    it('should maintain embedding quality through serialization', () => {
      // Test with various embedding values to ensure precision is maintained
      const testEmbeddings = [
        [0.123456789, -0.987654321, 0.555555555],
        [0.000001, 0.999999, -0.000001],
        [Math.PI, Math.E, Math.sqrt(2)],
      ];

      testEmbeddings.forEach(original => {
        const serialized = serializeEmbedding(original);
        const deserialized = deserializeEmbedding(serialized);
        
        deserialized.forEach((value, index) => {
          expect(value).toBeCloseTo(original[index], 5); // 5 decimal places precision
        });
      });
    });
  });
});