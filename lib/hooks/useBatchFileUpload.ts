/**
 * React hook for handling batch file uploads with real-time progress tracking
 */

import { useState, useCallback, useRef, useEffect } from "react";
import useSWR, { useSWRConfig } from "swr";

interface BatchStatusApiResponse {
  batchId: string;
  status: 'validating' | 'processing' | 'completed' | 'failed' | 'cancelled';
  files: {
    [fileName: string]: {
      id?: string;
      status: 'queued' | 'validating' | 'processing' | 'completed' | 'failed';
      progress: number;
      error?: string;
      url?: string;
    };
  };
  summary: {
    total: number;
    completed: number;
    failed: number;
    processing: number;
  };
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, unknown>;
}

export interface BatchFileStatus {
  fileName: string;
  id?: string;
  status: 'queued' | 'validating' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  error?: string;
  url?: string;
}

export interface BatchUploadSummary {
  total: number;
  completed: number;
  failed: number;
  processing: number;
}

export interface BatchUploadState {
  batchId: string | null;
  status: 'idle' | 'uploading' | 'validating' | 'processing' | 'completed' | 'failed';
  files: Map<string, BatchFileStatus>;
  summary: BatchUploadSummary;
  error?: string;
}

export interface UploadedBatchFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: string;
  uploadedAt: string;
  url: string;
}

export interface UseBatchFileUploadReturn {
  batchState: BatchUploadState;
  uploadBatch: (files: File[], studyId: string) => Promise<UploadedBatchFile[]>;
  cancelBatch: () => void;
  retryBatch: () => Promise<void>;
  clearBatch: () => void;
  isUploading: boolean;
}

const INITIAL_BATCH_STATE: BatchUploadState = {
  batchId: null,
  status: 'idle',
  files: new Map(),
  summary: { total: 0, completed: 0, failed: 0, processing: 0 },
};

export function useBatchFileUpload(): UseBatchFileUploadReturn {
  const [batchState, setBatchState] = useState<BatchUploadState>(INITIAL_BATCH_STATE);
  const [isPolling, setIsPolling] = useState(false);
  const originalFilesRef = useRef<File[]>([]);
  const studyIdRef = useRef<string>('');
  const { mutate: globalMutate } = useSWRConfig();

  // SWR for batch status polling
  const shouldFetch = batchState.batchId && isPolling &&
    (batchState.status === 'validating' || batchState.status === 'processing');

  const { data: batchStatusData, error: batchStatusError, mutate: mutateBatchStatus } = useSWR(
    shouldFetch ? `/api/upload/batch/${batchState.batchId}/status` : null,
    async (url: string) => {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    },
    {
      refreshInterval: shouldFetch ? 2000 : 0, // Poll every 2 seconds
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 1000,
    }
  );

  // Update batch state from polling data
  useEffect(() => {
    if (batchStatusData && batchState.batchId) {
      const newFiles = new Map<string, BatchFileStatus>();

      Object.entries(batchStatusData.files).forEach(([fileName, fileData]) => {
        const typedFileData = fileData as BatchStatusApiResponse['files'][string];
        newFiles.set(fileName, {
          fileName,
          id: typedFileData.id,
          status: typedFileData.status,
          progress: typedFileData.progress,
          error: typedFileData.error,
          url: typedFileData.url,
        });
      });

      setBatchState(prev => ({
        ...prev,
        status: batchStatusData.status,
        files: newFiles,
        summary: batchStatusData.summary,
      }));

      // Stop polling if batch is complete or failed
      if (batchStatusData.status === 'completed' || batchStatusData.status === 'failed') {
        setIsPolling(false);
      }
    }
  }, [batchStatusData, batchState.batchId]);

  // Handle polling errors
  useEffect(() => {
    if (batchStatusError && isPolling) {
      console.error('Batch status polling error:', batchStatusError);
      setBatchState(prev => ({
        ...prev,
        error: 'Failed to get upload progress. Please refresh the page.',
      }));
    }
  }, [batchStatusError, isPolling]);

  const uploadBatch = useCallback(async (files: File[], studyId: string): Promise<UploadedBatchFile[]> => {
    if (files.length === 0) {
      throw new Error('No files provided');
    }

    // Store original files for retry
    originalFilesRef.current = files;
    studyIdRef.current = studyId;

    // Initialize batch state
    const initialFiles = new Map<string, BatchFileStatus>();
    files.forEach(file => {
      initialFiles.set(file.name, {
        fileName: file.name,
        status: 'queued',
        progress: 0,
      });
    });

    setBatchState({
      batchId: null,
      status: 'uploading',
      files: initialFiles,
      summary: { total: files.length, completed: 0, failed: 0, processing: files.length },
    });

    try {
      // Create FormData for batch upload
      const formData = new FormData();
      files.forEach(file => {
        formData.append("files", file);
      });
      formData.append("studyId", studyId);

      // Upload batch
      const response = await fetch("/api/upload/batch", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const batchData = await response.json();

      // Update state with batch ID and start polling
      setBatchState(prev => ({
        ...prev,
        batchId: batchData.batchId,
        status: 'validating',
      }));

      setIsPolling(true);

      // Wait for completion by polling
      return new Promise((resolve, reject) => {
        const checkCompletion = () => {
          mutateBatchStatus().then((latestData: BatchStatusApiResponse | undefined) => {
            if (!latestData) return;

            if (latestData.status === 'completed') {
              const completedFiles: UploadedBatchFile[] = Object.entries(latestData.files)
                .filter(([, fileData]) => fileData.status === 'completed' && fileData.id)
                .map(([fileName, fileData]) => {
                  const typedFileData = fileData as BatchStatusApiResponse['files'][string];
                  return {
                  id: typedFileData.id!,
                  fileName,
                  fileType: files.find(f => f.name === fileName)?.type || '',
                  fileSize: files.find(f => f.name === fileName)?.size || 0,
                  status: 'READY',
                  uploadedAt: new Date().toISOString(),
                  url: typedFileData.url || '',
                  };
                });

              // Revalidate all SWR caches for this study
              globalMutate(`/api/studies/${studyId}`);
              globalMutate(`/api/studies/${studyId}/documents`);

              resolve(completedFiles);
            } else if (latestData.status === 'failed') {
              reject(new Error('Batch upload failed'));
            } else {
              // Continue polling
              setTimeout(checkCompletion, 2000);
            }
          }).catch(reject);
        };

        // Start checking after initial delay
        setTimeout(checkCompletion, 2000);
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Batch upload failed";

      setBatchState(prev => ({
        ...prev,
        status: 'failed',
        error: errorMessage,
      }));

      throw error;
    }
  }, [mutateBatchStatus]);

  const cancelBatch = useCallback(() => {
    if (batchState.batchId) {
      setIsPolling(false);
      setBatchState(prev => ({
        ...prev,
        status: 'failed',
        error: 'Upload cancelled by user',
      }));
    }
  }, [batchState.batchId]);

  const retryBatch = useCallback(async (): Promise<void> => {
    if (originalFilesRef.current.length > 0 && studyIdRef.current) {
      await uploadBatch(originalFilesRef.current, studyIdRef.current);
    }
  }, [uploadBatch]);

  const clearBatch = useCallback(() => {
    setIsPolling(false);
    setBatchState(INITIAL_BATCH_STATE);
    originalFilesRef.current = [];
    studyIdRef.current = '';
  }, []);

  const isUploading = batchState.status === 'uploading' ||
                    batchState.status === 'validating' ||
                    batchState.status === 'processing';

  return {
    batchState,
    uploadBatch,
    cancelBatch,
    retryBatch,
    clearBatch,
    isUploading,
  };
}