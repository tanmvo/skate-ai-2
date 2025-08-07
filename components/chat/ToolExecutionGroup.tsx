import { ToolExecutionStep } from "./ToolExecutionStep";
import { isSearchTool, ToolInvocationData } from "@/lib/types/tool-execution";

interface ToolExecutionGroupProps {
  toolInvocations?: ToolInvocationData[];
}

export function ToolExecutionGroup({ toolInvocations }: ToolExecutionGroupProps) {
  if (!toolInvocations || toolInvocations.length === 0) {
    return null;
  }
  
  // Filter to only show search-related tools
  const searchToolInvocations = toolInvocations.filter(invocation => 
    isSearchTool(invocation.toolName)
  );
  
  if (searchToolInvocations.length === 0) {
    return null;
  }
  
  return (
    <div className="ml-6 space-y-1 my-2">
      {searchToolInvocations.map((toolInvocation) => (
        <ToolExecutionStep 
          key={toolInvocation.toolCallId} 
          toolInvocation={toolInvocation} 
        />
      ))}
    </div>
  );
}