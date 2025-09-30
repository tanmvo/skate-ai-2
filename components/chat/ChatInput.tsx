"use client";

import { FormEvent, KeyboardEvent, ChangeEvent, RefObject } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, RefreshCw, ArrowUp } from "lucide-react";
import { RetryState } from "@/lib/error-handling";

interface ChatInputProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  input: string;
  hasDocuments: boolean;
  status: string;
  retryState: RetryState;
  streamError: string | null;
  onInputChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onRetry: () => void;
  onResetRetryState: () => void;
}

export function ChatInput({
  textareaRef,
  input,
  hasDocuments,
  status,
  retryState,
  streamError,
  onInputChange,
  onSubmit,
  onRetry,
  onResetRetryState,
}: ChatInputProps) {
  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      if (hasDocuments && status === 'ready' && input.trim() && !retryState.isRetrying) {
        onSubmit(e as unknown as FormEvent<HTMLFormElement>);
      }
    }
  };

  const handleSubmitClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    onSubmit(e as unknown as FormEvent<HTMLFormElement>);
  };

  return (
    <>
      <form className="flex mx-auto px-4 bg-background pb-4 md:pb-6 gap-2 w-full md:max-w-3xl">
        <div className="relative w-full flex flex-col gap-4">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={onInputChange}
            onKeyDown={handleKeyDown}
            placeholder={!hasDocuments ? "Upload documents to start chatting..." : retryState.isRetrying ? "Retrying..." : "Ask a question about your documents..."}
            className="min-h-[24px] max-h-[calc(75dvh)] overflow-hidden resize-none rounded-2xl !text-base bg-muted pb-10 dark:border-zinc-700"
            rows={2}
            disabled={!hasDocuments || status !== 'ready' || retryState.isRetrying}
            title={!hasDocuments ? "Upload documents to enable chat" : ""}
            data-1p-ignore
          />

          <div className="absolute bottom-0 right-0 p-2 w-fit flex flex-row justify-end">
            {status !== 'ready' || retryState.isRetrying ? (
              <Button
                className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
                onClick={(e) => {
                  e.preventDefault();
                }}
                disabled
              >
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={!hasDocuments || !input.trim() || status !== 'ready' || retryState.isRetrying}
                className="rounded-full p-1.5 h-fit border dark:border-zinc-600"
                onClick={handleSubmitClick}
                title={!hasDocuments ? "Upload documents to enable chat" : ""}
              >
                <ArrowUp className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Error messages positioned outside the form */}
      <div className="px-4 pb-4">
        {(streamError || retryState.isRetrying) && (
          <div className="flex items-center gap-2 mt-2 p-2 bg-destructive/10 rounded text-xs text-destructive">
            <AlertCircle className="h-3 w-3 flex-shrink-0" />
            <span>
              {retryState.isRetrying && retryState.retryCountdown > 0
                ? `Claude is experiencing high load. Retrying in ${retryState.retryCountdown} seconds...`
                : streamError}
            </span>
            {streamError && !retryState.isRetrying && (
              <Button
                size="sm"
                variant="ghost"
                className="h-auto p-1 ml-auto text-destructive hover:text-destructive"
                onClick={() => {
                  onResetRetryState();
                  onRetry();
                }}
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}
