import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { MessageCircle, Clock, Loader2 } from "lucide-react";

interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    messages: number;
  };
}

interface ChatListItemProps {
  chat: Chat;
  isActive: boolean;
  onSelect: () => void;
  isGeneratingTitle?: boolean;
  className?: string;
}

export function ChatListItem({ chat, isActive, onSelect, isGeneratingTitle = false, className }: ChatListItemProps) {
  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 sm:p-2 rounded-sm cursor-pointer transition-colors",
        "hover:bg-accent hover:text-accent-foreground active:bg-accent/80",
        "touch-manipulation select-none", // Mobile optimizations
        isActive && "bg-accent text-accent-foreground",
        className
      )}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {isGeneratingTitle ? (
          <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />
        ) : (
          <MessageCircle className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
        <div className="min-w-0 flex-1">
          <div className="font-medium text-sm truncate" title={chat.title}>
            {isGeneratingTitle && chat.title === 'New Chat' ? 'Generating title...' : chat.title}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{formatTimeAgo(new Date(chat.updatedAt))}</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        {chat._count.messages > 0 && (
          <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
            {chat._count.messages}
          </Badge>
        )}
        {isActive && (
          <div className="w-2 h-2 bg-primary rounded-full" />
        )}
      </div>
    </div>
  );
}