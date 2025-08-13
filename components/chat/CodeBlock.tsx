'use client';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function CodeBlock({ inline, className, children, ...props }: CodeBlockProps) {
  if (!inline) {
    return (
      <div className="not-prose flex flex-col">
        <pre
          {...props}
          className={cn(
            "text-sm w-full overflow-x-auto p-4 border rounded-xl",
            // Use Skate AI design tokens (better than hardcoded colors)
            "bg-muted border-border text-foreground",
            "dark:bg-muted dark:border-border dark:text-foreground"
          )}
        >
          <code className="whitespace-pre-wrap break-words">{children}</code>
        </pre>
      </div>
    );
  } else {
    return (
      <code
        className={cn(
          className,
          "text-sm py-0.5 px-1 rounded-md",
          // Use design tokens for consistency
          "bg-muted text-foreground dark:bg-muted dark:text-foreground"
        )}
        {...props}
      >
        {children}
      </code>
    );
  }
}