"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Send, Copy, Bot, User, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  id: string;
  role: "USER" | "ASSISTANT";
  content: string;
  citations?: {
    documentName: string;
    page?: number;
    section?: string;
  }[];
  timestamp: Date;
}

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  studyId: string;
}

const mockMessages: ChatMessage[] = [
  {
    id: "1",
    role: "USER",
    content: "What are the main themes in these interviews?",
    timestamp: new Date("2024-01-15T10:30:00"),
  },
  {
    id: "2",
    role: "ASSISTANT",
    content: "Based on the interviews, I've identified several key themes:\n\n1. **User Frustration with Onboarding**: Multiple participants mentioned feeling overwhelmed during the initial setup process. They struggled with understanding the sequence of steps required.\n\n2. **Need for Clear Visual Guidance**: Users consistently requested more visual cues and step-by-step guidance rather than text-heavy instructions.\n\n3. **Mobile vs Desktop Experience**: There's a significant gap between the mobile and desktop onboarding experiences, with mobile users reporting more confusion.\n\nThese themes appear consistently across all interviewed participants.",
    citations: [
      { documentName: "interview-user-1.pdf", page: 3 },
      { documentName: "interview-user-2.docx", section: "Onboarding Experience" },
    ],
    timestamp: new Date("2024-01-15T10:31:00"),
  },
];

export function ChatPanel({ messages = mockMessages, onSendMessage, studyId }: ChatPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue("");
    setIsLoading(true);

    try {
      await onSendMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
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
                message.role === "USER" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "ASSISTANT" && (
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4 text-primary-foreground" />
                </div>
              )}

              <div
                className={cn(
                  "max-w-[80%] space-y-2",
                  message.role === "USER" ? "order-2" : "order-1"
                )}
              >
                <Card
                  className={cn(
                    message.role === "USER"
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

                    {message.citations && message.citations.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-border/50">
                        <div className="text-xs text-muted-foreground mb-2">
                          Sources:
                        </div>
                        <div className="space-y-1">
                          {message.citations.map((citation, index) => (
                            <div
                              key={index}
                              className="flex items-center gap-2 text-xs text-muted-foreground"
                            >
                              <FileText className="h-3 w-3" />
                              <span className="font-medium">
                                {citation.documentName}
                              </span>
                              {citation.page && (
                                <span>• p.{citation.page}</span>
                              )}
                              {citation.section && (
                                <span>• {citation.section}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatTimestamp(message.timestamp)}</span>
                  {message.role === "ASSISTANT" && (
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

              {message.role === "USER" && (
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
        <div className="flex gap-2">
          <Textarea
            ref={textareaRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask a question about your documents..."
            className="resize-none"
            rows={3}
            disabled={isLoading}
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            size="sm"
            className="self-end"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}