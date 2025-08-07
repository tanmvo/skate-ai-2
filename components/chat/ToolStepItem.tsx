import { Search, Check, Loader2 } from "lucide-react";
import { extractSearchQuery, parseResultCount, ToolInvocationData } from "@/lib/types/tool-execution";

interface ToolStepItemProps {
  toolInvocation: ToolInvocationData;
  formatTimestamp: (date: Date) => string;
}

export function ToolStepItem({ toolInvocation, formatTimestamp }: ToolStepItemProps) {
  const { state, args, result } = toolInvocation;
  const isLoading = state === 'partial-call' || state === 'call';
  const isCompleted = state === 'result';
  
  // Extract search query from arguments
  const searchQuery = extractSearchQuery(args);
  
  // Parse result count from response
  const resultCount = parseResultCount(result);
  
  return (
    <div className="flex gap-3 justify-start my-2">
      {/* Empty avatar space to align with messages */}
      <div className="w-8 h-8 flex-shrink-0" />
      
      <div className="max-w-[70%]">
        {/* Tool execution content */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 px-3 rounded-lg bg-muted/50">
          {isLoading ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              <Search className="h-3 w-3" />
              <span>
                Searching for: {searchQuery ? `"${searchQuery}"` : '...'}
              </span>
            </>
          ) : isCompleted ? (
            <>
              <Check className="h-3 w-3 text-green-600" />
              <span>
                {resultCount !== null 
                  ? `Found ${resultCount} relevant passage${resultCount === 1 ? '' : 's'}`
                  : 'Search completed'
                }
              </span>
            </>
          ) : null}
        </div>
        
        {/* Timestamp */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1 ml-3">
          <span>{formatTimestamp(new Date())}</span>
        </div>
      </div>
    </div>
  );
}