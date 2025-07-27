"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Upload, File } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  onFileUpload: (files: File[]) => void;
  className?: string;
  disabled?: boolean;
}

const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
};

export function FileUpload({ onFileUpload, className, disabled }: FileUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileUpload(acceptedFiles);
    }
  }, [onFileUpload]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    disabled,
    multiple: true,
  });

  return (
    <Card
      {...getRootProps()}
      className={cn(
        "border-2 border-dashed transition-colors cursor-pointer",
        isDragActive && !isDragReject && "border-primary bg-primary/5",
        isDragReject && "border-destructive bg-destructive/5",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="flex flex-col items-center justify-center p-6 text-center">
        {isDragActive ? (
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
              Supports PDF, DOCX, and TXT files
            </p>
          </>
        )}
      </div>
    </Card>
  );
}