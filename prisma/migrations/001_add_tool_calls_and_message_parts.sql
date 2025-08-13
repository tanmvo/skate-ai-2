-- Migration: Add toolCalls and messageParts columns to ChatMessage table
-- Date: 2025-08-12
-- Purpose: Enable tool calling history persistence

-- Add new columns with backward compatibility
ALTER TABLE "ChatMessage" 
ADD COLUMN "toolCalls" JSONB,
ADD COLUMN "messageParts" JSONB;

-- Performance indexes (recommended for production)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chatmessage_toolcalls_gin 
ON "ChatMessage" USING gin ("toolCalls") 
WHERE "toolCalls" IS NOT NULL;