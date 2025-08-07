import { Search, Check, Loader2 } from "lucide-react";
import { extractSearchQuery, parseResultCount, ToolInvocationData } from "@/lib/types/tool-execution";

interface ToolExecutionStepProps {
  toolInvocation: ToolInvocationData;
}

export function ToolExecutionStep({ toolInvocation }: ToolExecutionStepProps) {
  const { state, args, result } = toolInvocation;
  const isLoading = state === 'partial-call' || state === 'call';
  const isCompleted = state === 'result';
  
  // Extract search query from arguments
  const searchQuery = extractSearchQuery(args);
  
  // Parse result count from response
  const resultCount = parseResultCount(result);
  
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
        <Loader2 className="h-3 w-3 animate-spin" />
        <Search className="h-3 w-3" />
        <span>
          Searching for: {searchQuery ? `"${searchQuery}"` : '...'}
        </span>
      </div>
    );
  }
  
  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-1">
        <Check className="h-3 w-3 text-green-600" />
        <span>
          {resultCount !== null 
            ? `Found ${resultCount} relevant passage${resultCount === 1 ? '' : 's'}`
            : 'Search completed'
          }
        </span>
      </div>
    );
  }
  
  return null;
}