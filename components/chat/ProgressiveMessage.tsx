import { Message } from "ai/react";
import { Card, CardContent } from "@/components/ui/card";
import { Bot, User, AlertCircle, RefreshCw, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Citation } from "@/lib/types/citations";
import { StructuredResponse } from "@/lib/schemas/synthesis-schema";
import { StructuredMessage } from "./StructuredMessage";
import { ThinkingBubble } from "./ThinkingBubble";
import { CitationErrorBoundary } from "./CitationErrorBoundary";
import { useToolCallData } from "@/lib/hooks/useToolCallData";
import { shouldShowThinkingPhase, getCurrentMessagePhase } from "@/lib/utils/message-phases";

interface ProgressiveMessageProps {
  message: Message;
  dataStream?: unknown[];
  citations?: Citation[];
  structuredResponse?: StructuredResponse;
  persistenceError?: boolean;
  onCitationClick?: (citation: Citation) => void;
  onRetryPersistence?: () => void;
  onCopy?: (text: string) => void;
  formatTimestamp: (date: Date) => string;
}

export function ProgressiveMessage({
  message,
  dataStream = [],
  structuredResponse,
  persistenceError = false,
  onCitationClick,
  onRetryPersistence,
  onCopy,
  formatTimestamp,
}: ProgressiveMessageProps) {
  const toolCallData = useToolCallData(dataStream, message.id);
  const shouldShowThinking = shouldShowThinkingPhase(message, toolCallData.events);
  const currentPhase = getCurrentMessagePhase(toolCallData.events);

  // Simple approach: Only use the structuredResponse prop from ChatPanel
  // This ensures each message only shows its own synthesis data
  const shouldShowStructured = message.role === 'assistant' && structuredResponse;

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

  return (
    <div className={cn("flex gap-3 justify-start")}>
      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
        <Bot className="h-4 w-4 text-primary-foreground" />
      </div>

      <div className="max-w-[80%] space-y-3 order-1">
        {/* Thinking Phase */}
        {shouldShowThinking && (
          <CitationErrorBoundary fallback={<div className="text-xs text-muted-foreground">Processing...</div>}>
            <ThinkingBubble
              toolCalls={toolCallData.events}
              isActive={currentPhase === 'thinking'}
              className="animate-fade-in"
            />
          </CitationErrorBoundary>
        )}

        {/* Results Phase */}
        {(message.content || currentPhase === 'results') && (
          <div className="animate-fade-in delay-200">
            {/* Use only the structuredResponse prop */}
            {shouldShowStructured ? (
              <CitationErrorBoundary>
                <StructuredMessage
                  synthesis={structuredResponse!}
                  onCitationClick={onCitationClick}
                />
              </CitationErrorBoundary>
            ) : (
              // Standard message rendering for non-synthesis responses
              <Card className="bg-muted">
                <CardContent className="p-3">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <div className="whitespace-pre-wrap text-sm">
                      {message.content}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
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