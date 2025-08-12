"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Document {
  id: string;
  fileName: string;
}

interface RenameDocumentModalProps {
  document: Document;
  isOpen: boolean;
  onClose: () => void;
  onRename: (newName: string) => Promise<void>;
}

export function RenameDocumentModal({
  document,
  isOpen,
  onClose,
  onRename,
}: RenameDocumentModalProps) {
  const [newName, setNewName] = useState(document.fileName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newName.trim() || newName === document.fileName) {
      return;
    }

    setIsSubmitting(true);
    setError(null);
    
    try {
      await onRename(newName.trim());
      onClose();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to rename document");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setNewName(document.fileName); // Reset to original name
      setError(null);
      onClose();
    }
  };

  const isValid = newName.trim().length > 0 && newName !== document.fileName;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename Document</DialogTitle>
          <DialogDescription>
            Enter a new name for &ldquo;{document.fileName}&rdquo;
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Document name"
              disabled={isSubmitting}
              autoFocus
              maxLength={255}
            />
            {error && (
              <p className="text-sm text-destructive mt-1">{error}</p>
            )}
          </div>
          
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}