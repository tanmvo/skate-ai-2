"use client";

import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ConfirmationDialog } from "@/components/ui/confirmation-dialog";
import { RenameDocumentModal } from "./rename-document-modal";
import { 
  MoreHorizontal, 
  Edit3, 
  Trash2, 
  Download,
  RefreshCw 
} from "lucide-react";

interface Document {
  id: string;
  fileName: string;
  originalName?: string;
  processingStatus: string;
  fileSize: number;
  mimeType: string;
}

interface DocumentActionsMenuProps {
  document: Document;
  onRename?: (newName: string) => Promise<void>;
  onDelete?: () => Promise<void>;
  onRetry?: () => Promise<void>;
  onDownload?: () => void;
}

export function DocumentActionsMenu({
  document,
  onRename,
  onDelete,
  onRetry,
  onDownload,
}: DocumentActionsMenuProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    if (!onDelete) return;
    
    setIsDeleting(true);
    try {
      await onDelete();
      setShowDeleteDialog(false);
    } catch (error) {
      console.error("Failed to delete document:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleRename = async (newName: string) => {
    if (onRename) {
      await onRename(newName);
      setShowRenameModal(false);
    }
  };

  const canRetry = document.processingStatus === "FAILED" && onRetry;
  const canDownload = document.processingStatus === "COMPLETED" && onDownload;
  const canRename = !!onRename;
  const canDelete = !!onDelete;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            size="sm" 
            variant="ghost" 
            className="h-8 w-8 p-0 rounded-full"
            onClick={(e) => {
              e.stopPropagation(); // Prevent triggering parent click events
            }}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
            <span className="sr-only">Document actions</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {canRename && (
            <DropdownMenuItem 
              onClick={() => setShowRenameModal(true)}
              className="flex items-center gap-2"
            >
              <Edit3 className="h-4 w-4" />
              Rename
            </DropdownMenuItem>
          )}
          
          {canDownload && (
            <DropdownMenuItem 
              onClick={onDownload}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Download
            </DropdownMenuItem>
          )}
          
          {canRetry && (
            <DropdownMenuItem 
              onClick={onRetry}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry Processing
            </DropdownMenuItem>
          )}
          
          {(canRename || canDownload || canRetry) && canDelete && (
            <DropdownMenuSeparator />
          )}
          
          {canDelete && (
            <DropdownMenuItem 
              variant="destructive"
              onClick={() => setShowDeleteDialog(true)}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {canDelete && (
        <ConfirmationDialog
          isOpen={showDeleteDialog}
          title="Delete Document"
          description={`Are you sure you want to delete "${document.originalName || document.fileName}"? This action cannot be undone.`}
          confirmText="Delete"
          type="danger"
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteDialog(false)}
          isLoading={isDeleting}
        />
      )}

      {canRename && (
        <RenameDocumentModal
          document={document}
          isOpen={showRenameModal}
          onClose={() => setShowRenameModal(false)}
          onRename={handleRename}
        />
      )}
    </>
  );
}