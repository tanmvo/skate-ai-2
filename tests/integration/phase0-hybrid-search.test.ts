import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock auth to prevent Next.js/Auth.js module resolution issues in tests
vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('test-user-123'),
  requireAuth: vi.fn().mockResolvedValue('test-user-123')
}));

import {
  validateSearchParameters,
  formatSearchToolResults,
  searchToolDefinitions
} from '@/lib/llm-tools/search-tools';
import { getCacheStats, clearAllCache, metadataCache } from '@/lib/metadata-cache';
import { formatDocumentList, extractDocumentReferences, shouldUseSpecificDocuments } from '@/lib/metadata-context';
import { formatStudyOverview, estimateTokenCount, truncateContext } from '@/lib/metadata-formatter';
import type { StudyMetadata, DocumentReference } from '@/lib/types/metadata';

describe('Phase 0: Hybrid Search Foundation', () => {
  beforeEach(() => {
    clearAllCache();
  });

  describe('Metadata Formatting', () => {
    it('should format study overview within token limits', () => {
      const mockStudy: StudyMetadata = {
        id: 'study_123',
        name: 'Test Research Study',
        createdAt: new Date('2025-01-15T10:00:00Z'),
        updatedAt: new Date('2025-01-15T10:00:00Z'),
        documentCount: 5,
        messageCount: 12,
        documents: [],
        totalChunks: 150,
        chunksWithEmbeddings: 145,
      };

      const overview = formatStudyOverview(mockStudy, 100);
      
      expect(overview).toBeTruthy();
      expect(typeof overview).toBe('string');
      expect(overview).toContain('Test Research Study');
      expect(overview).toContain('5');
      expect(overview).toContain('145');
      
      const estimatedTokens = estimateTokenCount(overview);
      expect(estimatedTokens).toBeLessThanOrEqual(100);
    });

    it('should format document list with token management', () => {
      const mockDocuments: DocumentReference[] = [
        { id: 'doc1', name: 'Research Paper 1.pdf', chunkCount: 25 },
        { id: 'doc2', name: 'Interview Transcript.docx', chunkCount: 18 },
        { id: 'doc3', name: 'Survey Results.txt', chunkCount: 12 },
      ];

      const formatted = formatDocumentList(mockDocuments, 150);
      
      expect(formatted).toBeTruthy();
      expect(formatted).toContain('Research Paper 1.pdf');
      expect(formatted).toContain('25 chunks');
      
      const estimatedTokens = estimateTokenCount(formatted);
      expect(estimatedTokens).toBeLessThanOrEqual(150);
    });

    it('should truncate context when exceeding token limits', () => {
      const longText = 'A'.repeat(1000); // 1000 characters
      const maxTokens = 50; // ~200 characters
      
      const truncated = truncateContext(longText, maxTokens);
      
      expect(truncated.length).toBeLessThan(longText.length);
      expect(truncated).toContain('[Context truncated due to length...]');
      
      const estimatedTokens = estimateTokenCount(truncated);
      expect(estimatedTokens).toBeLessThanOrEqual(maxTokens);
    });

    it('should estimate token counts reasonably', () => {
      const text1 = 'Hello world'; // 11 characters, ~3 tokens
      const text2 = 'A'.repeat(400); // 400 characters, ~100 tokens

      const tokens1 = estimateTokenCount(text1);
      const tokens2 = estimateTokenCount(text2);

      expect(tokens1).toBeGreaterThan(1);
      expect(tokens1).toBeLessThan(10);
      expect(tokens2).toBeGreaterThan(80);
      expect(tokens2).toBeLessThan(120);
    });
  });

  describe('Caching Infrastructure', () => {
    it('should track cache statistics', () => {
      const testKey = 'test_key';
      const testData = { value: 'test_data' };
      
      const initialStats = getCacheStats();
      expect(initialStats.size).toBe(0);
      expect(initialStats.hits).toBe(0);
      expect(initialStats.misses).toBe(0);
      
      // Cache miss
      const missed = metadataCache.get(testKey);
      expect(missed).toBeNull();
      
      // Cache set
      metadataCache.set(testKey, testData);
      
      // Cache hit
      const hit = metadataCache.get(testKey);
      expect(hit).toEqual(testData);
      
      const finalStats = getCacheStats();
      expect(finalStats.size).toBe(1);
      expect(finalStats.hits).toBe(1);
      expect(finalStats.misses).toBe(1);
    });

    it('should handle TTL expiration', async () => {
      const testKey = 'ttl_test';
      const testData = { value: 'expires_soon' };
      const shortTTL = 50; // 50ms
      
      metadataCache.set(testKey, testData, shortTTL);
      
      // Should be available immediately
      expect(metadataCache.get(testKey)).toEqual(testData);
      
      // Should expire after TTL
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(metadataCache.get(testKey)).toBeNull();
    });

    it('should clear cache when requested', () => {
      metadataCache.set('key1', 'value1');
      metadataCache.set('key2', 'value2');
      
      expect(getCacheStats().size).toBe(2);
      
      clearAllCache();
      
      expect(getCacheStats().size).toBe(0);
      expect(metadataCache.get('key1')).toBeNull();
      expect(metadataCache.get('key2')).toBeNull();
    });
  });

  describe('Search Tools Validation', () => {
    it('should validate search parameters correctly', () => {
      // Valid parameters
      const validParams = {
        query: 'test search',
        limit: 5,
        minSimilarity: 0.3
      };
      
      const validErrors = validateSearchParameters('search_all_documents', validParams);
      expect(validErrors).toHaveLength(0);
      
      // Invalid parameters
      const invalidParams = {
        query: '', // Empty query
        limit: 15, // Too high
        minSimilarity: 1.5 // Out of range
      };
      
      const invalidErrors = validateSearchParameters('search_all_documents', invalidParams);
      expect(invalidErrors.length).toBeGreaterThan(0);
      expect(invalidErrors.some(error => error.includes('Query'))).toBe(true);
      expect(invalidErrors.some(error => error.includes('Limit'))).toBe(true);
      expect(invalidErrors.some(error => error.includes('MinSimilarity'))).toBe(true);
    });

    it('should validate specific document search parameters', () => {
      const paramsWithoutDocs = {
        query: 'test',
        // Missing documentIds
      };
      
      const errors = validateSearchParameters('search_specific_documents', paramsWithoutDocs);
      expect(errors.some(error => error.includes('DocumentIds'))).toBe(true);
      
      const paramsWithEmptyDocs = {
        query: 'test',
        documentIds: []
      };
      
      const emptyErrors = validateSearchParameters('search_specific_documents', paramsWithEmptyDocs);
      expect(emptyErrors.some(error => error.includes('At least one document'))).toBe(true);
    });

    it('should format search results correctly', () => {
      const mockResults = [
        {
          documentId: 'doc1',
          documentName: 'Document 1.pdf',
          content: 'This is the first test result with relevant content.',
          similarity: 0.85,
          chunkId: 'chunk1',
          chunkIndex: 0
        },
        {
          documentId: 'doc2', 
          documentName: 'Document 2.docx',
          content: 'This is the second test result with different content.',
          similarity: 0.72,
          chunkId: 'chunk2',
          chunkIndex: 1
        }
      ];
      
      const documentNames = {
        'doc1': 'Document 1.pdf',
        'doc2': 'Document 2.docx'
      };
      
      const formatted = formatSearchToolResults({
        results: mockResults,
        totalFound: 2,
        searchScope: 'all',
        documentNames,
        toolUsed: 'search_all_documents'
      });
      
      expect(formatted).toBeTruthy();
      expect(formatted).toContain('Found 2 relevant passages');
      expect(formatted).toContain('Document 1.pdf');
      expect(formatted).toContain('85% relevance');
      expect(formatted).toContain('first test result');
    });

    it('should handle empty search results', () => {
      const emptyResult = formatSearchToolResults({
        results: [],
        totalFound: 0,
        searchScope: 'all',
        documentNames: {},
        toolUsed: 'search_all_documents'
      });
      
      expect(emptyResult).toContain('No relevant content found');
      expect(emptyResult).toContain('all documents');
    });

    it('should define tool schemas correctly', () => {
      expect(searchToolDefinitions.search_all_documents).toBeDefined();
      expect(searchToolDefinitions.search_specific_documents).toBeDefined();
      
      const allDocsSchema = searchToolDefinitions.search_all_documents;
      expect(allDocsSchema.description).toContain('Search across all documents');
      expect(allDocsSchema.parameters.required).toContain('query');
      expect(allDocsSchema.parameters.properties.query).toBeDefined();
      
      const specificDocsSchema = searchToolDefinitions.search_specific_documents;
      expect(specificDocsSchema.description).toContain('Search within specific documents');
      expect(specificDocsSchema.parameters.required).toContain('query');
      expect(specificDocsSchema.parameters.required).toContain('documentIds');
    });
  });

  describe('Context Analysis Logic', () => {
    it('should extract document references from queries', () => {
      const mockDocuments: DocumentReference[] = [
        { id: 'doc1', name: 'Research Paper.pdf', chunkCount: 25 },
        { id: 'doc2', name: 'Interview Transcript.docx', chunkCount: 18 },
      ];
      
      // Query with document reference
      const query1 = 'What does the Research Paper.pdf say about methodology?';
      const refs1 = extractDocumentReferences(query1, mockDocuments);
      expect(refs1).toContain('doc1');
      
      // Query without document reference
      const query2 = 'What are the main themes?';
      const refs2 = extractDocumentReferences(query2, mockDocuments);
      expect(refs2).toHaveLength(0);
      
      // Query with quoted document name
      const query3 = 'Find quotes from "Interview Transcript.docx"';
      const refs3 = extractDocumentReferences(query3, mockDocuments);
      expect(refs3).toContain('doc2');
    });

    it('should determine when to use specific document search', () => {
      const mockDocuments: DocumentReference[] = [
        { id: 'doc1', name: 'Research Paper.pdf', chunkCount: 25 },
      ];
      
      // Queries that should use specific search
      const specificQueries = [
        'What does Research Paper.pdf say?',
        'Find information in document Research Paper.pdf',
        'From file Research Paper.pdf, extract themes',
        'In this document, what are the conclusions?'
      ];
      
      specificQueries.forEach(query => {
        const shouldUseSpecific = shouldUseSpecificDocuments(query, mockDocuments);
        expect(shouldUseSpecific).toBe(true);
      });
      
      // Queries that should use general search
      const generalQueries = [
        'What are the main themes?',
        'Find all mentions of methodology',
        'Compare findings across all studies'
      ];
      
      generalQueries.forEach(query => {
        const shouldUseSpecific = shouldUseSpecificDocuments(query, mockDocuments);
        expect(shouldUseSpecific).toBe(false);
      });
    });

    it('should handle empty document lists in context analysis', () => {
      const emptyDocs: DocumentReference[] = [];
      
      const refs = extractDocumentReferences('Find info in Document.pdf', emptyDocs);
      expect(refs).toHaveLength(0);
      
      // Query with specific indicator should still return true even with empty docs
      const shouldUseSpecific1 = shouldUseSpecificDocuments('Search in Document.pdf', emptyDocs);
      expect(shouldUseSpecific1).toBe(true); // Contains "in" indicator
      
      // Query without specific indicators should return false with empty docs
      const shouldUseSpecific2 = shouldUseSpecificDocuments('Find all themes', emptyDocs);
      expect(shouldUseSpecific2).toBe(false);
      
      const formatted = formatDocumentList(emptyDocs);
      expect(formatted).toBe('No documents available');
    });
  });

});