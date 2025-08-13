"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DocumentCitation } from "@/lib/types/citations";
import { cn } from "@/lib/utils";

interface CitationBadgeProps {
  citation: DocumentCitation;
  index: number;
  onClick?: (citation: DocumentCitation) => void;
  className?: string;
}

export function CitationBadge({ 
  citation, 
  index, 
  onClick, 
  className 
}: CitationBadgeProps) {
  const handleClick = () => {
    onClick?.(citation);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge 
            variant="secondary" 
            className={cn(
              "ml-1 text-xs cursor-pointer bg-citation/10 text-citation hover:bg-citation/20 border-citation/20 ring-1 ring-inset ring-citation/20 transition-colors",
              className
            )}
            onClick={handleClick}
          >
            [{index + 1}]
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2">
            <p className="font-medium text-sm text-document">{citation.documentName}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {citation.relevantText}
            </p>
            {citation.pageNumber && (
              <p className="text-xs text-document/80 font-mono">
                Page {citation.pageNumber}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}