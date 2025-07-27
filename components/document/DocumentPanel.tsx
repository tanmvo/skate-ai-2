"use client";

import { useState } from "react";
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
  fileType: string;
  fileSize: number;
  status: "PROCESSING" | "READY" | "FAILED";
  uploadedAt: Date;
}

interface DocumentPanelProps {
  documents: Document[];
  onFileUpload: (files: File[]) => void;
  studyId: string;
}

const mockDocuments: Document[] = [
  {
    id: "1",
    fileName: "interview-user-1.pdf",
    fileType: "application/pdf",
    fileSize: 245760,
    status: "READY",
    uploadedAt: new Date("2024-01-15T10:30:00"),
  },
  {
    id: "2",
    fileName: "interview-user-2.docx",
    fileType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    fileSize: 123456,
    status: "PROCESSING",
    uploadedAt: new Date("2024-01-15T11:00:00"),
  },
  {
    id: "3",
    fileName: "research-notes.txt",
    fileType: "text/plain",
    fileSize: 45678,
    status: "FAILED",
    uploadedAt: new Date("2024-01-15T11:15:00"),
  },
];

export function DocumentPanel({ documents = mockDocuments, onFileUpload, studyId }: DocumentPanelProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (files: File[]) => {
    setIsUploading(true);
    try {
      await onFileUpload(files);
    } finally {
      setIsUploading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ["B", "KB", "MB", "GB"];
    if (bytes === 0) return "0 B";
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + " " + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
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

  const getStatusIcon = (status: Document["status"]) => {
    switch (status) {
      case "PROCESSING":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "READY":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "FAILED":
        return <XCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = (status: Document["status"]) => {
    switch (status) {
      case "PROCESSING":
        return "Processing...";
      case "READY":
        return "Ready";
      case "FAILED":
        return "Failed";
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b">
        <h2 className="font-semibold mb-4">Documents</h2>
        <FileUpload 
          onFileUpload={handleFileUpload}
          disabled={isUploading}
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
                    {getFileIcon(doc.fileType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-sm font-medium truncate">
                        {doc.fileName}
                      </h4>
                      {getStatusIcon(doc.status)}
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span>•</span>
                      <span className={cn(
                        doc.status === "READY" && "text-green-600",
                        doc.status === "PROCESSING" && "text-blue-600",
                        doc.status === "FAILED" && "text-red-600"
                      )}>
                        {getStatusText(doc.status)}
                      </span>
                    </div>
                    
                    {doc.status === "FAILED" && (
                      <div className="mt-2">
                        <Button size="sm" variant="outline" className="h-7 text-xs">
                          Retry
                        </Button>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    {doc.status === "READY" && (
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