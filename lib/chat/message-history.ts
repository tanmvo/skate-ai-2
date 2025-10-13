/**
 * Message History Utility
 * Fetches and formats recent conversation history for AI context
 */

import { prisma } from '@/lib/prisma';
import type { UIMessage } from '@ai-sdk/react';
import { CHAT_CONFIG } from '@/lib/constants';
import type {
  HistoryMessage,
  AISDKv5MessagePart,
} from '@/lib/types/chat-messages';

/**
 * Fetch recent message history from database
 *
 * @param chatId - The chat ID to fetch messages from
 * @param excludeMessageId - Optional message ID to exclude (e.g., current message)
 * @returns Array of UIMessage in chronological order (oldest first)
 */
export async function fetchMessageHistory(
  chatId: string,
  excludeMessageId?: string
): Promise<UIMessage[]> {
  try {
    // Fetch last N messages
    // NOTE: We exclude messageParts to reduce token usage - they can be 10K+ tokens per message
    const messages = await prisma.chatMessage.findMany({
      where: {
        chatId,
        ...(excludeMessageId && { id: { not: excludeMessageId } }),
      },
      orderBy: { timestamp: 'desc' },
      take: CHAT_CONFIG.MESSAGE_HISTORY_BUFFER_SIZE,
      select: {
        id: true,
        role: true,
        content: true,
        toolCalls: false,      // ❌ Excluded - too large for context
        messageParts: false,   // ❌ Excluded - too large for context
        citations: true,
        timestamp: true,
      },
    });

    // Reverse to chronological order (oldest first)
    const chronologicalMessages = messages.reverse();
    const fetchedCount = chronologicalMessages.length;

    // Format to AI SDK structure and filter out empty messages
    const formattedMessages = chronologicalMessages
      .map((msg) => formatMessageForAI(msg as unknown as HistoryMessage))
      .filter((msg) => {
        // Remove messages with no text content (Claude API requires non-empty content)
        const hasContent = msg.parts.some(
          (part) => part.type === 'text' && part.text && part.text.trim().length > 0
        );
        if (!hasContent) {
          console.warn(`[Message History] Skipping empty message ${msg.id}`);
        }
        return hasContent;
      });

    // Log if any messages were filtered out
    if (formattedMessages.length < fetchedCount) {
      console.warn(
        `[Message History] Filtered out ${fetchedCount - formattedMessages.length} empty message(s)`
      );
    }

    return formattedMessages;
  } catch (error) {
    console.error('[Message History] Failed to fetch message history:', error);
    // Graceful degradation - continue without history
    return [];
  }
}

/**
 * Format database message to AI SDK compatible format
 *
 * @param msg - Database message to format
 * @returns UIMessage formatted for AI SDK
 */
function formatMessageForAI(msg: HistoryMessage): UIMessage {
  const role = msg.role.toLowerCase() as 'user' | 'assistant';

  // Truncate content if it exceeds max length
  const content =
    msg.content.length > CHAT_CONFIG.MAX_MESSAGE_LENGTH
      ? msg.content.slice(0, CHAT_CONFIG.MAX_MESSAGE_LENGTH)
      : msg.content;

  // Use text-only format for history to minimize token usage
  // Tool calls and message parts are excluded from history (they can be 10K+ tokens each)
  const parts: AISDKv5MessagePart[] = [{
    type: 'text',
    text: content.trim()
  }];

  return {
    id: msg.id,
    role,
    parts,
    createdAt: msg.timestamp,
    citations: msg.citations || undefined,
  } as UIMessage;
}

/**
 * Log message history metrics for debugging
 *
 * @param messages - Array of messages to log metrics for
 */
export function logMessageHistory(messages: UIMessage[], fetchedCount?: number): void {
  const finalCount = messages.length;
  const skippedCount = fetchedCount ? fetchedCount - finalCount : 0;

  console.log(
    `[Message History] Loaded ${finalCount} messages for conversation context` +
    (skippedCount > 0 ? ` (${skippedCount} empty messages skipped)` : '')
  );

  // Check for truncated messages
  const truncatedCount = messages.filter((msg) =>
    msg.parts.some(
      (part) =>
        part.type === 'text' &&
        part.text?.length === CHAT_CONFIG.MAX_MESSAGE_LENGTH
    )
  ).length;

  if (truncatedCount > 0) {
    console.warn(
      `[Message History] ${truncatedCount} message(s) truncated due to length (>${CHAT_CONFIG.MAX_MESSAGE_LENGTH} chars)`
    );
  }
}
