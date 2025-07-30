import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { SWRConfig } from 'swr';
import { useStudies } from '../../../lib/hooks/useStudies';
import { mockStudies, mockStudy } from '../../test-utils';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

// Test wrapper with SWR
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <SWRConfig value={{ provider: () => new Map(), dedupingInterval: 0 }}>
    {children}
  </SWRConfig>
);

describe('useStudies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('fetches studies successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStudies,
    });

    const { result } = renderHook(() => useStudies(), { wrapper: TestWrapper });

    // Initially loading
    expect(result.current.isLoading).toBe(true);
    expect(result.current.studies).toEqual([]);

    // Wait for data to load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.studies).toEqual(mockStudies);
    });

    expect(mockFetch).toHaveBeenCalledWith('/api/studies');
  });

  it('handles fetch error gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useStudies(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeTruthy();
      expect(result.current.studies).toEqual([]);
    });
  });

  it('creates study successfully', async () => {
    // Mock initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    // Mock create study
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStudy,
    });

    // Mock refetch after create
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [mockStudy],
    });

    const { result } = renderHook(() => useStudies(), { wrapper: TestWrapper });

    // Wait for initial load
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Create study
    let createdStudy;
    await act(async () => {
      createdStudy = await result.current.createStudy('New Study');
    });

    expect(createdStudy).toEqual(mockStudy);
    expect(mockFetch).toHaveBeenCalledWith('/api/studies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'New Study' }),
    });

    // Should have optimistically updated
    await waitFor(() => {
      expect(result.current.studies).toContainEqual(mockStudy);
    });
  });

  it('handles create study error', async () => {
    // Mock initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    // Mock create study failure
    mockFetch.mockResolvedValueOnce({
      ok: false,
    });

    const { result } = renderHook(() => useStudies(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      try {
        await result.current.createStudy('New Study');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    // Should not have added the study
    expect(result.current.studies).toEqual([]);
  });

  it('deletes study successfully', async () => {
    // Mock initial fetch with studies
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStudies,
    });

    // Mock delete success
    mockFetch.mockResolvedValueOnce({
      ok: true,
    });

    // Mock refetch after delete
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [mockStudies[1]], // Only second study remains
    });

    const { result } = renderHook(() => useStudies(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.studies).toEqual(mockStudies);
    });

    // Delete first study
    await act(async () => {
      await result.current.deleteStudy(mockStudies[0].id);
    });

    expect(mockFetch).toHaveBeenCalledWith(`/api/studies/${mockStudies[0].id}`, {
      method: 'DELETE',
    });

    // Should have optimistically removed the study
    await waitFor(() => {
      expect(result.current.studies).toHaveLength(1);
      expect(result.current.studies[0].id).toBe(mockStudies[1].id);
    });
  });

  it('handles delete study error and reverts optimistic update', async () => {
    // Mock initial fetch
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStudies,
    });

    // Mock delete failure
    mockFetch.mockResolvedValueOnce({
      ok: false,
    });

    // Mock refetch to restore data
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStudies,
    });

    const { result } = renderHook(() => useStudies(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.studies).toEqual(mockStudies);
    });

    await act(async () => {
      try {
        await result.current.deleteStudy(mockStudies[0].id);
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    // Should have reverted the optimistic update
    await waitFor(() => {
      expect(result.current.studies).toEqual(mockStudies);
    });
  });

  it('returns empty array when no studies', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    const { result } = renderHook(() => useStudies(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.studies).toEqual([]);
    });
  });

  it('provides mutate function for manual cache updates', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStudies,
    });

    const { result } = renderHook(() => useStudies(), { wrapper: TestWrapper });

    await waitFor(() => {
      expect(result.current.studies).toEqual(mockStudies);
    });

    expect(typeof result.current.mutate).toBe('function');
  });
});