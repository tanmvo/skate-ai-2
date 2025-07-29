"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Upload, File, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFileUpload } from "@/lib/hooks/useFileUpload";
import { toast } from "sonner";

interface FileUploadProps {
  studyId: string;
  onFileUploaded?: (file: { id: string; fileName: string; status: string }) => void;
  className?: string;
  disabled?: boolean;
}

const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
};

export function FileUpload({ studyId, onFileUploaded, className, disabled }: FileUploadProps) {
  const { uploadFile, uploads, isUploading } = useFileUpload();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    for (const file of acceptedFiles) {
      try {
        const uploadedFile = await uploadFile(file, studyId);
        
        // Call the callback if provided
        onFileUploaded?.(uploadedFile);
        
        // Show success toast
        toast.success(`${file.name} uploaded successfully`);
      } catch (error) {
        console.error("Upload failed:", error);
        const errorMessage = error instanceof Error ? error.message : "Upload failed";
        toast.error(`Failed to upload ${file.name}: ${errorMessage}`);
      }
    }
  }, [uploadFile, studyId, onFileUploaded]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    disabled: disabled || isUploading,
    multiple: true,
  });

  // Check if any files are currently uploading
  const uploadingFiles = Array.from(uploads.values()).filter(
    upload => upload.status === "uploading"
  );

  return (
    <div className={className}>
      <Card
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed transition-colors cursor-pointer",
          isDragActive && !isDragReject && "border-primary bg-primary/5",
          isDragReject && "border-destructive bg-destructive/5",
          (disabled || isUploading) && "cursor-not-allowed opacity-50"
        )}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center p-6 text-center">
          {isUploading ? (
            <>
              <Loader2 className="h-8 w-8 text-primary mb-3 animate-spin" />
              <p className="text-sm text-primary font-medium">
                Uploading {uploadingFiles.length} file{uploadingFiles.length !== 1 ? "s" : ""}...
              </p>
              {uploadingFiles.map((upload) => (
                <p key={upload.fileName} className="text-xs text-muted-foreground mt-1">
                  {upload.fileName}: {upload.progress}%
                </p>
              ))}
            </>
          ) : isDragActive ? (
            isDragReject ? (
              <>
                <File className="h-8 w-8 text-destructive mb-3" />
                <p className="text-sm text-destructive font-medium">
                  File type not supported
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Only PDF, DOCX, and TXT files are allowed
                </p>
              </>
            ) : (
              <>
                <Upload className="h-8 w-8 text-primary mb-3" />
                <p className="text-sm text-primary font-medium">
                  Drop files here to upload
                </p>
              </>
            )
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground mb-3" />
              <p className="text-sm font-medium mb-1">
                Drag & drop files here, or click to select
              </p>
              <p className="text-xs text-muted-foreground">
                Supports PDF, DOCX, and TXT files (max 10MB each)
              </p>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}