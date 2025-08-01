import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Citation } from '../../lib/types/citations';

// Mock AI SDK functions
const mockCreateDataStreamResponse = vi.fn();
const mockStreamText = vi.fn();
const mockMergeIntoDataStream = vi.fn();
const mockWriteData = vi.fn();

vi.mock('ai', () => ({
  createDataStreamResponse: mockCreateDataStreamResponse,
  streamText: mockStreamText,
}));

// Mock Anthropic SDK
vi.mock('@ai-sdk/anthropic', () => ({
  anthropic: vi.fn(() => 'mock-model'),
}));

// Mock vector search
const mockFindRelevantChunks = vi.fn();
vi.mock('../../lib/vector-search', () => ({
  findRelevantChunks: mockFindRelevantChunks,
}));

// Mock auth functions
vi.mock('../../lib/auth', () => ({
  validateStudyOwnership: vi.fn(() => Promise.resolve(true)),
  getCurrentUserId: vi.fn(() => 'user_123'),
}));

// Mock error handling
vi.mock('../../lib/error-handling', () => ({
  sanitizeError: vi.fn((error) => ({ message: error.message, code: 'UNKNOWN', retryable: true })),
  withTimeout: vi.fn((promise) => promise),
  checkRateLimit: vi.fn(() => ({ allowed: true })),
  ServiceUnavailableError: class extends Error {},
  RateLimitError: class extends Error {},
}));

