/**
 * React hook for handling file uploads with progress tracking
 */

import { useState, useCallback } from "react";

// Custom error type for validation errors
export interface ValidationError extends Error {
  isValidation: true;
  details?: string;
  suggestion?: string;
}

// Type guard to check if an error is a ValidationError
function isValidationError(error: unknown): error is ValidationError {
  return error instanceof Error && 'isValidation' in error && 'details' in error && 'suggestion' in error;
}

// Helper function to create a ValidationError
function createValidationError(message: string, details?: string, suggestion?: string): ValidationError {
  const error = new Error(message) as ValidationError;
  error.isValidation = true;
  error.details = details;
  error.suggestion = suggestion;
  return error;
}

export interface UploadProgress {
  fileName: string;
  progress: number; // 0-100
  status: "uploading" | "processing" | "completed" | "error" | "validation_error";
  error?: string;
  errorDetails?: string;
  suggestion?: string;
}

export interface UploadedFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  status: string;
  uploadedAt: string;
  url: string;
}

export interface UseFileUploadReturn {
  uploads: Map<string, UploadProgress>;
  uploadFile: (file: File, studyId: string) => Promise<UploadedFile>;
  clearUpload: (fileName: string) => void;
  clearAllUploads: () => void;
  isUploading: boolean;
}

export function useFileUpload(): UseFileUploadReturn {
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());

  const uploadFile = useCallback(async (file: File, studyId: string): Promise<UploadedFile> => {
    const fileName = file.name;
    
    // Initialize upload progress
    setUploads(prev => new Map(prev.set(fileName, {
      fileName,
      progress: 0,
      status: "uploading",
    })));

    try {
      // Create FormData for the upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("studyId", studyId);

      // Create XMLHttpRequest to track upload progress
      const uploadedFile = await new Promise<UploadedFile>((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener("progress", (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploads(prev => new Map(prev.set(fileName, {
              fileName,
              progress,
              status: "uploading",
            })));
          }
        });

        // Handle completion
        xhr.addEventListener("load", () => {
          if (xhr.status === 200) {
            try {
              const response = JSON.parse(xhr.responseText);
              if (response.success) {
                setUploads(prev => new Map(prev.set(fileName, {
                  fileName,
                  progress: 100,
                  status: "completed",
                })));
                resolve(response.document);
              } else {
                throw new Error(response.error || "Upload failed");
              }
            } catch {
              reject(new Error("Invalid response from server"));
            }
          } else if (xhr.status === 422) {
            // Validation error - file processing failed
            try {
              const response = JSON.parse(xhr.responseText);
              const validationError = createValidationError(
                response.error || "File validation failed",
                response.details,
                response.suggestion
              );
              reject(validationError);
            } catch {
              const validationError = createValidationError("File validation failed");
              reject(validationError);
            }
          } else {
            try {
              const response = JSON.parse(xhr.responseText);
              reject(new Error(response.error || `HTTP ${xhr.status}`));
            } catch {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          }
        });

        // Handle errors
        xhr.addEventListener("error", () => {
          reject(new Error("Network error during upload"));
        });

        xhr.addEventListener("abort", () => {
          reject(new Error("Upload was cancelled"));
        });

        // Start the upload
        xhr.open("POST", "/api/upload");
        xhr.send(formData);
      });

      return uploadedFile;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      const validationErr = isValidationError(error);

      setUploads(prev => new Map(prev.set(fileName, {
        fileName,
        progress: 0,
        status: validationErr ? "validation_error" : "error",
        error: errorMessage,
        errorDetails: validationErr ? error.details : undefined,
        suggestion: validationErr ? error.suggestion : undefined,
      })));

      throw error;
    }
  }, []);

  const clearUpload = useCallback((fileName: string) => {
    setUploads(prev => {
      const newMap = new Map(prev);
      newMap.delete(fileName);
      return newMap;
    });
  }, []);

  const clearAllUploads = useCallback(() => {
    setUploads(new Map());
  }, []);

  const isUploading = Array.from(uploads.values()).some(
    upload => upload.status === "uploading" || upload.status === "processing"
  );

  return {
    uploads,
    uploadFile,
    clearUpload,
    clearAllUploads,
    isUploading,
  };
}