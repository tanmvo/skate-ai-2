"use client";

import { UIMessage } from "@ai-sdk/react";
import { ProgressiveMessage } from "./ProgressiveMessage";
import { StudyWithDetails } from "@/lib/hooks/useStudy";

interface MessageListProps {
  studyId: string;
  study: StudyWithDetails | undefined;
  messages: UIMessage[];
  isGeneratingSummary: boolean;
  onMessageCopy: (text: string) => void;
  formatTimestamp: (timestamp: Date) => string;
}

export function MessageList({
  studyId,
  study,
  messages,
  isGeneratingSummary,
  onMessageCopy,
  formatTimestamp,
}: MessageListProps) {
  return (
    <>
      {/* Render summary loading state as virtual message */}
      {isGeneratingSummary && !study?.summary && (
        <ProgressiveMessage
          key={`summary-loading-${studyId}`}
          message={{
            id: `summary-loading-${studyId}`,
            role: 'assistant' as const,
            parts: [
              {
                type: 'text' as const,
                text: 'Generating study summary...'
              }
            ],
          }}
          persistenceError={false}
          onRetryPersistence={() => {}}
          onCopy={onMessageCopy}
          formatTimestamp={formatTimestamp}
          isLoading={true}
        />
      )}

      {/* Render summary as virtual message if it exists */}
      {study?.summary && (
        <ProgressiveMessage
          key={`summary-${studyId}`}
          message={{
            id: `summary-${studyId}`,
            role: 'assistant' as const,
            parts: [{ type: 'text' as const, text: study.summary }],
          }}
          persistenceError={false}
          onRetryPersistence={() => {}}
          onCopy={onMessageCopy}
          formatTimestamp={formatTimestamp}
        />
      )}

      {/* Render actual chat messages */}
      {messages.map((message) => {
        return (
          <ProgressiveMessage
            key={message.id}
            message={message}
            persistenceError={false}
            onRetryPersistence={() => {}}
            onCopy={onMessageCopy}
            formatTimestamp={formatTimestamp}
          />
        );
      })}
    </>
  );
}
