"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { MessageList } from "./MessageList";
import { ChatInput } from "./ChatInput";
import { ChatZeroState } from "./ChatZeroState";
import { useChatManager } from "@/lib/hooks/useChatManager";
import { useMessages } from "@/lib/hooks/useMessages";
import { useChatStream } from "@/lib/hooks/useChatStream";
import { SimpleChatHeader } from "./SimpleChatHeader";
import { useAnalytics } from "@/lib/analytics/hooks/use-analytics";
import { calculateRetryDelay, sleep, RetryState, DEFAULT_RETRY_STATE } from "@/lib/error-handling";
import { useStudy } from "@/lib/hooks/useStudy";
import { useDocuments } from "@/lib/hooks/useDocuments";
import { Button } from "../ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface ChatPanelProps {
  studyId: string;
}

export function ChatPanel({ studyId }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [messagesLoaded, setMessagesLoaded] = useState(false);
  const [retryState, setRetryState] = useState<RetryState>(DEFAULT_RETRY_STATE);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);

  // Analytics tracking
  const { trackMessageCopy } = useAnalytics();

  // Get study data for summary
  const { study, isLoading: isStudyLoading } = useStudy(studyId);

  // Get documents to check if study has any uploaded
  const { documents } = useDocuments(studyId);
  const hasDocuments = documents.length > 0;

  // Use the chat manager hook
  const {
    currentChatId,
    currentChat,
    loading: chatLoading,
    error: chatError,
    isCreatingNew,
    isGeneratingTitle,
    createNewChat,
    generateTitleInBackground,
  } = useChatManager(studyId);

  // Use SWR for message loading with caching
  const { 
    messages: cachedMessages, 
    error: messagesError,
    mutate: mutateMessages,
    isLoading: loadingMessages 
  } = useMessages(studyId, currentChatId);


  const resetRetryState = useCallback(() => {
    setRetryState(DEFAULT_RETRY_STATE);
    setPendingMessage(null);
  }, []);

  const {
    messages,
    setMessages,
    sendMessage,
    status,
    regenerate,
  } = useChatStream({
    currentChatId,
    currentChatTitle: currentChat?.title,
    retryState,
    pendingMessage,
    onMessagesUpdate: mutateMessages,
    onResetRetryState: resetRetryState,
    onSetStreamError: setStreamError,
    onSetPendingMessage: setPendingMessage,
    onSetRetryState: setRetryState,
    onPerformRetry: async () => {
      // Retry logic for overloaded errors
      if (!pendingMessage || retryState.attempt >= retryState.maxAttempts) return;

      const nextAttempt = retryState.attempt + 1;
      const delayMs = calculateRetryDelay(nextAttempt);

      setRetryState(prev => ({
        ...prev,
        attempt: nextAttempt,
        isRetrying: true,
        retryCountdown: Math.ceil(delayMs / 1000)
      }));

      // Countdown timer
      const countdownInterval = setInterval(() => {
        setRetryState(prev => {
          if (prev.retryCountdown <= 1) {
            clearInterval(countdownInterval);
            return { ...prev, retryCountdown: 0 };
          }
          return { ...prev, retryCountdown: prev.retryCountdown - 1 };
        });
      }, 1000);

      await sleep(delayMs);

      // Clear error state and retry
      setStreamError(null);
      sendMessage({
        role: 'user',
        parts: [{ type: 'text', text: pendingMessage }],
      });
    },
    onGenerateTitle: generateTitleInBackground,
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Load cached messages when available
  useEffect(() => {
    if (cachedMessages.length > 0 && currentChatId && !loadingMessages) {
      setMessages(cachedMessages);
      setMessagesLoaded(true);
    } else if (currentChatId && !loadingMessages && cachedMessages.length === 0) {
      // Chat exists but has no messages - clear current messages
      setMessages([]);
      setMessagesLoaded(true);
    }
  }, [cachedMessages, currentChatId, loadingMessages, setMessages]);

  // Reset messages loaded state when chat changes
  useEffect(() => {
    setMessagesLoaded(false);
  }, [currentChatId]);

  // Auto-focus input when creating new chat
  useEffect(() => {
    if (!isCreatingNew && currentChatId && textareaRef.current && messagesLoaded) {
      // Small delay to ensure the textarea is ready
      const focusTimeout = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      
      return () => clearTimeout(focusTimeout);
    }
  }, [currentChatId, isCreatingNew, messagesLoaded]);

  const resetHeight = useCallback(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = '60px';
    }
  }, []);

  // Derive summary generation state from SWR
  const isGeneratingSummary = hasDocuments && !study?.summary && !isStudyLoading;

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault();

    if (!hasDocuments || status !== 'ready' || !input.trim() || retryState.isRetrying) return;

    const userMessage = input.trim();

    // Clear any previous retry state
    resetRetryState();
    setStreamError(null);

    // Send message using v5 API - user message saving is handled server-side
    sendMessage({
      role: 'user',
      parts: [{ type: 'text', text: userMessage }],
    });

    setInput('');
    resetHeight();
  }, [hasDocuments, input, sendMessage, status, resetHeight, retryState.isRetrying, resetRetryState]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-adjust height like ai-chatbot
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight + 2}px`;
    }
  }, []);


  // Removed copyToClipboard - now handled inline

  const handleMessageCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    // toast.success('Copied to clipboard');
    
    // Track the copy action - using default 'general_response' type for now
    trackMessageCopy(
      studyId,
      currentChatId || undefined,
      'general_response'
    );
  }, [studyId, currentChatId, trackMessageCopy]);

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat("en", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  // Show error state for messages
  if (messagesError) {
    return (
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Chat</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Failed to load messages
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive mb-4">{messagesError.message}</p>
            <Button onClick={() => mutateMessages()} variant="outline">
              <RefreshCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Don't render chat interface until we have a chatId and messages are loaded
  if (chatLoading || !currentChatId || (!messagesLoaded && loadingMessages)) {
    return (
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Chat</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Loading chat...
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <RefreshCcw className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (chatError) {
    return (
      <div className="flex flex-col min-w-0 h-dvh bg-background">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold">Chat</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Error loading chat
          </p>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <p className="text-destructive">{chatError}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background">
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <SimpleChatHeader
            currentChat={currentChat}
            onNewChat={createNewChat}
            isCreatingNew={isCreatingNew}
            isGeneratingTitle={isGeneratingTitle}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Ask questions about your documents
        </p>
      </div>

      <div className="flex flex-col min-w-0 gap-6 flex-1 overflow-y-scroll pt-4 relative">
        {!hasDocuments ? (
          <ChatZeroState />
        ) : (
          <MessageList
            studyId={studyId}
            study={study}
            messages={messages}
            isGeneratingSummary={isGeneratingSummary}
            onMessageCopy={handleMessageCopy}
            formatTimestamp={formatTimestamp}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      <ChatInput
        textareaRef={textareaRef}
        input={input}
        hasDocuments={hasDocuments}
        status={status}
        retryState={retryState}
        streamError={streamError}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        onRetry={regenerate}
        onResetRetryState={() => {
          setStreamError(null);
          resetRetryState();
        }}
      />
    </div>
  );
}