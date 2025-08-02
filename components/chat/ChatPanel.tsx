"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useChat } from "ai/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Bot, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { withRetry } from "@/lib/error-handling";
import { Citation } from "@/lib/types/citations";
import { ProgressiveMessage } from "./ProgressiveMessage";

interface ChatPanelProps {
  studyId: string;
  onCitationClick?: (citation: Citation) => void;
}

export function ChatPanel({ studyId, onCitationClick }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [persistenceErrors, setPersistenceErrors] = useState<Set<string>>(new Set());
  const [streamError, setStreamError] = useState<string | null>(null);
  const [messageCitations, setMessageCitations] = useState<Record<string, Citation[]>>({});

  const saveMessageWithRetry = useCallback(async (
    role: 'USER' | 'ASSISTANT', 
    content: string, 
    citations?: Citation[]
  ) => {
    return withRetry(
      async () => {
        const response = await fetch('/api/studies/' + studyId + '/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role,
            content,
            citations,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        return response.json();
      },
      { maxAttempts: 3, delay: 1000, backoff: true }
    );
  }, [studyId]);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
    reload,
    data,
  } = useChat({
    api: '/api/chat',
    body: {
      studyId,
    },
    onError: (error) => {
      console.error('Chat error:', error);
      
      // Parse error response for better error handling
      let errorMessage = 'Failed to send message. Please try again.';
      let isRetryable = true;
      
      try {
        const errorData = JSON.parse(error.message);
        if (errorData.error) {
          errorMessage = errorData.error;
          isRetryable = errorData.retryable !== false;
        }
      } catch {
        // Fallback to original error message
        errorMessage = error.message || errorMessage;
      }
      
      setStreamError(errorMessage);
      
      if (errorMessage.includes('rate limit')) {
        toast.error('Too many requests. Please wait a moment before trying again.');
      } else if (errorMessage.includes('service temporarily unavailable')) {
        toast.error('AI service is temporarily unavailable. Please try again later.');
      } else if (isRetryable) {
        toast.error(errorMessage, {
          action: {
            label: "Retry",
            onClick: () => {
              setStreamError(null);
              reload();
            },
          },
        });
      } else {
        toast.error(errorMessage);
      }
    },
    onFinish: async (message) => {
      try {
        // Extract citations from streamed data
        const citationData = data?.find((item: unknown) => {
          const typedItem = item as { type?: string; citations?: Citation[] };
          return typedItem?.type === 'citations';
        }) as { type: string; citations?: Citation[] } | undefined;
        const citations = citationData?.citations || [];

        // Update message citations state
        if (citations.length > 0) {
          setMessageCitations(prev => ({
            ...prev,
            [message.id]: citations
          }));
        }

        // Save the message with citations
        await saveMessageWithRetry('ASSISTANT', message.content, citations);
        
        // Remove any persistence errors for this message
        setPersistenceErrors(prev => {
          const next = new Set(prev);
          next.delete(message.id);
          return next;
        });
      } catch (err) {
        console.error('Failed to save assistant message:', err);
        setPersistenceErrors(prev => new Set(prev).add(message.id));
        toast.error('Failed to save message. Your conversation may not be fully preserved.');
      }
    },
    onResponse: async () => {
      // Save the user's message to the database when we get a response
      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage && lastUserMessage.role === 'user') {
        try {
          await saveMessageWithRetry('USER', lastUserMessage.content);
          
          // Remove any persistence errors for this message
          setPersistenceErrors(prev => {
            const next = new Set(prev);
            next.delete(lastUserMessage.id);
            return next;
          });
        } catch (err) {
          console.error('Failed to save user message:', err);
          setPersistenceErrors(prev => new Set(prev).add(lastUserMessage.id));
        }
      }
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      // Get the form and trigger submit
      const form = e.currentTarget.closest('form') as HTMLFormElement;
      if (form) {
        // Use dispatchEvent as fallback for environments that don't support requestSubmit
        if (form.requestSubmit) {
          form.requestSubmit();
        } else {
          form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
        }
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const retryMessagePersistence = async (messageId: string, role: 'USER' | 'ASSISTANT', content: string) => {
    try {
      // Include citations for assistant messages if available
      const citations = role === 'ASSISTANT' ? messageCitations[messageId] : undefined;
      await saveMessageWithRetry(role, content, citations);
      setPersistenceErrors(prev => {
        const next = new Set(prev);
        next.delete(messageId);
        return next;
      });
      toast.success('Message saved successfully');
    } catch (err) {
      console.error('Retry failed:', err);
      toast.error('Failed to save message. Please try again.');
    }
  };

  const handleCitationClick = (citation: Citation) => {
    onCitationClick?.(citation);
  };

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  return (
    <div className="h-full flex flex-col bg-background">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Chat</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Ask questions about your documents
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <Bot className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Start a conversation</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Ask questions about your documents to discover insights
            </p>
            <div className="text-left max-w-md mx-auto space-y-2">
              <p className="text-xs text-muted-foreground font-medium">Examples:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p>• &ldquo;What are the main themes in these interviews?&rdquo;</p>
                <p>• &ldquo;Find quotes about user frustrations&rdquo;</p>
                <p>• &ldquo;What patterns do you see across documents?&rdquo;</p>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <ProgressiveMessage
              key={message.id}
              message={message}
              dataStream={data}
              citations={messageCitations[message.id] || []}
              persistenceError={persistenceErrors.has(message.id)}
              onCitationClick={handleCitationClick}
              onRetryPersistence={() => retryMessagePersistence(
                message.id, 
                message.role.toUpperCase() as 'USER' | 'ASSISTANT', 
                message.content
              )}
              onCopy={copyToClipboard}
              formatTimestamp={formatTimestamp}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyPress}
            placeholder="Ask a question about your documents..."
            className="resize-none"
            rows={3}
            disabled={isLoading}
          />
          <Button
            type="submit"
            disabled={!input.trim() || isLoading}
            size="sm"
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
        {(error || streamError) && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            <span>{streamError || error?.message}</span>
            {streamError && (
              <Button
                size="sm"
                variant="ghost"
                className="h-auto p-1 ml-auto text-destructive hover:text-destructive"
                onClick={() => {
                  setStreamError(null);
                  reload();
                }}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
        {persistenceErrors.size > 0 && (
          <div className="flex items-center gap-2 mt-1 p-2 bg-amber-50 dark:bg-amber-950/20 rounded text-xs text-amber-700 dark:text-amber-400">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            <span>{persistenceErrors.size} message(s) not saved. Click the retry button next to affected messages.</span>
          </div>
        )}
      </div>
    </div>
  );
}