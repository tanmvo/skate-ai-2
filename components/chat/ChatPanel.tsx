"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, RefreshCw, ArrowUp } from "lucide-react";
import { toast } from "sonner";
import { withRetry } from "@/lib/error-handling";
import { Citation } from "@/lib/types/citations";
import { ProgressiveMessage } from "./ProgressiveMessage";
import { motion } from "framer-motion";

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
    
    if (status !== 'ready' || !input.trim()) return;
    
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
    resetHeight();
  }, [input, sendMessage, status, saveMessageWithRetry]);

  const resetHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '60px';
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-adjust height like ai-chatbot
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  }, []);


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
    <div className="flex flex-col min-w-0 h-dvh bg-background">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold">Chat</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Ask questions about your documents
        </p>
      </div>

      <div className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4 relative">
        {messages.length === 0 ? (
          <div className="max-w-3xl mx-auto md:mt-20 px-8 size-full flex flex-col justify-center">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.5 }}
              className="text-2xl font-semibold"
            >
              Welcome to your research assistant!
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.6 }}
              className="text-2xl text-muted-foreground"
            >
              What would you like to explore in your documents?
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ delay: 0.7 }}
              className="mt-8 space-y-3"
            >
              <p className="text-sm font-medium text-foreground">Try asking:</p>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>• &ldquo;What are the main themes in these interviews?&rdquo;</p>
                <p>• &ldquo;Find quotes about user frustrations&rdquo;</p>
                <p>• &ldquo;What patterns do you see across documents?&rdquo;</p>
              </div>
            </motion.div>
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

      <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
        <div className="relative w-full flex flex-col gap-4">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                if (status === 'ready' && input.trim()) {
                  handleSubmit(e);
                }
              }
            }}
            placeholder="Ask a question about your documents..."
            className="min-h-[24px] max-h-[calc(75dvh)] overflow-hidden resize-none rounded-2xl !text-base bg-muted pb-10 dark:border-zinc-700"
            rows={2}
            disabled={status !== 'ready'}
          />
          
          <div className="absolute bottom-0 right-0 p-2 w-fit flex flex-row justify-end">
            {status !== 'ready' ? (
              <Button
                className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
                onClick={(e) => {
                  e.preventDefault();
                  // Add stop functionality if needed
                }}
              >
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!input.trim() || status !== 'ready'}
                className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
                onClick={(e) => {
                  e.preventDefault();
                  handleSubmit(e);
                }}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </form>
      
      {/* Error messages positioned outside the form */}
      <div className="px-4 pb-4">
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