import { UIMessage } from "@ai-sdk/react";
import { Bot, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isFinalTextPart } from "@/lib/utils/message-parts";
import { Citation } from "@/lib/types/citations";
import { MarkdownRenderer } from "@/components/chat/MarkdownRenderer";
import { MessageActions } from "@/components/chat/MessageActions";
import { useToolProgress } from "@/lib/hooks/useToolProgress";
import { AnimatePresence, motion } from "framer-motion";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
// Simplified for search-only approach - removed synthesis dependencies

interface ProgressiveMessageProps {
  message: UIMessage;
  persistenceError?: boolean;
  onCitationClick?: (citation: Citation) => void;
  onRetryPersistence?: () => void;
  onCopy?: (text: string) => void;
  formatTimestamp: (date: Date) => string;
  isLoading?: boolean;
}

export function ProgressiveMessage({
  message,
  persistenceError = false,
  onRetryPersistence,
  onCopy,
  formatTimestamp,
  isLoading = false,
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
            const showActions = isFinalTextPart(messageParts, index);

            return (
              <motion.div
                key={`${message.id}-part-${index}`}
                className="w-full mx-auto max-w-3xl px-4 group/message"
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                data-role="assistant"
              >
                <div className="flex gap-4 w-full">
                  <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
                    {isLoading ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <div className="translate-y-px">
                        <Bot size={14} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-4 w-full">
                    <div className="flex flex-col gap-4">
                      <MarkdownRenderer content={part.text} />
                    </div>
                    {/* Message Actions - only show on final text part */}
                    {!isLoading && showActions && (
                      <div className="flex items-center gap-2">
                        {persistenceError && (
                          <div className="flex items-center gap-2">
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
                          </div>
                        )}
                        <MessageActions
                          message={{ ...message, parts: [{ type: 'text', text: part.text }] } as UIMessage}
                          onCopy={onCopy!}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
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
            
            // Extract data from the matching tool and part state
            const searchQuery = matchingTool.query || '';
            const resultCount = matchingTool.resultCount;
            const partState = (part as { state?: 'input-available' | 'output-available' }).state;
            
            // Tools are only active during live streaming, not for historical messages
            const isActive = matchingTool.isActive && partState === 'input-available';
            
            return (
              <motion.div
                key={`${message.id}-tool-${index}`}
                className="w-full mx-auto max-w-3xl px-4 group/message"
                initial={{ y: 5, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                data-role="assistant"
              >
                <div className="flex gap-4 w-full">
                  <div className="size-8 flex-shrink-0" />
                  <div className="flex flex-col gap-4 w-full">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 px-3 bg-muted/30 border border-border/50 rounded-lg">
                      {isActive ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-analysis"></div>
                          <span>
                            {toolName === 'find_document_ids' && 'Looking up documents'}
                            {toolName === 'search_specific_documents' && 'Searching specific documents'}
                            {toolName === 'search_all_documents' && 'Searching all documents'}
                            {searchQuery && `: "${searchQuery}"`}
                          </span>
                        </>
                      ) : partState === 'output-available' ? (
                        <>
                          <div className="w-3 h-3 rounded-full bg-analysis/80 flex items-center justify-center">
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
              </motion.div>
            );
          }
          return null;
        })}
      </div>
    );
  }

  // Fallback to ai-chatbot style rendering if parts are not available
  return (
    <AnimatePresence>
      <motion.div
        className="w-full mx-auto max-w-3xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role="assistant"
      >
        <div className="flex gap-4 w-full">
          <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border bg-background">
            <div className="translate-y-px">
              <Bot size={14} />
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full">
            {/* Simplified message rendering - extract content from parts */}
            {message.parts && message.parts.some(part => part.type === 'text' && part.text) && (
              <div className="flex flex-col gap-4">
                <MarkdownRenderer content={
                  message.parts
                    ?.filter(part => part.type === 'text')
                    .map(part => part.text)
                    .join('') || ''
                } />
              </div>
            )}
            
            {/* Message Actions */}
            <div className="flex items-center gap-2">
              {persistenceError && (
                <div className="flex items-center gap-2">
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
                </div>
              )}
              <MessageActions 
                message={message}
                onCopy={onCopy!}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function UserMessage({
  message,
  persistenceError,
  onRetryPersistence,
}: {
  message: UIMessage;
  persistenceError: boolean;
  onRetryPersistence?: () => void;
  formatTimestamp: (date: Date) => string;
}) {
  return (
    <AnimatePresence>
      <motion.div
        className="w-full mx-auto max-w-3xl px-4 group/message"
        initial={{ y: 5, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        data-role="user"
      >
        <div className="flex gap-4 w-full group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:w-fit">
          <div className="flex flex-col gap-4 w-full">
            <div className="bg-primary text-primary-foreground px-3 py-2 rounded-xl">
              <MarkdownRenderer 
                className="[&_*]:text-primary-foreground [&_h1]:text-primary-foreground [&_h2]:text-primary-foreground [&_h3]:text-primary-foreground [&_h4]:text-primary-foreground [&_h5]:text-primary-foreground [&_h6]:text-primary-foreground [&_p]:text-primary-foreground [&_li]:text-primary-foreground [&_code]:text-primary-foreground [&_strong]:text-primary-foreground [&_em]:text-primary-foreground"
                content={
                  message.parts
                    ?.filter(part => part.type === 'text')
                    .map(part => part.text)
                    .join('') || ''
                } 
              />
            </div>

            {persistenceError && (
              <div className="flex items-center justify-end gap-2">
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
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}