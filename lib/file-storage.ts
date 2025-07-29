/**
 * File Storage Abstraction Layer
 * 
 * Provides a unified interface for file storage that works in both
 * development (filesystem) and production (Vercel Blob) environments.
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { put, del } from "@vercel/blob";
import type { PutBlobResult } from "@vercel/blob";
import type { NextRequest } from "next/server";

export interface StorageResult {
  url: string;
  size: number;
  pathname: string;
}

export interface StorageError extends Error {
  code: string;
  details?: unknown;
}

/**
 * Store a file in the appropriate storage system
 * 
 * Storage method priority:
 * 1. X-Storage-Type header ('filesystem' | 'vercel-blob' | 'auto')
 * 2. X-Storage-Local header ('true' for filesystem)
 * 3. Default environment-based logic
 */
export async function storeFile(
  fileName: string,
  buffer: Buffer,
  studyId: string,
  request?: NextRequest
): Promise<StorageResult> {
  try {
    // Header-based storage override
    const storageType = request?.headers.get('X-Storage-Type');
    const forceLocal = request?.headers.get('X-Storage-Local') === 'true';
    
    // Determine storage method
    let useFilesystem = false;
    
    if (storageType) {
      // Explicit storage type selection
      useFilesystem = storageType === 'filesystem';
      console.log(`📁 Storage override via header: ${storageType}`);
    } else if (forceLocal) {
      // Boolean override for backwards compatibility
      useFilesystem = true;
      console.log(`📁 Storage override via X-Storage-Local: filesystem`);
    } else {
      // Default behavior (environment-based)
      useFilesystem = !(process.env.NODE_ENV === "production" && process.env.BLOB_READ_WRITE_TOKEN);
      console.log(`📁 Default storage (${process.env.NODE_ENV}): ${useFilesystem ? 'filesystem' : 'vercel-blob'}`);
    }
    
    return useFilesystem 
      ? await storeInFilesystem(fileName, buffer, studyId)
      : await storeInVercelBlob(fileName, buffer, studyId);
  } catch (error) {
    console.error("File storage error:", error);
    const storageError: StorageError = error instanceof Error 
      ? Object.assign(error, { code: "STORAGE_ERROR", details: error.message })
      : new Error("Unknown storage error") as StorageError;
    storageError.code = "STORAGE_ERROR";
    throw storageError;
  }
}

/**
 * Delete a file from storage
 */
export async function deleteFile(pathname: string): Promise<void> {
  try {
    if (process.env.NODE_ENV === "production" && process.env.BLOB_READ_WRITE_TOKEN) {
      await del(pathname);
    } else {
      // For filesystem, pathname is the full file path
      const fs = await import("fs/promises");
      await fs.unlink(pathname);
    }
  } catch (error) {
    console.error("File deletion error:", error);
    // Don't throw on deletion errors to avoid breaking the main flow
  }
}

/**
 * Store file in Vercel Blob (production)
 */
async function storeInVercelBlob(
  fileName: string,
  buffer: Buffer,
  studyId: string
): Promise<StorageResult> {
  // Create a unique path with study scoping and timestamp
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const blobPath = `studies/${studyId}/${timestamp}_${safeName}`;
  
  const result: PutBlobResult = await put(blobPath, buffer, {
    access: "public", // Files are public for MVP (will be private with auth in future)
    addRandomSuffix: false, // We're already adding timestamp for uniqueness
  });

  return {
    url: result.url,
    size: buffer.length,
    pathname: result.pathname,
  };
}

/**
 * Store file in local filesystem (development)
 */
async function storeInFilesystem(
  fileName: string,
  buffer: Buffer,
  studyId: string
): Promise<StorageResult> {
  // Create dev-uploads directory structure if it doesn't exist
  const uploadsDir = join(process.cwd(), "dev-uploads", studyId);
  await mkdir(uploadsDir, { recursive: true });
  
  // Create unique filename with timestamp
  const timestamp = Date.now();
  const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueFileName = `${timestamp}_${safeName}`;
  const filePath = join(uploadsDir, uniqueFileName);
  
  // Write file to filesystem
  await writeFile(filePath, buffer);
  
  return {
    url: `/api/files/${studyId}/${uniqueFileName}`, // URL for serving via Next.js API
    size: buffer.length,
    pathname: filePath, // Full filesystem path for deletion
  };
}

/**
 * Get file URL for serving (used in development)
 */
export function getFileUrl(pathname: string): string {
  if (process.env.NODE_ENV === "production") {
    // In production, pathname is the full Vercel Blob URL
    return pathname;
  } else {
    // In development, convert filesystem path to serve URL
    const relativePath = pathname.replace(join(process.cwd(), "uploads"), "");
    return `/api/files${relativePath}`;
  }
}

/**
 * Validate file before storage
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  const MAX_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ];

  if (file.size > MAX_SIZE) {
    return { valid: false, error: "File size exceeds 10MB limit" };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: "File type not supported. Only PDF, DOCX, and TXT files are allowed." };
  }

  return { valid: true };
}