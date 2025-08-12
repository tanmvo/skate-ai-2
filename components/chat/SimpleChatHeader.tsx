"use client";

import { Button } from "@/components/ui/button";
import { MessageCircle, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    messages: number;
  };
}

interface SimpleChatHeaderProps {
  currentChat: Chat | null;
  onNewChat: () => Promise<void>;
  isCreatingNew?: boolean;
  isGeneratingTitle?: boolean;
  className?: string;
}

export function SimpleChatHeader({
  currentChat,
  onNewChat,
  isCreatingNew = false,
  isGeneratingTitle = false,
  className,
}: SimpleChatHeaderProps) {
  const handleNewChat = async () => {
    try {
      await onNewChat();
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  };

  const isLoading = isCreatingNew || isGeneratingTitle;

  return (
    <div className={cn("flex items-center justify-between", className)}>
      <div className="flex items-center gap-2 text-left">
        <div className="flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : (
            <MessageCircle className="h-4 w-4 text-muted-foreground" />
          )}
          <div className="flex flex-col">
            <h2 className="font-semibold text-sm">
              {isCreatingNew 
                ? "Creating new chat..." 
                : isGeneratingTitle
                  ? "Generating title..."
                  : currentChat?.title || "Chat"}
            </h2>
            {currentChat && currentChat._count.messages > 0 && (
              <span className="text-xs text-muted-foreground">
                {currentChat._count.messages} message{currentChat._count.messages !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleNewChat}
        disabled={isLoading}
        className="flex items-center gap-2"
      >
        <Plus className="h-4 w-4" />
        New Chat
      </Button>
    </div>
  );
}