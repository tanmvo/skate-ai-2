"use client";

import { FileUpload } from "./FileUpload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Download,
  MoreHorizontal 
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface Document {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  processingStatus: string;
  uploadedAt: string;
  studyId: string;
}

interface DocumentPanelProps {
  documents: Document[];
  onFileUploaded?: (file: { id: string; fileName: string; status: string }) => void;
  studyId: string;
  highlightedDocumentId?: string;
  citationCounts?: Record<string, number>;
}

export function DocumentPanel({ 
  documents = [], 
  onFileUploaded, 
  studyId, 
  highlightedDocumentId,
  citationCounts = {}
}: DocumentPanelProps) {
  const handleFileUpload = (file: { id: string; fileName: string; status: string }) => {
    onFileUploaded?.(file);
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    switch (mimeType) {
      case "application/pdf":
        return "📄";
      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return "📝";
      case "text/plain":
        return "📃";
      default:
        return "📄";
    }
  };

  const getStatusIcon = (processingStatus: string) => {
    switch (processingStatus) {
      case "PROCESSING":
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
          >
            <Loader2 className="h-4 w-4 animate-spin text-analysis" />
          </motion.div>
        );
      case "COMPLETED":
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          >
            <CheckCircle className="h-4 w-4 text-green-600" />
          </motion.div>
        );
      case "FAILED":
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          >
            <XCircle className="h-4 w-4 text-destructive" />
          </motion.div>
        );
      default:
        return (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
          >
            <CheckCircle className="h-4 w-4 text-green-600" />
          </motion.div>
        );
    }
  };

  const getStatusText = (processingStatus: string) => {
    switch (processingStatus) {
      case "PROCESSING":
        return "Processing...";
      case "COMPLETED":
        return "Ready";
      case "FAILED":
        return "Failed";
      default:
        return "Ready";
    }
  };

  return (
    <div className="flex flex-col h-full bg-background border-r border-border">
      {/* Header with ai-chatbot styling */}
      <div className="flex flex-col gap-4 p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight">Documents</h2>
          <Badge variant="secondary" className="text-xs">
            {documents.length}
          </Badge>
        </div>
        <FileUpload 
          studyId={studyId}
          onFileUploaded={handleFileUpload}
        />
      </div>

      {/* Document List with ai-chatbot patterns */}
      <div className="flex-1 overflow-y-auto p-2">
        <AnimatePresence>
          {documents.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex flex-col items-center justify-center py-12 px-4"
            >
              <div className="w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center mb-4">
                <FileText className="h-8 w-8 text-muted-foreground" />
              </div>
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center space-y-2"
              >
                <h3 className="text-sm font-medium">No documents yet</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Upload files to start analyzing with AI
                </p>
              </motion.div>
            </motion.div>
          ) : (
            documents.map((doc, index) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className={cn(
                  "group relative flex items-center gap-3 rounded-lg p-3 transition-all hover:bg-muted/50 cursor-pointer",
                  highlightedDocumentId === doc.id && "bg-primary/5 ring-1 ring-primary/20"
                )}
              >
                {/* File Icon */}
                <motion.div 
                  className={cn(
                    "flex items-center justify-center w-10 h-10 rounded-lg shrink-0 transition-all duration-300",
                    doc.processingStatus === "PROCESSING" 
                      ? "bg-analysis/10 animate-pulse" 
                      : "bg-muted/50 group-hover:bg-muted/70"
                  )}
                  whileHover={{ scale: 1.05 }}
                  transition={{ type: "spring", stiffness: 300 }}
                >
                  <motion.span 
                    className="text-lg leading-none"
                    animate={doc.processingStatus === "PROCESSING" ? {
                      scale: [1, 1.1, 1],
                      opacity: [0.7, 1, 0.7]
                    } : {}}
                    transition={{ 
                      duration: 2, 
                      repeat: doc.processingStatus === "PROCESSING" ? Infinity : 0,
                      ease: "easeInOut"
                    }}
                  >
                    {getFileIcon(doc.mimeType)}
                  </motion.span>
                </motion.div>
                
                {/* File Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium truncate pr-2">
                      {doc.originalName || doc.fileName}
                    </h4>
                    {getStatusIcon(doc.processingStatus)}
                  </div>
                  
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatFileSize(doc.fileSize)}</span>
                    <span>•</span>
                    <motion.span 
                      className={cn(
                        "transition-colors font-medium text-xs",
                        doc.processingStatus === "COMPLETED" && "text-green-600",
                        doc.processingStatus === "PROCESSING" && "text-analysis",
                        doc.processingStatus === "FAILED" && "text-destructive"
                      )}
                      animate={doc.processingStatus === "PROCESSING" ? {
                        opacity: [0.6, 1, 0.6]
                      } : {}}
                      transition={{ 
                        duration: 1.5, 
                        repeat: doc.processingStatus === "PROCESSING" ? Infinity : 0,
                        ease: "easeInOut"
                      }}
                    >
                      {getStatusText(doc.processingStatus)}
                    </motion.span>
                    {citationCounts[doc.id] && citationCounts[doc.id] > 0 && (
                      <>
                        <span>•</span>
                        <Badge variant="secondary" className="text-xs h-4 px-1.5">
                          {citationCounts[doc.id]} cited
                        </Badge>
                      </>
                    )}
                  </div>

                  {doc.processingStatus === "PROCESSING" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="pt-2"
                    >
                      <div className="w-full h-1 bg-muted/50 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full bg-analysis rounded-full"
                          initial={{ width: "0%" }}
                          animate={{ width: "100%" }}
                          transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: "easeInOut"
                          }}
                        />
                      </div>
                    </motion.div>
                  )}

                  {doc.processingStatus === "FAILED" && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="pt-2"
                    >
                      <Button size="sm" variant="outline" className="h-6 text-xs px-2 hover:bg-primary/5">
                        Retry
                      </Button>
                    </motion.div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  {doc.processingStatus === "COMPLETED" && (
                    <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full">
                      <Download className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0 rounded-full">
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}