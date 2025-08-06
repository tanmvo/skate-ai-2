"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, Copy, ExternalLink } from "lucide-react";
import { Citation } from "@/lib/types/citations";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CitationPanelProps {
  citations: Citation[];
  onCitationClick?: (citation: Citation) => void;
  className?: string;
}

export function CitationPanel({ 
  citations, 
  onCitationClick, 
  className 
}: CitationPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!citations || citations.length === 0) {
    return null;
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Citation copied to clipboard");
  };

  const handleCitationClick = (citation: Citation) => {
    onCitationClick?.(citation);
  };

  return (
    <div className={cn("mt-2", className)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {isOpen ? (
              <ChevronDown className="h-3 w-3 mr-1" />
            ) : (
              <ChevronRight className="h-3 w-3 mr-1" />
            )}
            Sources ({citations.length})
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-2">
          <div className="space-y-2">
            {citations.map((citation, index) => {
              const citationKey = citation.id;
              const displayText = citation.relevantText;
                  
              return (
                <Card key={citationKey} className="bg-muted/20">
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded flex-shrink-0">
                        [{index + 1}]
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-medium truncate">
                            {citation.documentName}
                          </p>
                          {citation.pageNumber && (
                            <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                              Page {citation.pageNumber}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          {displayText}
                        </p>
                        <div className="flex items-center gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => handleCitationClick(citation)}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-xs"
                            onClick={() => copyToClipboard(
                              `${citation.documentName}: "${displayText}"`
                            )}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}