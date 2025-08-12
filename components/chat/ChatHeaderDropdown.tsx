"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, Plus, MessageCircle, Loader2 } from "lucide-react";
import { ChatListItem } from "./ChatListItem";
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

interface ChatHeaderDropdownProps {
  currentChat: Chat | null;
  recentChats: Chat[];
  onChatSelect: (chatId: string) => void;
  onNewChat: () => Promise<void>;
  isLoading?: boolean;
  isSwitching?: boolean;
  isCreatingNew?: boolean;
  isGeneratingTitle?: boolean;
  titleGenerationChatId?: string | null;
  className?: string;
}

export function ChatHeaderDropdown({
  currentChat,
  recentChats,
  onChatSelect,
  onNewChat,
  isLoading = false,
  isSwitching = false,
  isCreatingNew = false,
  isGeneratingTitle = false,
  titleGenerationChatId = null,
  className,
}: ChatHeaderDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleNewChat = async () => {
    try {
      setIsOpen(false);
      await onNewChat();
    } catch (error) {
      console.error("Failed to create new chat:", error);
    }
  };

  const handleChatSelect = (chatId: string) => {
    if (chatId === currentChat?.id) {
      setIsOpen(false);
      return;
    }
    
    setIsOpen(false);
    onChatSelect(chatId);
  };

  const isDisabled = isLoading || isSwitching || isCreatingNew;
  const isCurrentChatGeneratingTitle = isGeneratingTitle && titleGenerationChatId === currentChat?.id;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-auto p-0 justify-start hover:bg-transparent",
            isDisabled && "opacity-50 cursor-not-allowed",
            className
          )}
          disabled={isDisabled}
        >
          <div className="flex items-center gap-2 text-left">
            <div className="flex items-center gap-2">
              {isSwitching || isCreatingNew || isCurrentChatGeneratingTitle ? (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              ) : (
                <MessageCircle className="h-4 w-4 text-muted-foreground" />
              )}
              <div className="flex flex-col">
                <h2 className="font-semibold text-sm">
                  {isCreatingNew 
                    ? "Creating new chat..." 
                    : isSwitching 
                      ? "Switching chat..." 
                      : isCurrentChatGeneratingTitle
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
            <ChevronDown 
              className={cn(
                "h-4 w-4 text-muted-foreground transition-transform",
                isOpen && "transform rotate-180"
              )} 
            />
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        className="w-80 sm:w-96 max-h-96 overflow-y-auto" 
        align="start"
        side="bottom"
        sideOffset={8}
      >
        {/* New Chat Button */}
        <DropdownMenuItem asChild className="p-0">
          <div
            className="flex items-center gap-2 p-2 cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm"
            onClick={handleNewChat}
          >
            <Plus className="h-4 w-4 text-primary" />
            <span className="font-medium">New Chat</span>
          </div>
        </DropdownMenuItem>
        
        {recentChats.length > 0 && (
          <>
            <DropdownMenuSeparator />
            
            {/* Recent Chats List */}
            <div className="px-2 py-1">
              <div className="text-xs font-medium text-muted-foreground mb-2">
                Recent Chats
              </div>
              <div className="space-y-1">
                {recentChats.map((chat) => (
                  <ChatListItem
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === currentChat?.id}
                    isGeneratingTitle={isGeneratingTitle && titleGenerationChatId === chat.id}
                    onSelect={() => handleChatSelect(chat.id)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
        
        {recentChats.length === 0 && (
          <div className="px-4 py-6 text-center">
            <MessageCircle className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">
              No recent chats
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Create your first chat to get started
            </p>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}