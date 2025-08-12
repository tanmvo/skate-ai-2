import { UIMessage } from "@ai-sdk/react";
import { Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { memo, useCallback } from "react";

interface MessageActionsProps {
  message: UIMessage;
  onCopy: (text: string) => void;
  isLoading?: boolean;
}

export const MessageActions = memo(function MessageActions({ 
  message, 
  onCopy, 
  isLoading = false 
}: MessageActionsProps) {
  
  // Extract text content from message parts with improved handling
  const extractMessageText = useCallback((message: UIMessage): string => {
    // Handle parts-based messages (AI SDK v5 pattern)
    if (!message.parts || !Array.isArray(message.parts)) {
      return '';
    }
    
    const textParts = message.parts
      .filter((part: { type: string; text?: string }) => part.type === 'text' && part.text && part.text.trim())
      .map((part: { type: string; text?: string }) => part.text!.trim())
      .filter(Boolean);
    
    return textParts.length > 0 ? textParts.join('\n\n') : '';
  }, []);

  const handleCopy = useCallback(() => {
    const text = extractMessageText(message);
    if (text) {
      onCopy(text);
    }
  }, [message, onCopy, extractMessageText]);

  const messageText = extractMessageText(message);
  
  // Don't render actions if there's no copyable text
  if (!messageText) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            aria-label="Copy message content to clipboard"
            className="py-1 px-2 h-fit text-muted-foreground"
            variant="outline"
            onClick={handleCopy}
            disabled={isLoading}
          >
            <Copy className="h-3 w-3" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Copy message</TooltipContent>
      </Tooltip>
    </div>
  );
});