/**
 * Application Constants
 * 
 * This file contains constants used throughout the application,
 * including user authentication for development mode.
 */

// Default user for MVP development mode
// All studies, documents, and chat messages will be associated with this user
export const DEFAULT_USER_ID = "usr_mvp_dev_2025";

export const DEFAULT_USER = {
  id: DEFAULT_USER_ID,
  name: "MVP Developer",
  email: "dev@skateai.com",
} as const;

// File upload limits
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const SUPPORTED_FILE_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
] as const;

// AI Configuration
export const AI_CONFIG = {
  VOYAGE_MODEL: "voyage-large-2",
  CLAUDE_MODEL: "claude-3-haiku-20240307",
  CHUNK_SIZE: 1000,
  CHUNK_OVERLAP: 200,
  MAX_RELEVANT_CHUNKS: 5,
} as const;

// Chat limits
export const CHAT_CONFIG = {
  MAX_MESSAGE_LENGTH: 4000,
  MAX_MESSAGES_PER_SESSION: 100,
} as const;