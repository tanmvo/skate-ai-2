"use client";

import { useRef, useEffect } from "react";
import { useChat } from "ai/react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Copy, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatPanelProps {
  studyId: string;
}

export function ChatPanel({ studyId }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
    error,
  } = useChat({
    api: '/api/chat',
    body: {
      studyId,
    },
    onError: (error) => {
      console.error('Chat error:', error);
      toast.error('Failed to send message. Please try again.');
    },
    onFinish: async (message) => {
      // Save the assistant's message to the database
      try {
        await fetch('/api/studies/' + studyId + '/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            role: 'ASSISTANT',
            content: message.content,
          }),
        });
      } catch (err) {
        console.warn('Failed to save assistant message:', err);
      }
    },
    onResponse: async () => {
      // Save the user's message to the database when we get a response
      const lastUserMessage = messages[messages.length - 1];
      if (lastUserMessage && lastUserMessage.role === 'user') {
        try {
          await fetch('/api/studies/' + studyId + '/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              role: 'USER',
              content: lastUserMessage.content,
            }),
          });
        } catch (err) {
          console.warn('Failed to save user message:', err);
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
        form.requestSubmit();
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
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
        <h2 className="font-semibold">Chat</h2>
        <p className="text-sm text-muted-foreground mt-1">
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
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-[80%] space-y-2",
                  message.role === "user" ? "order-2" : "order-1"
                )}
              >
                <Card
                  className={cn(
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  )}
                >
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
                  {message.role === "assistant" && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-auto p-1"
                      onClick={() => copyToClipboard(message.content)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>

              {message.role === "user" && (
                <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0 order-3">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
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
        {error && (
          <p className="text-xs text-destructive mt-2">
            Error: {error.message}
          </p>
        )}
      </div>
    </div>
  );
}