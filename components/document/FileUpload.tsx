"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, Loader2, Plus, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFileUpload } from "@/lib/hooks/useFileUpload";
import { useBatchFileUpload } from "@/lib/hooks/useBatchFileUpload";
import { useAnalytics } from "@/lib/analytics/hooks/use-analytics";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface FileUploadProps {
  studyId: string;
  onFileUploaded?: (file: { id: string; fileName: string; status: string }) => void;
  onBatchUploaded?: (files: { id: string; fileName: string; status: string }[]) => void;
  className?: string;
  disabled?: boolean;
  useBatchMode?: boolean; // Enable batch mode for multiple files
}

const ACCEPTED_FILE_TYPES = {
  "application/pdf": [".pdf"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
  "text/plain": [".txt"],
};

export function FileUpload({
  studyId,
  onFileUploaded,
  onBatchUploaded,
  className,
  disabled,
  useBatchMode = true
}: FileUploadProps) {
  const { uploadFile, uploads, isUploading: isSingleUploading } = useFileUpload();
  const { batchState, uploadBatch, cancelBatch, retryBatch, clearBatch, isUploading: isBatchUploading } = useBatchFileUpload();
  const { trackDocumentUpload } = useAnalytics();

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    // Use batch mode for multiple files or if explicitly enabled
    if (useBatchMode && acceptedFiles.length > 1) {
      try {
        // Track batch upload attempt
        acceptedFiles.forEach(file => {
          trackDocumentUpload(file.name, file.type, file.size);
        });

        const uploadedFiles = await uploadBatch(acceptedFiles, studyId);

        // Call the batch callback if provided
        if (onBatchUploaded) {
          onBatchUploaded(uploadedFiles);
        } else {
          // Fall back to individual callbacks
          uploadedFiles.forEach(file => {
            onFileUploaded?.(file);
          });
        }

        // Show success toast
        const successCount = uploadedFiles.length;
        const totalCount = acceptedFiles.length;

        if (successCount === totalCount) {
          toast.success(`${successCount} file${successCount !== 1 ? 's' : ''} uploaded successfully`);
        } else {
          toast.success(`${successCount}/${totalCount} files uploaded successfully`);
          if (successCount < totalCount) {
            toast.error(`${totalCount - successCount} file${(totalCount - successCount) !== 1 ? 's' : ''} failed to upload`);
          }
        }
      } catch (error) {
        console.error("Batch upload failed:", error);
        const errorMessage = error instanceof Error ? error.message : "Batch upload failed";
        toast.error(`Failed to upload files: ${errorMessage}`);
      }
    } else {
      // Single file mode - process files individually
      for (const file of acceptedFiles) {
        try {
          // Track document upload attempt
          trackDocumentUpload(file.name, file.type, file.size);

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
    }
  }, [uploadFile, uploadBatch, studyId, onFileUploaded, onBatchUploaded, trackDocumentUpload, useBatchMode]);

  // Determine if we're in an uploading state
  const isUploading = isSingleUploading || isBatchUploading;

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILE_TYPES,
    disabled: disabled || isUploading,
    multiple: true,
  });

  // Get uploading files from both single and batch modes
  const singleUploadingFiles = Array.from(uploads.values()).filter(
    upload => upload.status === "uploading"
  );

  const batchUploadingFiles = Array.from(batchState.files.values()).filter(
    file => file.status === "processing" || file.status === "validating" || file.status === "queued"
  );

  const uploadingFiles = isBatchUploading ? batchUploadingFiles : singleUploadingFiles;

  return (
    <div className={className}>
      <div {...getRootProps()}>
        <motion.div
          className={cn(
            "relative group rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer overflow-hidden",
            "border-border/30 bg-muted/20 hover:bg-muted/40",
            "hover:border-primary/40 hover:shadow-sm",
            isDragActive && !isDragReject && "border-primary/60 bg-primary/5 shadow-lg scale-[1.01]",
            isDragReject && "border-destructive/60 bg-destructive/5 shadow-lg",
            (disabled || isUploading) && "cursor-not-allowed opacity-50"
          )}
          whileHover={{ scale: isUploading ? 1 : 1.005 }}
          whileTap={{ scale: isUploading ? 1 : 0.998 }}
          layout
        >
        <input {...getInputProps()} />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={isUploading ? "uploading" : isDragActive ? "drag" : "idle"}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="flex flex-col items-center justify-center p-8 text-center"
          >
            {isUploading ? (
              <>
                <motion.div 
                  className="relative mb-6"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200, damping: 15 }}
                >
                  <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center shadow-lg">
                    <Loader2 className="h-7 w-7 text-primary animate-spin" />
                  </div>
                  <div className="absolute inset-0 rounded-full bg-primary/5 animate-pulse" />
                </motion.div>
                <motion.div
                  className="flex items-center justify-center gap-3 mb-4"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <motion.p className="text-sm text-foreground font-medium">
                    {isBatchUploading ? (
                      <>
                        {batchState.status === 'validating' && 'Validating files...'}
                        {batchState.status === 'processing' && `Processing ${uploadingFiles.length} file${uploadingFiles.length !== 1 ? 's' : ''}...`}
                        {batchState.status === 'uploading' && `Uploading ${uploadingFiles.length} file${uploadingFiles.length !== 1 ? 's' : ''}...`}
                      </>
                    ) : (
                      `Processing ${uploadingFiles.length} file${uploadingFiles.length !== 1 ? 's' : ''}...`
                    )}
                  </motion.p>
                  {isBatchUploading && batchState.status !== 'completed' && (
                    <motion.button
                      onClick={(e) => {
                        e.stopPropagation();
                        cancelBatch();
                      }}
                      className="text-xs text-muted-foreground hover:text-destructive transition-colors duration-200 p-1 rounded"
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                    >
                      <X className="h-3 w-3" />
                    </motion.button>
                  )}
                </motion.div>
                <motion.div 
                  className="space-y-2 w-full max-w-[200px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {uploadingFiles.map((upload, index) => {
                    const fileName = upload.fileName;
                    const progress = upload.progress;
                    const status = upload.status;

                    return (
                      <motion.div
                        key={fileName}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 + index * 0.1 }}
                        className="flex items-center justify-between text-xs bg-muted/60 rounded-lg px-3 py-2 backdrop-blur-sm"
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="truncate max-w-[120px] font-medium">{fileName}</span>
                          {isBatchUploading && (
                            <span className="text-xs text-muted-foreground capitalize">
                              {status === 'queued' && '•'}
                              {status === 'validating' && '✓'}
                              {status === 'processing' && '⚡'}
                              {status === 'completed' && '✓'}
                              {status === 'failed' && '✗'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-1.5 bg-muted rounded-full overflow-hidden">
                            <motion.div
                              className={cn(
                                "h-full rounded-full",
                                status === 'failed' ? "bg-destructive" : "bg-primary"
                              )}
                              initial={{ width: 0 }}
                              animate={{ width: `${progress}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                          <span className={cn(
                            "font-bold text-xs min-w-[24px]",
                            status === 'failed' ? "text-destructive" : "text-primary"
                          )}>
                            {progress}%
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </>
            ) : isDragActive ? (
              isDragReject ? (
                <>
                  <motion.div 
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-destructive/20 to-destructive/10 flex items-center justify-center mb-4 shadow-lg"
                    initial={{ rotate: -10 }}
                    animate={{ rotate: 0 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <File className="h-7 w-7 text-destructive" />
                  </motion.div>
                  <motion.p 
                    className="text-sm text-destructive font-semibold mb-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    File type not supported
                  </motion.p>
                  <motion.p 
                    className="text-xs text-muted-foreground leading-relaxed"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    Only PDF, DOCX, and TXT files are allowed
                  </motion.p>
                </>
              ) : (
                <>
                  <motion.div 
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mb-4 shadow-lg"
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Upload className="h-7 w-7 text-primary animate-bounce" />
                  </motion.div>
                  <motion.p 
                    className="text-sm text-primary font-semibold"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    Drop files here to upload
                  </motion.p>
                </>
              )
            ) : (
              <>
                <motion.div 
                  className="w-14 h-14 rounded-full bg-muted/30 group-hover:bg-primary/10 flex items-center justify-center mb-4 transition-all duration-300 shadow-sm"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors duration-300" />
                </motion.div>
                <motion.p 
                  className="text-sm font-medium mb-2 group-hover:text-foreground transition-colors duration-300"
                  initial={{ opacity: 0.9 }}
                  whileHover={{ opacity: 1 }}
                >
                  Add documents
                </motion.p>
                <motion.p 
                  className="text-xs text-muted-foreground leading-relaxed max-w-[180px]"
                  initial={{ opacity: 0.7 }}
                  whileHover={{ opacity: 0.9 }}
                >
                  Drag & drop or click to upload PDF, DOCX, and TXT files
                </motion.p>
              </>
            )}
          </motion.div>
        </AnimatePresence>
        
          {/* Enhanced gradient overlay for depth and sophistication */}
          <div className="absolute inset-0 bg-gradient-to-br from-background/5 via-transparent to-muted/10 pointer-events-none" />
          <div className="absolute inset-0 bg-gradient-to-t from-transparent via-transparent to-background/5 pointer-events-none" />
        </motion.div>
      </div>

      {/* Batch upload error and retry UI */}
      {batchState.status === 'failed' && batchState.error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-destructive/5 border border-destructive/20 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-destructive flex items-center justify-center">
                <X className="h-2.5 w-2.5 text-destructive-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-destructive">Upload failed</p>
                <p className="text-xs text-muted-foreground">{batchState.error}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <motion.button
                onClick={retryBatch}
                className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors duration-200 flex items-center gap-1"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RefreshCw className="h-3 w-3" />
                Retry
              </motion.button>
              <motion.button
                onClick={clearBatch}
                className="text-xs px-3 py-1.5 border border-border rounded-md hover:bg-muted/50 transition-colors duration-200"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Clear
              </motion.button>
            </div>
          </div>

          {/* Show individual file errors */}
          {batchState.summary.failed > 0 && (
            <div className="mt-3 space-y-1">
              <p className="text-xs text-muted-foreground font-medium">Failed files:</p>
              {Array.from(batchState.files.values())
                .filter(file => file.status === 'failed')
                .map(file => (
                  <div key={file.fileName} className="text-xs text-destructive flex items-center gap-2">
                    <X className="h-2.5 w-2.5" />
                    <span className="truncate">{file.fileName}</span>
                    {file.error && <span className="text-muted-foreground">- {file.error}</span>}
                  </div>
                ))
              }
            </div>
          )}
        </motion.div>
      )}

      {/* Batch upload summary when completed */}
      {batchState.status === 'completed' && batchState.summary.total > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 p-4 bg-primary/5 border border-primary/20 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
                  className="h-2.5 w-2.5 bg-primary-foreground rounded-full"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-primary">
                  Upload completed - {batchState.summary.completed}/{batchState.summary.total} files successful
                </p>
                {batchState.summary.failed > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {batchState.summary.failed} file{batchState.summary.failed !== 1 ? 's' : ''} failed
                  </p>
                )}
              </div>
            </div>
            <motion.button
              onClick={clearBatch}
              className="text-xs px-3 py-1.5 border border-border rounded-md hover:bg-muted/50 transition-colors duration-200"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Clear
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}