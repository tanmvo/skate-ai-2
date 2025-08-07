import { Message } from "ai/react";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, User, AlertCircle, RefreshCw, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Citation } from "@/lib/types/citations";
// Simplified for search-only approach - removed synthesis dependencies

interface ProgressiveMessageProps {
  message: Message;
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
  // Simplified for search-only approach - removed synthesis logic

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

  // Check if the message has parts (AI SDK v4 pattern)
  const messageParts = (message as unknown as { parts?: Array<{ type: string; text?: string; toolInvocation?: unknown }> }).parts;
  
  console.log('Message parts for', message.id, ':', messageParts);

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
                        <div className="prose prose-sm max-w-none dark:prose-invert">
                          <div className="whitespace-pre-wrap text-sm">
                            {part.text}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                  {/* Message Metadata */}
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatTimestamp(message.createdAt || new Date())}</span>
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
          } else if (part.type === 'tool-invocation') {
            const toolInvocation = part.toolInvocation as unknown as { toolName: string; state: string; args?: { query: string }; result?: string };
            if (!toolInvocation || !['search_all_documents', 'search_specific_documents', 'find_document_ids'].includes(toolInvocation.toolName)) {
              return null;
            }
            
            // Extract search query and result count
            const searchQuery = toolInvocation.args?.query as string || '';
            const resultText = typeof toolInvocation.result === 'string' ? toolInvocation.result : '';
            const resultCount = resultText.match(/Found (\d+) relevant passages?/i)?.[1];
            
            return (
              <div key={`${message.id}-tool-${index}`} className="flex gap-3 justify-start">
                <div className="w-8 h-8 flex-shrink-0" />
                <div className="max-w-[70%]">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-1 px-3 bg-muted/30 rounded-lg">
                    {toolInvocation.state === 'call' || toolInvocation.state === 'partial-call' ? (
                      <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                        <span>Searching for: &ldquo;{searchQuery}&rdquo;</span>
                      </>
                    ) : toolInvocation.state === 'result' ? (
                      <>
                        <div className="w-3 h-3 rounded-full bg-green-600 flex items-center justify-center">
                          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                        </div>
                        <span>
                          {resultCount ? `Found ${resultCount} relevant passage${resultCount === '1' ? '' : 's'}` : 'Search completed'}
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
        {/* Simplified message rendering */}
        {message.content && (
          <div className="animate-fade-in delay-200">
            <Card className="bg-muted">
              <CardContent className="p-3">
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <div className="whitespace-pre-wrap text-sm">
                    {message.content}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Tool Invocations - Following Vercel AI SDK example pattern */}
        {message.role === 'assistant' && message.toolInvocations && (
          <div className="space-y-2 mt-3">
            {message.toolInvocations.map((toolInvocation) => {
              const { toolName, toolCallId, state } = toolInvocation;
              
              // Only show search tools
              if (!['search_all_documents', 'search_specific_documents', 'find_document_ids'].includes(toolName)) {
                return null;
              }
              
              // Extract search query and result count
              const searchQuery = toolInvocation.args?.query as string || '';
              const resultText = typeof toolInvocation.result === 'string' ? toolInvocation.result : '';
              const resultCount = resultText.match(/Found (\d+) relevant passages?/i)?.[1];
              
              return (
                <div key={toolCallId} className="flex items-center gap-2 text-sm text-muted-foreground py-1 px-3 bg-muted/30 rounded-lg">
                  {state === 'call' || state === 'partial-call' ? (
                    <>
                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-current"></div>
                      <span>Searching for: &ldquo;{searchQuery}&rdquo;</span>
                    </>
                  ) : state === 'result' ? (
                    <>
                      <div className="w-3 h-3 rounded-full bg-green-600 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
                      </div>
                      <span>
                        {resultCount ? `Found ${resultCount} relevant passage${resultCount === '1' ? '' : 's'}` : 'Search completed'}
                      </span>
                    </>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}

        {/* Message Metadata */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatTimestamp(message.createdAt || new Date())}</span>
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
            onClick={() => onCopy?.(message.content)}
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
  message: Message;
  persistenceError: boolean;
  onRetryPersistence?: () => void;
  formatTimestamp: (date: Date) => string;
}) {
  return (
    <div className={cn("flex gap-3 justify-end")}>
      <div className="max-w-[80%] space-y-2 order-2">
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="p-3">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="whitespace-pre-wrap text-sm">
                {message.content}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{formatTimestamp(message.createdAt || new Date())}</span>
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