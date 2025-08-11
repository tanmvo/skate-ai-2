"use client";

import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, File, Loader2, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useFileUpload } from "@/lib/hooks/useFileUpload";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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
                <motion.p 
                  className="text-sm text-foreground font-medium mb-4"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  Processing {uploadingFiles.length} file{uploadingFiles.length !== 1 ? "s" : ""}...
                </motion.p>
                <motion.div 
                  className="space-y-2 w-full max-w-[200px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {uploadingFiles.map((upload, index) => (
                    <motion.div
                      key={upload.fileName}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 + index * 0.1 }}
                      className="flex items-center justify-between text-xs bg-muted/60 rounded-lg px-3 py-2 backdrop-blur-sm"
                    >
                      <span className="truncate max-w-[120px] font-medium">{upload.fileName}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div 
                            className="h-full bg-primary rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${upload.progress}%` }}
                            transition={{ duration: 0.3 }}
                          />
                        </div>
                        <span className="text-primary font-bold text-xs min-w-[24px]">{upload.progress}%</span>
                      </div>
                    </motion.div>
                  ))}
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
    </div>
  );
}