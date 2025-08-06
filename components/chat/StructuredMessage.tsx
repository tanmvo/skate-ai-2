import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronRight, FileText, Search } from "lucide-react";
import { StructuredResponse, DocumentCitation } from "@/lib/schemas/synthesis-schema";
import { cn } from "@/lib/utils";

interface StructuredMessageProps {
  synthesis: StructuredResponse;
  onCitationClick?: (citation: DocumentCitation) => void;
}

/**
 * Component for rendering structured synthesis responses with inline citations
 */
export function StructuredMessage({ synthesis, onCitationClick }: StructuredMessageProps) {
  const [expandedCitations, setExpandedCitations] = useState<Set<string>>(new Set());
  const [showMetadata, setShowMetadata] = useState(false);

  const toggleCitation = (citationId: string) => {
    setExpandedCitations(prev => {
      const next = new Set(prev);
      if (next.has(citationId)) {
        next.delete(citationId);
      } else {
        next.add(citationId);
      }
      return next;
    });
  };

  /**
   * Parse text and replace citation markers with interactive badges
   */
  const renderTextWithCitations = (text: string) => {
    // Split on citation markers while preserving them
    const parts = text.split(/({{cite:[^}]+}})/);
    
    return parts.map((part, index) => {
      const citationMatch = part.match(/{{cite:([^}]+)}}/);
      
      if (citationMatch) {
        const citationId = citationMatch[1];
        const citation = synthesis.citations.find(c => c.id === citationId);
        
        if (citation) {
          return (
            <CitationBadge
              key={`citation-${index}`}
              citation={citation}
              isExpanded={expandedCitations.has(citationId)}
              onClick={() => {
                toggleCitation(citationId);
                onCitationClick?.(citation);
              }}
            />
          );
        } else {
          // Show placeholder for missing citations
          return (
            <span key={`missing-${index}`} className="text-muted-foreground text-xs">
              [{citationId}]
            </span>
          );
        }
      }
      
      return part;
    });
  };

  return (
    <div className="space-y-4">
      {/* Main Response Content */}
      <Card className="bg-muted">
        <CardContent className="p-4">
          <div className="prose prose-sm max-w-none dark:prose-invert">
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {renderTextWithCitations(synthesis.response)}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expanded Citation Details */}
      {expandedCitations.size > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Citation Details
          </h4>
          {synthesis.citations
            .filter(citation => expandedCitations.has(citation.id))
            .map(citation => (
              <CitationDetail
                key={citation.id}
                citation={citation}
                onCollapse={() => toggleCitation(citation.id)}
              />
            ))}
        </div>
      )}

      {/* Synthesis Metadata */}
      <Collapsible open={showMetadata} onOpenChange={setShowMetadata}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto p-2 text-xs text-muted-foreground hover:text-foreground"
          >
            <Search className="h-3 w-3 mr-1" />
            Research Details
            {showMetadata ? (
              <ChevronDown className="h-3 w-3 ml-1" />
            ) : (
              <ChevronRight className="h-3 w-3 ml-1" />
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <Card className="bg-muted/50">
            <CardContent className="p-3 text-xs text-muted-foreground space-y-2">
              <div>
                <span className="font-medium">Search Queries:</span>{" "}
                {synthesis.metadata.searchQueries.join(", ")}
              </div>
              <div>
                <span className="font-medium">Documents Analyzed:</span>{" "}
                {synthesis.metadata.documentsSearched.join(", ")}
              </div>
              <div>
                <span className="font-medium">Content Chunks:</span>{" "}
                {synthesis.metadata.totalChunksAnalyzed}
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

/**
 * Interactive citation badge component
 */
interface CitationBadgeProps {
  citation: DocumentCitation;
  isExpanded: boolean;
  onClick: () => void;
}

function CitationBadge({ citation, isExpanded, onClick }: CitationBadgeProps) {
  return (
    <Button
      variant={isExpanded ? "default" : "secondary"}
      size="sm"
      className={cn(
        "inline-flex items-center gap-1 h-6 px-2 mx-1 text-xs font-medium",
        "hover:scale-105 transition-transform cursor-pointer",
        isExpanded && "bg-primary text-primary-foreground"
      )}
      onClick={onClick}
    >
      <FileText className="h-3 w-3" />
      {citation.documentName.split('.')[0]}
      {citation.pageNumber && (
        <span className="text-xs opacity-75">p.{citation.pageNumber}</span>
      )}
    </Button>
  );
}

/**
 * Expanded citation detail component
 */
interface CitationDetailProps {
  citation: DocumentCitation;
  onCollapse: () => void;
}

function CitationDetail({ citation, onCollapse }: CitationDetailProps) {
  return (
    <Card className="bg-background border-l-4 border-l-primary">
      <CardContent className="p-3">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">{citation.documentName}</span>
            {citation.pageNumber && (
              <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                Page {citation.pageNumber}
              </span>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCollapse}
            className="h-auto p-1"
          >
            <ChevronDown className="h-3 w-3" />
          </Button>
        </div>
        <blockquote className="border-l-2 border-muted pl-3 text-sm text-muted-foreground italic">
          {citation.relevantText}
        </blockquote>
      </CardContent>
    </Card>
  );
}