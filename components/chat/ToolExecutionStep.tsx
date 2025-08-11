import { Search } from "lucide-react";
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
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 px-3 bg-muted/30 border border-border/50 rounded-lg">
        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-analysis"></div>
        <Search className="h-3 w-3 text-analysis" />
        <span>
          Searching for: {searchQuery ? `"${searchQuery}"` : '...'}
        </span>
      </div>
    );
  }
  
  if (isCompleted) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2 px-3 bg-muted/30 border border-border/50 rounded-lg">
        <div className="w-3 h-3 rounded-full bg-analysis/80 flex items-center justify-center">
          <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
        </div>
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