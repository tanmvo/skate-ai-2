"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
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
  // Manual state management for v5 compatibility
  const [input, setInput] = useState('');

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
    // setMessages, // Not needed for current implementation
    sendMessage,
    status,
    // stop, // Not needed for current implementation  
    regenerate,
  } = useChat({
    id: studyId,
    experimental_throttle: 100, // 60fps throttling
    transport: new DefaultChatTransport({
      api: '/api/chat',
      fetch: async (url: RequestInfo | URL, options?: RequestInit) => {
        try {
          const response = await fetch(url, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              ...options?.headers,
            },
          });
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          
          return response;
        } catch (error) {
          console.error('Transport error:', error);
          throw error;
        }
      },
      prepareSendMessagesRequest({ messages, body }) {
        return {
          body: {
            id: studyId, // Use our studyId for the request
            message: messages.at(-1), // Send last message as expected by API
            ...body,
          },
        };
      },
    }),
    onFinish: async () => {
      try {
        // Save the assistant's message
        const lastMessage = messages[messages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          // Extract content from parts structure
          const content = lastMessage.parts
            ?.filter(part => part.type === 'text')
            .map(part => part.text)
            .join('') || '';
            
          await saveMessageWithRetry('ASSISTANT', content);
          
          setPersistenceErrors(prev => {
            const next = new Set(prev);
            next.delete(lastMessage.id);
            return next;
          });
        }
      } catch (err) {
        console.error('Failed to save assistant message:', err);
        const lastMessage = messages[messages.length - 1];
        if (lastMessage) {
          setPersistenceErrors(prev => new Set(prev).add(lastMessage.id));
        }
        toast.error('Failed to save message. Your conversation may not be fully preserved.');
      }
    },
    onError: (error) => {
      console.error('Chat error:', error);
      
      const errorMessage = 'Failed to send message. Please try again.';
      
      if (error.message?.includes('rate limit')) {
        toast.error('Too many requests. Please wait a moment before trying again.');
      } else if (error.message?.includes('service temporarily unavailable')) {
        toast.error('AI service is temporarily unavailable. Please try again later.');
      } else {
        setStreamError(errorMessage);
        toast.error(errorMessage, {
          action: {
            label: "Retry",
            onClick: () => {
              setStreamError(null);
              regenerate();
            },
          },
        });
      }
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();
    
    if (status === 'streaming' || !input.trim()) return;
    
    // Save user message to database before sending
    const userMessage = input.trim();
    saveMessageWithRetry('USER', userMessage).catch(err => {
      console.error('Failed to save user message:', err);
    });
    
    // Send message using v5 API
    sendMessage({
      role: 'user',
      parts: [{ type: 'text', text: userMessage }],
    });
    
    setInput('');
  }, [input, sendMessage, status, saveMessageWithRetry]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as React.FormEvent);
    }
  };

  // Removed copyToClipboard - now handled inline

  const retryMessagePersistence = async (messageId: string, role: 'USER' | 'ASSISTANT', content: string) => {
    try {
      // Simplified: No synthesis citations since we're using search-only approach
      await saveMessageWithRetry(role, content);
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
          messages.map((message) => {
            return (
              <ProgressiveMessage
                key={message.id}
                message={message}
                persistenceError={persistenceErrors.has(message.id)}
                onCitationClick={handleCitationClick}
                onRetryPersistence={() => {
                  // Extract content from parts structure for v5
                  const content = message.parts
                    ?.filter(part => part.type === 'text')
                    .map(part => part.text)
                    .join('') || '';
                  retryMessagePersistence(
                    message.id, 
                    message.role.toUpperCase() as 'USER' | 'ASSISTANT', 
                    content
                  );
                }}
                onCopy={(text: string) => {
                  navigator.clipboard.writeText(text);
                  toast.success('Copied to clipboard');
                }}
                formatTimestamp={formatTimestamp}
              />
            );
          })
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
            disabled={status === 'streaming'}
          />
          <Button
            type="submit"
            disabled={!input.trim() || status === 'streaming'}
            size="sm"
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
        {(streamError) && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            <span>{streamError}</span>
            {streamError && (
              <Button
                size="sm"
                variant="ghost"
                className="h-auto p-1 ml-auto text-destructive hover:text-destructive"
                onClick={() => {
                  setStreamError(null);
                  regenerate();
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