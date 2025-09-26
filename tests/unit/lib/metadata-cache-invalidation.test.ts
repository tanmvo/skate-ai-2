import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock auth to prevent Next.js/Auth.js module resolution issues in tests
vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('test-user-123')
}));

// Mock cache functions
vi.mock('@/lib/metadata-cache', () => ({
  invalidateStudyCache: vi.fn(),
  getCachedData: vi.fn(),
  studyMetadataKey: vi.fn(),
}));

// Mock analytics
vi.mock('@/lib/analytics/server-analytics', () => ({
  trackCacheEvent: vi.fn(),
}));

import { invalidateStudyMetadataOnDocumentChange } from '@/lib/metadata-collector';
import { invalidateStudyCache } from '@/lib/metadata-cache';
import { trackCacheEvent } from '@/lib/analytics/server-analytics';

/**
 * Cache Invalidation Tests - Testing retry mechanisms and analytics integration
 */

describe('metadata-cache-invalidation', () => {
  const mockStudyId = 'test-study-123';

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset timers for each test
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('invalidateStudyMetadataOnDocumentChange', () => {
    it('should successfully invalidate cache on first attempt', async () => {
      const mockInvalidateStudyCache = vi.mocked(invalidateStudyCache);
      const mockTrackCacheEvent = vi.mocked(trackCacheEvent);

      mockInvalidateStudyCache.mockReturnValue(2); // 2 entries removed

      await invalidateStudyMetadataOnDocumentChange(mockStudyId);

      expect(mockInvalidateStudyCache).toHaveBeenCalledWith(mockStudyId);
      expect(mockInvalidateStudyCache).toHaveBeenCalledTimes(1);

      expect(mockTrackCacheEvent).toHaveBeenCalledWith(
        'cache_invalidation_success',
        { studyId: mockStudyId, attempt: 1, removed: 2 }
      );
    });

    it('should retry on cache invalidation failure and succeed on second attempt', async () => {
      const mockInvalidateStudyCache = vi.mocked(invalidateStudyCache);
      const mockTrackCacheEvent = vi.mocked(trackCacheEvent);

      // First attempt fails, second succeeds
      mockInvalidateStudyCache
        .mockImplementationOnce(() => { throw new Error('Cache error'); })
        .mockReturnValueOnce(3);

      const promise = invalidateStudyMetadataOnDocumentChange(mockStudyId);

      // Fast-forward through the exponential backoff delay (100ms)
      await vi.advanceTimersByTimeAsync(100);
      await promise;

      expect(mockInvalidateStudyCache).toHaveBeenCalledTimes(2);
      expect(mockTrackCacheEvent).toHaveBeenCalledWith(
        'cache_invalidation_success',
        { studyId: mockStudyId, attempt: 2, removed: 3 }
      );
    });

    it('should retry with exponential backoff', async () => {
      const mockInvalidateStudyCache = vi.mocked(invalidateStudyCache);
      const mockTrackCacheEvent = vi.mocked(trackCacheEvent);

      // First two attempts fail, third succeeds
      mockInvalidateStudyCache
        .mockImplementationOnce(() => { throw new Error('Cache error 1'); })
        .mockImplementationOnce(() => { throw new Error('Cache error 2'); })
        .mockReturnValueOnce(1);

      const promise = invalidateStudyMetadataOnDocumentChange(mockStudyId);

      // First retry after 100ms
      await vi.advanceTimersByTimeAsync(100);
      // Second retry after 200ms
      await vi.advanceTimersByTimeAsync(200);
      await promise;

      expect(mockInvalidateStudyCache).toHaveBeenCalledTimes(3);
      expect(mockTrackCacheEvent).toHaveBeenCalledWith(
        'cache_invalidation_success',
        { studyId: mockStudyId, attempt: 3, removed: 1 }
      );
    });


    it('should handle analytics tracking failures gracefully', async () => {
      const mockInvalidateStudyCache = vi.mocked(invalidateStudyCache);
      const mockTrackCacheEvent = vi.mocked(trackCacheEvent);

      mockInvalidateStudyCache.mockReturnValue(1);
      mockTrackCacheEvent.mockRejectedValue(new Error('Analytics error'));

      // Should still succeed even if analytics fails
      await expect(invalidateStudyMetadataOnDocumentChange(mockStudyId)).resolves.toBeUndefined();

      expect(mockInvalidateStudyCache).toHaveBeenCalledWith(mockStudyId);
      expect(mockTrackCacheEvent).toHaveBeenCalledWith(
        'cache_invalidation_success',
        { studyId: mockStudyId, attempt: 1, removed: 1 }
      );
    });

    it('should use correct exponential backoff timing', async () => {
      const mockInvalidateStudyCache = vi.mocked(invalidateStudyCache);

      mockInvalidateStudyCache
        .mockImplementationOnce(() => { throw new Error('Error 1'); })
        .mockImplementationOnce(() => { throw new Error('Error 2'); })
        .mockReturnValueOnce(1);

      const startTime = Date.now();
      const promise = invalidateStudyMetadataOnDocumentChange(mockStudyId);

      // Check that delays are correct
      await vi.advanceTimersByTimeAsync(99); // Just before first retry
      expect(mockInvalidateStudyCache).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(1); // Exactly at first retry (100ms)
      expect(mockInvalidateStudyCache).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(199); // Just before second retry
      expect(mockInvalidateStudyCache).toHaveBeenCalledTimes(2);

      await vi.advanceTimersByTimeAsync(1); // Exactly at second retry (200ms)
      await promise;
      expect(mockInvalidateStudyCache).toHaveBeenCalledTimes(3);
    });

    it('should handle empty study ID', async () => {
      const mockInvalidateStudyCache = vi.mocked(invalidateStudyCache);
      const mockTrackCacheEvent = vi.mocked(trackCacheEvent);

      mockInvalidateStudyCache.mockReturnValue(0);

      await invalidateStudyMetadataOnDocumentChange('');

      expect(mockInvalidateStudyCache).toHaveBeenCalledWith('');
      expect(mockTrackCacheEvent).toHaveBeenCalledWith(
        'cache_invalidation_success',
        { studyId: '', attempt: 1, removed: 0 }
      );
    });

    it('should handle concurrent invalidation requests', async () => {
      const mockInvalidateStudyCache = vi.mocked(invalidateStudyCache);
      const mockTrackCacheEvent = vi.mocked(trackCacheEvent);

      mockInvalidateStudyCache.mockReturnValue(1);

      // Start multiple concurrent invalidations
      const promises = [
        invalidateStudyMetadataOnDocumentChange(mockStudyId),
        invalidateStudyMetadataOnDocumentChange(mockStudyId),
        invalidateStudyMetadataOnDocumentChange(mockStudyId)
      ];

      await Promise.all(promises);

      expect(mockInvalidateStudyCache).toHaveBeenCalledTimes(3);
      expect(mockTrackCacheEvent).toHaveBeenCalledTimes(3);
    });

    it('should handle very large removed count', async () => {
      const mockInvalidateStudyCache = vi.mocked(invalidateStudyCache);
      const mockTrackCacheEvent = vi.mocked(trackCacheEvent);

      const largeCount = 999999;
      mockInvalidateStudyCache.mockReturnValue(largeCount);

      await invalidateStudyMetadataOnDocumentChange(mockStudyId);

      expect(mockTrackCacheEvent).toHaveBeenCalledWith(
        'cache_invalidation_success',
        { studyId: mockStudyId, attempt: 1, removed: largeCount }
      );
    });
  });

  describe('retry mechanism edge cases', () => {
    it('should handle timer interruption gracefully', async () => {
      const mockInvalidateStudyCache = vi.mocked(invalidateStudyCache);

      mockInvalidateStudyCache
        .mockImplementationOnce(() => { throw new Error('Timer test'); })
        .mockReturnValueOnce(1);

      const promise = invalidateStudyMetadataOnDocumentChange(mockStudyId);

      // Simulate timer interruption by advancing time in chunks
      await vi.advanceTimersByTimeAsync(50);
      await vi.advanceTimersByTimeAsync(50);
      await promise;

      expect(mockInvalidateStudyCache).toHaveBeenCalledTimes(2);
    });

    it('should handle system clock changes during retry', async () => {
      const mockInvalidateStudyCache = vi.mocked(invalidateStudyCache);

      mockInvalidateStudyCache
        .mockImplementationOnce(() => { throw new Error('Clock test'); })
        .mockReturnValueOnce(1);

      const promise = invalidateStudyMetadataOnDocumentChange(mockStudyId);

      // Simulate system time jump
      vi.setSystemTime(new Date(Date.now() + 10000)); // Jump 10 seconds
      await vi.advanceTimersByTimeAsync(100);
      await promise;

      expect(mockInvalidateStudyCache).toHaveBeenCalledTimes(2);
    });
  });

  describe('analytics integration', () => {
    it('should track attempts with correct parameters', async () => {
      const mockInvalidateStudyCache = vi.mocked(invalidateStudyCache);
      const mockTrackCacheEvent = vi.mocked(trackCacheEvent);

      mockInvalidateStudyCache.mockReturnValue(5);

      await invalidateStudyMetadataOnDocumentChange(mockStudyId);

      expect(mockTrackCacheEvent).toHaveBeenCalledWith(
        'cache_invalidation_success',
        expect.objectContaining({
          studyId: mockStudyId,
          attempt: 1,
          removed: 5
        })
      );
    });

  });
});