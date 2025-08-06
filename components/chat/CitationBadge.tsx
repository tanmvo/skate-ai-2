"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Citation } from "@/lib/types/citations";
import { cn } from "@/lib/utils";

interface CitationBadgeProps {
  citation: Citation;
  index: number;
  onClick?: (citation: Citation) => void;
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
              "ml-1 text-xs cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors",
              className
            )}
            onClick={handleClick}
          >
            [{index + 1}]
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-sm">
          <div className="space-y-2">
            <p className="font-medium text-sm">{citation.documentName}</p>
            <p className="text-xs text-muted-foreground">
              {citation.content}
            </p>
            {citation.pageNumber && (
              <p className="text-xs text-muted-foreground">
                Page {citation.pageNumber}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}