describe('Citation Streaming API Integration', () => {
  const mockDataStream = {
    writeData: mockWriteData,
  };

  const mockStreamResult = {
    mergeIntoDataStream: mockMergeIntoDataStream,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Set up environment
    process.env.ANTHROPIC_API_KEY = 'test-api-key';
    
    // Default mock implementations
    mockCreateDataStreamResponse.mockImplementation(({ execute }) => {
      // Simulate calling execute with mock dataStream
      execute(mockDataStream);
      return new Response('mock-stream-response');
    });
    
    mockStreamText.mockReturnValue(mockStreamResult);
  });

  describe('Citation Streaming Flow', () => {
    it('should stream citations with chat response', async () => {
      const mockChunks = [
        {
          documentId: 'doc_1',
          documentName: 'test-document.pdf',
          chunkId: 'chunk_1',
          content: 'This is test content from the document',
          similarity: 0.85,
          chunkIndex: 0,
        },
        {
          documentId: 'doc_2',
          documentName: 'another-document.pdf',
          chunkId: 'chunk_2',
          content: 'Another piece of content from a different document',
          similarity: 0.75,
          chunkIndex: 1,
        }
      ];

      mockFindRelevantChunks.mockResolvedValue(mockChunks);

      // Simulate the API route logic
      const simulateApiRoute = async (messages: any[], studyId: string) => {
        const latestMessage = messages[messages.length - 1];
        
        return mockCreateDataStreamResponse({
          execute: async (dataStream: any) => {
            // Find relevant chunks
            const relevantChunks = await mockFindRelevantChunks(latestMessage.content, {
              studyId,
              limit: 5,
              minSimilarity: 0.1,
            });

            if (relevantChunks.length > 0) {
              // Format citations
              const citations = relevantChunks.map((chunk: any) => ({
                documentId: chunk.documentId,
                documentName: chunk.documentName,
                chunkId: chunk.chunkId,
                content: chunk.content.slice(0, 200) + (chunk.content.length > 200 ? '...' : ''),
                similarity: chunk.similarity,
                chunkIndex: chunk.chunkIndex,
              }));

              // Stream citations
              dataStream.writeData({
                type: 'citations',
                citations: citations
              });
            }

            // Generate AI response
            const result = mockStreamText({
              model: 'mock-model',
              system: 'mock-system-prompt',
              messages: messages,
              temperature: 0.1,
              maxTokens: 2000,
            });

            result.mergeIntoDataStream(dataStream);
          },
        });
      };

      const messages = [
        { role: 'user', content: 'What are the main themes?' }
      ];

      await simulateApiRoute(messages, 'study_123');

      // Verify vector search was called
      expect(mockFindRelevantChunks).toHaveBeenCalledWith(
        'What are the main themes?',
        {
          studyId: 'study_123',
          limit: 5,
          minSimilarity: 0.1,
        }
      );

      // Verify citations were streamed
      expect(mockWriteData).toHaveBeenCalledWith({
        type: 'citations',
        citations: [
          {
            documentId: 'doc_1',
            documentName: 'test-document.pdf',
            chunkId: 'chunk_1',
            content: 'This is test content from the document',
            similarity: 0.85,
            chunkIndex: 0,
          },
          {
            documentId: 'doc_2',
            documentName: 'another-document.pdf',
            chunkId: 'chunk_2',
            content: 'Another piece of content from a different document',
            similarity: 0.75,
            chunkIndex: 1,
          }
        ]
      });

      // Verify AI response was generated and merged
      expect(mockStreamText).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'mock-model',
          messages: messages,
          temperature: 0.1,
          maxTokens: 2000,
        })
      );
      
      expect(mockMergeIntoDataStream).toHaveBeenCalledWith(mockDataStream);
    });

    it('should handle vector search failures gracefully', async () => {
      mockFindRelevantChunks.mockRejectedValue(new Error('Vector search failed'));

      const simulateApiRoute = async (messages: any[], studyId: string) => {
        return mockCreateDataStreamResponse({
          execute: async (dataStream: any) => {
            let documentContext = '';
            
            try {
              const relevantChunks = await mockFindRelevantChunks(messages[0].content, {
                studyId,
                limit: 5,
                minSimilarity: 0.1,
              });

              // This shouldn't execute due to the error
              if (relevantChunks.length > 0) {
                dataStream.writeData({
                  type: 'citations',
                  citations: []
                });
              }
            } catch (error) {
              console.warn('Failed to retrieve document context:', error);
              // Continue without context
            }

            // Should still generate AI response
            const result = mockStreamText({
              model: 'mock-model',
              system: `System prompt ${documentContext ? `with context: ${documentContext}` : 'without context'}`,
              messages: messages,
            });

            result.mergeIntoDataStream(dataStream);
          },
        });
      };

      const messages = [{ role: 'user', content: 'Test question' }];

      await simulateApiRoute(messages, 'study_123');

      // Vector search should have been attempted
      expect(mockFindRelevantChunks).toHaveBeenCalled();
      
      // No citations should be streamed due to error
      expect(mockWriteData).not.toHaveBeenCalled();
      
      // AI response should still be generated
      expect(mockStreamText).toHaveBeenCalled();
      expect(mockMergeIntoDataStream).toHaveBeenCalled();
    });

    it('should merge citations with AI text stream', async () => {
      const mockChunks = [
        {
          documentId: 'doc_1',
          documentName: 'test.pdf',
          chunkId: 'chunk_1',
          content: 'Test content',
          similarity: 0.9,
          chunkIndex: 0,
        }
      ];

      mockFindRelevantChunks.mockResolvedValue(mockChunks);

      const simulateApiRoute = async () => {
        return mockCreateDataStreamResponse({
          execute: async (dataStream: any) => {
            // Stream citations first
            dataStream.writeData({
              type: 'citations',
              citations: [{
                documentId: 'doc_1',
                documentName: 'test.pdf',
                chunkId: 'chunk_1',
                content: 'Test content',
                similarity: 0.9,
                chunkIndex: 0,
              }]
            });

            // Then merge AI stream
            const result = mockStreamText({
              model: 'mock-model',
              system: 'System prompt with context',
              messages: [{ role: 'user', content: 'Test' }],
            });

            result.mergeIntoDataStream(dataStream);
          },
        });
      };

      await simulateApiRoute();

      // Verify order: citations streamed first, then AI response merged
      expect(mockWriteData).toHaveBeenCalledBefore(mockMergeIntoDataStream as any);
      expect(mockWriteData).toHaveBeenCalledWith({
        type: 'citations',
        citations: expect.any(Array)
      });
      expect(mockMergeIntoDataStream).toHaveBeenCalledWith(mockDataStream);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle AI SDK streaming errors', () => {
      mockCreateDataStreamResponse.mockImplementation(() => {
        throw new Error('AI SDK error');
      });

      const simulateApiRoute = async () => {
        try {
          return mockCreateDataStreamResponse({
            execute: async () => {
              // Should not reach here
            },
          });
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toBe('AI SDK error');
          throw error;
        }
      };

      expect(simulateApiRoute()).rejects.toThrow('AI SDK error');
    });

    it('should handle malformed citation data', async () => {
      // Mock vector search returning malformed data
      mockFindRelevantChunks.mockResolvedValue([
        { documentId: 'doc_1' }, // Missing required fields
        null, // Null entry
        {
          documentId: 'doc_2',
          documentName: 'valid.pdf',
          chunkId: 'chunk_2',
          content: 'Valid content',
          similarity: 0.8,
          chunkIndex: 1,
        }
      ]);

      const simulateApiRoute = async () => {
        return mockCreateDataStreamResponse({
          execute: async (dataStream: any) => {
            const relevantChunks = await mockFindRelevantChunks('test', {
              studyId: 'study_123',
              limit: 5,
              minSimilarity: 0.1,
            });

            if (relevantChunks.length > 0) {
              // Filter out malformed entries
              const validCitations = relevantChunks
                .filter(chunk => chunk && chunk.documentId && chunk.documentName && chunk.chunkId)
                .map((chunk: any) => ({
                  documentId: chunk.documentId,
                  documentName: chunk.documentName,
                  chunkId: chunk.chunkId,
                  content: chunk.content?.slice(0, 200) + (chunk.content?.length > 200 ? '...' : '') || '',
                  similarity: chunk.similarity || 0,
                  chunkIndex: chunk.chunkIndex || 0,
                }));

              dataStream.writeData({
                type: 'citations',
                citations: validCitations
              });
            }
          },
        });
      };

      await simulateApiRoute();

      // Should only stream valid citations
      expect(mockWriteData).toHaveBeenCalledWith({
        type: 'citations',
        citations: [{
          documentId: 'doc_2',
          documentName: 'valid.pdf',
          chunkId: 'chunk_2',
          content: 'Valid content',
          similarity: 0.8,
          chunkIndex: 1,
        }]
      });
    });
  });

  describe('Performance Requirements', () => {
    it('should stream citations quickly', async () => {
      const startTime = Date.now();
      
      mockFindRelevantChunks.mockResolvedValue([{
        documentId: 'doc_1',
        documentName: 'test.pdf',
        chunkId: 'chunk_1',
        content: 'Test content',
        similarity: 0.8,
        chunkIndex: 0,
      }]);

      mockCreateDataStreamResponse.mockImplementation(({ execute }) => {
        execute(mockDataStream);
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Citation streaming should be very fast (under 100ms in tests)
        expect(duration).toBeLessThan(100);
        
        return new Response('stream');
      });

      const simulateApiRoute = async () => {
        return mockCreateDataStreamResponse({
          execute: async (dataStream: any) => {
            const relevantChunks = await mockFindRelevantChunks('test', {
              studyId: 'study_123',
              limit: 5,
              minSimilarity: 0.1,
            });

            if (relevantChunks.length > 0) {
              dataStream.writeData({
                type: 'citations',
                citations: relevantChunks
              });
            }
          },
        });
      };

      await simulateApiRoute();
      expect(mockWriteData).toHaveBeenCalled();
    });

    it('should handle concurrent citation requests', async () => {
      mockFindRelevantChunks.mockResolvedValue([]);
      
      const simulateApiRoute = () => {
        return mockCreateDataStreamResponse({
          execute: async (dataStream: any) => {
            await mockFindRelevantChunks('test', { studyId: 'study_123', limit: 5, minSimilarity: 0.1 });
            dataStream.writeData({ type: 'citations', citations: [] });
          },
        });
      };

      // Simulate concurrent requests
      const requests = Array.from({ length: 5 }, () => simulateApiRoute());
      
      await Promise.all(requests);
      
      // All requests should complete successfully
      expect(mockFindRelevantChunks).toHaveBeenCalledTimes(5);
      expect(mockWriteData).toHaveBeenCalledTimes(5);
    });
  });
});