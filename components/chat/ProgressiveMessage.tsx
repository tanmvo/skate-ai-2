import { UIMessage } from "@ai-sdk/react";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, User, AlertCircle, RefreshCw, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Citation } from "@/lib/types/citations";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { useToolProgress } from "@/lib/hooks/useToolProgress";
// Simplified for search-only approach - removed synthesis dependencies

interface ProgressiveMessageProps {
  message: UIMessage;
  persistenceError?: boolean;
  onCitationClick?: (citation: Citation) => void;
  onRetryPersistence?: () => void;
  onCopy?: (text: string) => void;
  formatTimestamp: (date: Date) => string;
}

export function ProgressiveMessage({
  message,
  persistenceError = false,
  onRetryPersistence,
  onCopy,
  formatTimestamp,
}: ProgressiveMessageProps) {
  // Extract tool progress data using v5 compatible hook
  const toolProgress = useToolProgress(message);

  if (message.role === "user") {
    return (
      <UserMessage
        message={message}
        persistenceError={persistenceError}
        onRetryPersistence={onRetryPersistence}
        formatTimestamp={formatTimestamp}
      />
    );
  }

  // Check if the message has parts (AI SDK v5 pattern)
  const messageParts = (message as unknown as { parts?: Array<{ type: string; text?: string; toolInvocation?: unknown }> }).parts;

  if (messageParts && Array.isArray(messageParts)) {
    // Render using message parts (AI SDK v4 pattern)
    return (
      <div className={cn("space-y-3")}>
        {messageParts.map((part, index) => {
          if (part.type === 'text' && part.text && part.text.trim()) {
            return (
              <div key={`${message.id}-part-${index}`} className="flex gap-3 justify-start">
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
                <div className="max-w-[80%] space-y-3 order-1">
                  <div className="animate-fade-in delay-200">
                    <Card className="bg-muted">
                      <CardContent className="p-3">
                        <MarkdownRenderer content={part.text} />
                      </CardContent>
                    </Card>
                  </div>
                  {/* Message Metadata */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatTimestamp(new Date())}</span>
                    {persistenceError && (
                      <>
                        <AlertCircle className="h-3 w-3 text-destructive" />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-auto p-1 text-destructive hover:text-destructive"
                          onClick={onRetryPersistence}
                          title="Message not saved - click to retry"
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-auto p-1"
                      onClick={() => onCopy?.(part.text || '')}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          } else if (part.type && part.type.startsWith('tool-')) {
            // Extract tool name from type (e.g., "tool-search_all_documents" -> "search_all_documents")
            const toolName = part.type.substring(5);
            
            if (!['search_all_documents', 'search_specific_documents', 'find_document_ids'].includes(toolName)) {
              return null;
            }
            
            // Find matching tool from toolProgress data
            const matchingTool = toolProgress.tools.find(tool => tool.toolName === toolName);
            
            if (!matchingTool) {
              return null;
            }
            
            // Extract data from the matching tool
            const searchQuery = matchingTool.query || '';
            const resultCount = matchingTool.resultCount;
            const isActive = matchingTool.isActive;
            
            return (
              <div key={`${message.id}-tool-${index}`} className="flex gap-3 justify-start">
                <div className="w-8 h-8 flex-shrink-0" />
                <div className="max-w-[70%]">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-1 px-3 bg-muted/30 rounded-lg">
                    {isActive ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                        <span>
                          {toolName === 'find_document_ids' && 'Looking up documents'}
                          {toolName === 'search_specific_documents' && 'Searching specific documents'}
                          {toolName === 'search_all_documents' && 'Searching all documents'}
                          {searchQuery && `: "${searchQuery}"`}
                        </span>
                      </>
                    ) : matchingTool.state === 'output-available' ? (
                      <>
                        <div className="w-3 h-3 rounded-full bg-green-600 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                        <span>
                          {toolName === 'find_document_ids' && 'Found document IDs'}
                          {toolName === 'search_specific_documents' && (
                            resultCount ? `Found ${resultCount} passage${resultCount === 1 ? '' : 's'} in specific documents` : 'Searched specific documents'
                          )}
                          {toolName === 'search_all_documents' && (
                            resultCount ? `Found ${resultCount} passage${resultCount === 1 ? '' : 's'} across all documents` : 'Search completed'
                          )}
                        </span>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  }

  // Fallback to old rendering if parts are not available
  return (
    <div className={cn("flex gap-3 justify-start")}>
      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
        <Bot className="h-4 w-4 text-primary-foreground" />
      </div>

      <div className="max-w-[80%] space-y-3 order-1">
        {/* Simplified message rendering - extract content from parts */}
        {message.parts && message.parts.some(part => part.type === 'text' && part.text) && (
          <div className="animate-fade-in delay-200">
            <Card className="bg-muted">
              <CardContent className="p-3">
                <MarkdownRenderer content={
                  message.parts
                    ?.filter(part => part.type === 'text')
                    .map(part => part.text)
                    .join('') || ''
                } />
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* TODO: Tool Invocations - will be implemented in Phase 1F */}
        {/* Tool invocation display needs to be updated for v5 part structure */}

        {/* Message Metadata */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatTimestamp(new Date())}</span>
          {persistenceError && (
            <>
              <AlertCircle className="h-3 w-3 text-destructive" />
              <Button
                size="sm"
                variant="ghost"
                className="h-auto p-1 text-destructive hover:text-destructive"
                onClick={onRetryPersistence}
                title="Message not saved - click to retry"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="ghost"
            className="h-auto p-1"
            onClick={() => onCopy?.(
              message.parts
                ?.filter(part => part.type === 'text')
                .map(part => part.text)
                .join('') || ''
            )}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function UserMessage({
  message,
  persistenceError,
  onRetryPersistence,
  formatTimestamp,
}: {
  message: UIMessage;
  persistenceError: boolean;
  onRetryPersistence?: () => void;
  formatTimestamp: (date: Date) => string;
}) {
  return (
    <div className={cn("flex gap-3 justify-end")}>
      <div className="max-w-[80%] space-y-2 order-2">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-3">
            <MarkdownRenderer content={
              message.parts
                ?.filter(part => part.type === 'text')
                .map(part => part.text)
                .join('') || ''
            } />
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatTimestamp(new Date())}</span>
          {persistenceError && (
            <>
              <AlertCircle className="h-3 w-3 text-destructive" />
              <Button
                size="sm"
                variant="ghost"
                className="h-auto p-1 text-destructive hover:text-destructive"
                onClick={onRetryPersistence}
                title="Message not saved - click to retry"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0 order-3">
        <User className="h-4 w-4" />
      </div>
    </div>
  );
}