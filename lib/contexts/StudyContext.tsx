"use client";

import React, { createContext, useContext, ReactNode } from 'react';
import { useStudy, StudyWithDetails } from '../hooks/useStudy';

interface StudyContextValue {
  study: StudyWithDetails | undefined;
  isLoading: boolean;
  error: Error | null;
  updateStudy: (name: string) => Promise<StudyWithDetails | undefined>;
  refreshStudy: () => Promise<StudyWithDetails | undefined>;
}

const StudyContext = createContext<StudyContextValue | undefined>(undefined);

interface StudyProviderProps {
  children: ReactNode;
  studyId: string;
}

export function StudyProvider({ children, studyId }: StudyProviderProps) {
  const { study, isLoading, error, updateStudy, refreshStudy } = useStudy(studyId);

  const value: StudyContextValue = {
    study,
    isLoading,
    error,
    updateStudy,
    refreshStudy,
  };

  return (
    <StudyContext.Provider value={value}>
      {children}
    </StudyContext.Provider>
  );
}

export function useStudyContext() {
  const context = useContext(StudyContext);
  if (context === undefined) {
    throw new Error('useStudyContext must be used within a StudyProvider');
  }
  return context;
}

export { StudyContext };