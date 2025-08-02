import { Card, CardContent } from "@/components/ui/card";
import { Search, FileSearch, Database, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ToolCallEvent } from "@/lib/types/chat-phases";
import { formatToolCallsForDisplay } from "@/lib/utils/message-phases";

interface ThinkingBubbleProps {
  toolCalls: ToolCallEvent[];
  className?: string;
  isActive?: boolean;
}

export function ThinkingBubble({ toolCalls, className, isActive = false }: ThinkingBubbleProps) {
  const displayText = formatToolCallsForDisplay(toolCalls);
  const icon = getToolIcon(toolCalls);
  
  return (
    <Card className={cn(
      "bg-blue-50 border-blue-200 max-w-[70%] transition-all duration-300",
      "dark:bg-blue-950/20 dark:border-blue-800/30",
      className
    )}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
          {isActive ? (
            <Loader2 className="h-3 w-3 animate-spin" />
          ) : (
            icon
          )}
          <span className="text-sm font-medium">{displayText}</span>
        </div>
        
        {toolCalls.length > 0 && (
          <div className="mt-1 text-xs text-blue-600/70 dark:text-blue-400/70">
            {getToolCallSummary(toolCalls)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getToolIcon(toolCalls: ToolCallEvent[]) {
  if (toolCalls.length === 0) {
    return <Search className="h-3 w-3" />;
  }
  
  // Get the most recent tool call
  const latestTool = toolCalls
    .filter(event => event.type === 'tool-call-start')
    .slice(-1)[0];
  
  if (!latestTool) {
    return <Search className="h-3 w-3" />;
  }
  
  switch (latestTool.toolName) {
    case 'find_document_ids':
      return <FileSearch className="h-3 w-3" />;
    case 'search_specific_documents':
      return <FileSearch className="h-3 w-3" />;
    case 'search_all_documents':
      return <Database className="h-3 w-3" />;
    default:
      return <Search className="h-3 w-3" />;
  }
}

function getToolCallSummary(toolCalls: ToolCallEvent[]): string {
  const completedTools = toolCalls
    .filter(event => event.type === 'tool-call-end' && event.success)
    .map(event => event.toolName);
  
  const activeTools = toolCalls
    .filter(event => event.type === 'tool-call-start')
    .map(event => event.toolName)
    .filter(tool => !completedTools.includes(tool));
  
  if (activeTools.length > 0) {
    return `Running: ${activeTools.join(', ')}`;
  }
  
  if (completedTools.length > 0) {
    return `Completed: ${completedTools.join(', ')}`;
  }
  
  return '';
}