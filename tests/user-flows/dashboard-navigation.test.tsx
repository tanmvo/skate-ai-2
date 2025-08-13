import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import StudiesPage from '../../app/page';
import { renderWithProviders, mockStudies, mockRouter } from '../test-utils';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('Dashboard Navigation Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('loads dashboard with existing studies', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStudies,
    });

    renderWithProviders(<StudiesPage />);

    // Should show loading state initially
    expect(screen.getByText('My Studies')).toBeDefined();
    expect(screen.getByText('Organize your research documents')).toBeDefined();

    // Should load studies
    await waitFor(() => {
      expect(screen.getByText('Test Study')).toBeDefined();
      expect(screen.getByText('Another Study')).toBeDefined();
    });

    // Should show document counts
    expect(screen.getByText('2 documents')).toBeDefined();
    expect(screen.getByText('1 document')).toBeDefined();
  });

  it('shows empty state when no studies exist', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    renderWithProviders(<StudiesPage />);

    await waitFor(() => {
      expect(screen.getByText('No studies yet')).toBeDefined();
      expect(screen.getByText('Create your first research study to get started')).toBeDefined();
      expect(screen.getByRole('button', { name: /Create Study/i })).toBeDefined();
    });
  });

  it('creates new study and navigates to study page', async () => {
    // Mock initial empty studies
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    // Mock create study
    const newStudy = {
      id: 'study_new_123',
      name: 'New Study',
      createdAt: '2025-01-15T12:00:00Z',
      updatedAt: '2025-01-15T12:00:00Z',
      userId: 'usr_mvp_dev_2025',
      _count: { documents: 0, messages: 0 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => newStudy,
    });

    // Mock refetch after create
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [newStudy],
    });

    renderWithProviders(<StudiesPage />);

    // Wait for empty state
    await waitFor(() => {
      expect(screen.getByText('No studies yet')).toBeDefined();
    });

    // Click create button
    const createButton = screen.getByRole('button', { name: /Create Study/i });
    fireEvent.click(createButton);

    // Should show creating state
    await waitFor(() => {
      expect(screen.getByText('Creating...')).toBeDefined();
    });

    // Should navigate to new study
    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/study/study_new_123');
    });

    // Verify API call
    expect(mockFetch).toHaveBeenCalledWith('/api/studies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'New Study' }),
    });
  });

  it('navigates to study when study card is clicked', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStudies,
    });

    renderWithProviders(<StudiesPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Study')).toBeDefined();
    });

    // Click on first study card
    const studyCard = screen.getByText('Test Study').closest('.cursor-pointer');
    fireEvent.click(studyCard!);

    expect(mockRouter.push).toHaveBeenCalledWith('/study/study_test_123');
  });

  it('deletes study with confirmation', async () => {
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

    renderWithProviders(<StudiesPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Study')).toBeDefined();
    });

    // Click dropdown menu on first study
    const moreButtons = screen.getAllByRole('button');
    const dropdownButton = moreButtons.find(btn => 
      btn.querySelector('svg')?.classList.contains('lucide-more-vertical')
    );
    fireEvent.click(dropdownButton!);

    // Click delete
    const deleteMenuItem = screen.getByText('Delete study');
    fireEvent.click(deleteMenuItem);

    // Confirm deletion in dialog
    await waitFor(() => {
      expect(screen.getByText('Delete Study')).toBeDefined();
      expect(screen.getByText('"Test Study"')).toBeDefined();
    });

    const confirmButton = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(confirmButton);

    // Should call delete API
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/studies/study_test_123', {
        method: 'DELETE',
      });
    });
  });

  it('shows loading skeleton while fetching studies', () => {
    // Don't resolve the promise to keep in loading state
    mockFetch.mockImplementationOnce(() => new Promise(() => {}));

    renderWithProviders(<StudiesPage />);

    // Should show loading skeleton cards
    const skeletonCards = screen.queryAllByTestId('skeleton-card');
    // Fallback to checking for animate-pulse class
    const animatedElements = document.querySelectorAll('.animate-pulse');
    
    expect(animatedElements.length).toBeGreaterThan(0);
    expect(screen.queryByText('Test Study')).toBeNull();
  });

  it('handles create study from header button', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockStudies,
    });

    // Mock create study
    const newStudy = {
      id: 'study_header_123',
      name: 'New Study',
      createdAt: '2025-01-15T12:00:00Z',
      updatedAt: '2025-01-15T12:00:00Z',
      userId: 'usr_mvp_dev_2025',
      _count: { documents: 0, messages: 0 },
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => newStudy,
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [...mockStudies, newStudy],
    });

    renderWithProviders(<StudiesPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Study')).toBeDefined();
    });

    // Click create button in header
    const headerCreateButton = screen.getByRole('button', { name: /Create$/i });
    fireEvent.click(headerCreateButton);

    await waitFor(() => {
      expect(mockRouter.push).toHaveBeenCalledWith('/study/study_header_123');
    });
  });

  it('shows correct app branding and title', () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => [],
    });

    renderWithProviders(<StudiesPage />);

    expect(screen.getByText('Skate AI')).toBeDefined();
    expect(screen.getByText('My Studies')).toBeDefined();
  });
});