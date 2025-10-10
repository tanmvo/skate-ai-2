'use client';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface CitationBadgeProps {
  citationNumber: number;
  documentName: string;
  documentExists: boolean;
  className?: string;
}

/**
 * Citation Badge Component
 *
 * Renders an inline superscript badge showing a citation number.
 * Displays document name on hover via tooltip.
 *
 * NOTE: Must be wrapped in a TooltipProvider by the parent component.
 *
 * Visual specs:
 * - Size: 18px height, minimum 20px width
 * - Style: Superscript position, rounded corners, subtle border
 * - Color (exists): Primary color with 10% background opacity
 * - Color (deleted): Muted gray with border
 * - Hover: 20% background opacity increase, tooltip appears after 200ms
 */
export function CitationBadge({
  citationNumber,
  documentName,
  documentExists,
  className
}: CitationBadgeProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <sup
          role="note"
          aria-label={`Citation ${citationNumber}: ${documentName}`}
          tabIndex={0}
          className={cn(
            "inline-flex items-center justify-center",
            "min-w-[20px] h-[18px] px-1.5",
            "text-[10px] font-medium leading-none",
            "rounded-md transition-all duration-150",
            "cursor-pointer select-none",
            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
            documentExists
              ? "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
              : "bg-muted text-muted-foreground hover:bg-muted/80 border border-border",
            "ml-0.5 align-super",
            className
          )}
        >
          {citationNumber}
        </sup>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-xs break-words"
      >
        {documentExists ? (
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium">{documentName}</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="text-xs">Document does not exist</span>
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
