"use client";

import { FileUpload } from "./FileUpload";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  FileText, 
  Loader2, 
  CheckCircle, 
  XCircle, 
  Trash2,
  Download 
} from "lucide-react";
import { cn } from "@/lib/utils";

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
}

export function DocumentPanel({ documents = [], onFileUploaded, studyId }: DocumentPanelProps) {
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
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-green-500" />;
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
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b">
        <h2 className="font-semibold mb-4">Documents</h2>
        <FileUpload 
          studyId={studyId}
          onFileUploaded={handleFileUpload}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {documents.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-sm text-muted-foreground">
              No documents uploaded yet
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Upload files to start analyzing with AI
            </p>
          </div>
        ) : (
          documents.map((doc) => (
            <Card key={doc.id} className="transition-colors hover:bg-muted/50">
              <CardContent className="p-3">
                <div className="flex items-start gap-3">
                  <div className="text-lg leading-none">
                    {getFileIcon(doc.mimeType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium truncate">
                        {doc.originalName || doc.fileName}
                      </h4>
                      {getStatusIcon(doc.processingStatus)}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span className={cn(
                        doc.processingStatus === "COMPLETED" && "text-green-600",
                        doc.processingStatus === "PROCESSING" && "text-blue-600",
                        doc.processingStatus === "FAILED" && "text-red-600"
                      )}>
                        {getStatusText(doc.processingStatus)}
                      </span>
                    </div>
                    
                    {doc.processingStatus === "FAILED" && (
                      <div className="mt-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          Retry
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {doc.processingStatus === "COMPLETED" && (
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                        <Download className="h-3 w-3" />
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}