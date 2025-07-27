"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MoreVertical, Trash2, FileText } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface Study {
  id: string;
  name: string;
  createdAt: Date;
  author: string;
  documentCount: number;
}

interface StudyCardProps {
  study: Study;
  onDelete: (studyId: string) => void;
}

export function StudyCard({ study, onDelete }: StudyCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const router = useRouter();

  const handleCardClick = () => {
    router.push(`/study/${study.id}`);
  };

  const handleDelete = () => {
    onDelete(study.id);
    setShowDeleteDialog(false);
  };

  const formatDate = (date: Date) => {
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
      Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      "day"
    );
  };

  return (
    <Card className="cursor-pointer hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1" onClick={handleCardClick}>
            <h3 className="font-semibold text-lg leading-tight">{study.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              by: {study.author}
            </p>
          </div>
          
          <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DialogTrigger asChild>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete study
                  </DropdownMenuItem>
                </DialogTrigger>
              </DropdownMenuContent>
            </DropdownMenu>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Study</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete &ldquo;{study.name}&rdquo;? This action cannot be undone.
                  All documents and chat history will be permanently removed.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete}>
                  Delete
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent onClick={handleCardClick}>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="h-4 w-4" />
          <span>
            {study.documentCount} {study.documentCount === 1 ? "document" : "documents"}
          </span>
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          Created {formatDate(study.createdAt)}
        </div>
      </CardContent>
    </Card>
  );
}