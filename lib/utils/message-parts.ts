/**
 * Determines if a message part at a given index is the final text response.
 * A text part is considered final if it's the last text part and comes after all tool calls.
 */
export function isFinalTextPart(
  messageParts: Array<{ type: string; text?: string; [key: string]: unknown }>,
  currentIndex: number
): boolean {
  const textParts = messageParts
    .map((part, idx) => ({ part, index: idx }))
    .filter(({ part }) => part.type === 'text' && part.text && typeof part.text === 'string' && part.text.trim());

  const toolParts = messageParts
    .map((part, idx) => ({ part, index: idx }))
    .filter(({ part }) => part.type && part.type.startsWith('tool-'));

  const finalTextIndex = textParts.length > 0 ? textParts[textParts.length - 1].index : -1;
  const lastToolIndex = toolParts.length > 0 ? toolParts[toolParts.length - 1].index : -1;

  return currentIndex === finalTextIndex && currentIndex > lastToolIndex;
}
