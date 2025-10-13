import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { toast } from "sonner";
import { sanitizeError, calculateRetryDelay, RetryState } from "@/lib/error-handling";

interface UseChatStreamProps {
  currentChatId: string | null;
  currentChatTitle: string | undefined;
  retryState: RetryState;
  pendingMessage: string | null;
  onMessagesUpdate: () => void;
  onResetRetryState: () => void;
  onSetStreamError: (error: string | null) => void;
  onSetPendingMessage: (message: string | null) => void;
  onSetRetryState: (state: RetryState | ((prev: RetryState) => RetryState)) => void;
  onPerformRetry: () => void;
  onGenerateTitle: (chatId: string) => void;
}

export function useChatStream({
  currentChatId,
  currentChatTitle,
  retryState,
  pendingMessage,
  onMessagesUpdate,
  onResetRetryState,
  onSetStreamError,
  onSetPendingMessage,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onSetRetryState: _onSetRetryState,
  onPerformRetry,
  onGenerateTitle,
}: UseChatStreamProps) {
  const chatResult = useChat({
    id: currentChatId || 'loading',
    experimental_throttle: 100,
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
            id: currentChatId,
            message: messages.at(-1),
            ...body,
          },
        };
      },
    }),
    onFinish: async () => {
      // Assistant messages are saved server-side, now invalidate SWR cache
      onMessagesUpdate();

      // Clear retry state on successful completion
      onResetRetryState();
      onSetStreamError(null);

      // Trigger title generation after 6 messages (3 exchanges)
      if (chatResult.messages.length === 6 && currentChatId && currentChatTitle === 'New Chat') {
        onGenerateTitle(currentChatId);
      }
    },
    onError: async (error) => {
      console.error('Chat error:', error);

      const sanitized = sanitizeError(error);

      // Handle overloaded errors with automatic retry
      if (sanitized.code === 'OVERLOADED_ERROR') {
        if (retryState.attempt < retryState.maxAttempts) {
          // Store the message for retry
          if (!pendingMessage && typeof window !== 'undefined') {
            const inputElement = document.querySelector('textarea') as HTMLTextAreaElement;
            if (inputElement?.value) {
              onSetPendingMessage(inputElement.value.trim());
            }
          }

          onSetStreamError(`Claude is experiencing high load. Retrying in ${Math.ceil(calculateRetryDelay(retryState.attempt + 1) / 1000)} seconds...`);

          // Start automatic retry
          onPerformRetry();
          return;
        } else {
          // Max retries reached
          onSetStreamError('Claude is currently overloaded. Please try again in a few minutes.');
          onResetRetryState();
          toast.error('Claude is currently overloaded. Please try again in a few minutes.', {
            action: {
              label: "Retry",
              onClick: () => {
                onSetStreamError(null);
                onResetRetryState();
                // Note: regenerate will be called from parent
              },
            },
          });
          return;
        }
      }

      // Reset retry state for non-overloaded errors
      onResetRetryState();

      if (error.message?.includes('rate limit')) {
        toast.error('Too many requests. Please wait a moment before trying again.');
      } else if (error.message?.includes('service temporarily unavailable')) {
        toast.error('AI service is temporarily unavailable. Please try again later.');
      } else {
        onSetStreamError(sanitized.message);
        toast.error(sanitized.message, {
          action: {
            label: "Retry",
            onClick: () => {
              onSetStreamError(null);
              // Note: regenerate will be called from parent
            },
          },
        });
      }
    },
  });

  return chatResult;
}
