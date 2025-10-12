import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useCitations } from '@/lib/hooks/useCitations';
import { CitationMap } from '@/lib/types/citations';

// Mock fetch globally
global.fetch = vi.fn();

describe('useCitations', () => {
  const mockMessageId = 'msg_123';
  const mockCitations: CitationMap = {
    '1': { documentId: 'doc_1', documentName: 'Document1.pdf' },
    '2': { documentId: 'doc_2', documentName: 'Document2.pdf' },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should fetch citations successfully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockCitations,
    });

    const { result } = renderHook(() => useCitations(mockMessageId));

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.citations).toBeNull();
    expect(result.current.error).toBeNull();

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Verify citations are loaded
    expect(result.current.citations).toEqual(mockCitations);
    expect(result.current.error).toBeNull();
    expect(global.fetch).toHaveBeenCalledWith(`/api/citations/${mockMessageId}`);
  });

  it('should return null for empty citations', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => ({
      ok: true,
      json: async () => ({}),
    } as Response));

    const { result } = renderHook(() => useCitations('msg_empty'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Empty citations should normalize to null
    expect(result.current.citations).toBeNull();
    expect(result.current.error).toBeNull();
  });

  it('should handle 404 errors gracefully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => ({
      ok: false,
      status: 404,
      statusText: 'Not Found',
    } as Response));

    const { result } = renderHook(() => useCitations('msg_404'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // 404 should return empty citations (handled by fetcher)
    expect(result.current.citations).toBeNull();
  });

  it('should handle network errors', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => ({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response));

    const { result } = renderHook(() => useCitations('msg_error'));

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    }, { timeout: 3000 });

    expect(result.current.citations).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should not fetch when messageId is empty', () => {
    const { result } = renderHook(() => useCitations(''));

    // Should not initiate fetch with empty messageId
    expect(result.current.isLoading).toBe(false);
    expect(result.current.citations).toBeNull();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should provide mutate function', async () => {
    let callCount = 0;
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => mockCitations,
      } as Response;
    });

    const { result } = renderHook(() => useCitations('msg_mutate'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.mutate).toBeDefined();
    expect(typeof result.current.mutate).toBe('function');

    const initialCallCount = callCount;

    // Call mutate to trigger refetch
    await result.current.mutate();

    // Verify fetch was called again
    expect(callCount).toBeGreaterThan(initialCallCount);
  });

  it('should dedupe requests within deduping interval', async () => {
    let callCount = 0;
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      callCount++;
      return {
        ok: true,
        json: async () => mockCitations,
      } as Response;
    });

    const dedupeId = 'msg_dedupe';

    // Render multiple hooks with same messageId simultaneously
    const { result: result1 } = renderHook(() => useCitations(dedupeId));
    const { result: result2 } = renderHook(() => useCitations(dedupeId));

    await waitFor(() => {
      expect(result1.current.isLoading).toBe(false);
      expect(result2.current.isLoading).toBe(false);
    });

    // SWR should dedupe and only make one request
    expect(callCount).toBe(1);
    expect(result1.current.citations).toEqual(result2.current.citations);
  });

  it('should normalize citations data correctly', async () => {
    const citationsWithSingleEntry: CitationMap = {
      '1': { documentId: 'doc_1', documentName: 'Document1.pdf' },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => ({
      ok: true,
      json: async () => citationsWithSingleEntry,
    } as Response));

    const { result } = renderHook(() => useCitations('msg_normalize'));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should return citations with single entry
    expect(result.current.citations).toEqual(citationsWithSingleEntry);
    expect(Object.keys(result.current.citations!).length).toBe(1);
  });
});
