import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { StudyCard } from '../../../components/study/StudyCard';
import { renderWithProviders, mockRouter } from '../../test-utils';

const mockStudy = {
  id: 'study_test_123',
  name: 'Test Research Study',
  createdAt: new Date('2025-01-15T10:00:00Z'),
  author: 'You',
  documentCount: 3,
};

describe('StudyCard', () => {
  const mockOnDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders study information correctly', () => {
    renderWithProviders(
      <StudyCard study={mockStudy} onDelete={mockOnDelete} />
    );

    expect(screen.getByText('Test Research Study')).toBeDefined();
    expect(screen.getByText('by: You')).toBeDefined();
    expect(screen.getByText('3 documents')).toBeDefined();
    expect(screen.getByText(/Created/)).toBeDefined();
  });

  it('handles singular document count correctly', () => {
    const studyWithOneDoc = { ...mockStudy, documentCount: 1 };
    renderWithProviders(
      <StudyCard study={studyWithOneDoc} onDelete={mockOnDelete} />
    );

    expect(screen.getByText('1 document')).toBeDefined();
  });

  it('navigates to study page when card is clicked', () => {
    renderWithProviders(
      <StudyCard study={mockStudy} onDelete={mockOnDelete} />
    );

    // Click on the study title (which has the onClick handler)
    const studyTitle = screen.getByText('Test Research Study');
    fireEvent.click(studyTitle);

    expect(mockRouter.push).toHaveBeenCalledWith('/study/study_test_123');
  });

  it('renders dropdown menu trigger button', () => {
    renderWithProviders(
      <StudyCard study={mockStudy} onDelete={mockOnDelete} />
    );

    // Should have the dropdown menu trigger button (three dots)
    const moreButton = screen.getByRole('button');
    expect(moreButton).toBeDefined();
    expect(moreButton).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('can trigger dropdown menu', () => {
    renderWithProviders(
      <StudyCard study={mockStudy} onDelete={mockOnDelete} />
    );

    // Test that dropdown trigger can be clicked without error
    const moreButton = screen.getByRole('button');
    fireEvent.click(moreButton);

    // Should remain functional (test passes if no error)
    expect(moreButton).toBeDefined();
  });

  it('handles dropdown interactions without errors', () => {
    renderWithProviders(
      <StudyCard study={mockStudy} onDelete={mockOnDelete} />
    );

    // Test that interactions work without errors
    const moreButton = screen.getByRole('button');
    fireEvent.click(moreButton);

    // Should not have called onDelete just from opening menu
    expect(mockOnDelete).not.toHaveBeenCalled();
  });

  it('prevents card click navigation when dropdown menu is clicked', () => {
    renderWithProviders(
      <StudyCard study={mockStudy} onDelete={mockOnDelete} />
    );

    // Click the more options button (should not trigger navigation)
    const moreButton = screen.getByRole('button');
    fireEvent.click(moreButton);

    expect(mockRouter.push).not.toHaveBeenCalled();
  });

  it('formats relative date correctly', () => {
    const yesterdayStudy = {
      ...mockStudy,
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
    };

    renderWithProviders(
      <StudyCard study={yesterdayStudy} onDelete={mockOnDelete} />
    );

    expect(screen.getByText(/Created yesterday/)).toBeDefined();
  });
});