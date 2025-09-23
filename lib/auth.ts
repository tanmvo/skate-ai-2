/**
 * Authentication utilities with Auth.js integration
 *
 * This provides authentication and security checks using Auth.js
 * with support for both the transition period and new multi-user system.
 */

import { auth } from "@/auth"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"

/**
 * Get the current authenticated user ID
 * Replaces hardcoded getCurrentUserId() with Auth.js session
 */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth()
  return session?.user?.id || null
}

/**
 * Get the current authenticated user ID with error handling
 * For API routes that require authentication
 */
export async function requireAuth(): Promise<string> {
  const userId = await getCurrentUserId()
  if (!userId) {
    throw new Error('Authentication required')
  }
  return userId
}

/**
 * Create a new user with email/password
 */
export async function createUserWithPassword(email: string, password: string, name?: string) {
  const hashedPassword = await bcrypt.hash(password, 12)

  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      emailVerified: new Date(), // Auto-verify for signup
    }
  })

  return user
}


/**
 * Validate that a study belongs to the current user
 */
export async function validateStudyOwnership(studyId: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const study = await prisma.study.findFirst({
      where: {
        id: studyId,
        userId: userId,
      },
    });
    return study !== null;
  } catch (error) {
    console.error("Error validating study ownership:", error);
    return false;
  }
}

/**
 * Validate that a document belongs to the current user
 */
export async function validateDocumentOwnership(documentId: string): Promise<boolean> {
  try {
    const userId = await getCurrentUserId()
    if (!userId) return false

    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        study: {
          userId: userId,
        },
      },
    });
    return document !== null;
  } catch (error) {
    console.error("Error validating document ownership:", error);
    return false;
  }
}

/**
 * Helper function to get studies scoped to current user
 */
export async function getUserStudies(options?: {
  include?: {
    _count?: {
      select: {
        documents?: boolean;
        messages?: boolean;
      };
    };
  };
  orderBy?: {
    updatedAt?: "asc" | "desc";
  };
}) {
  const userId = await getCurrentUserId()
  if (!userId) return []

  return prisma.study.findMany({
    where: {
      userId: userId,
    },
    ...options,
  });
}

/**
 * Helper function to get a single study scoped to current user
 */
export async function getUserStudy(studyId: string, options?: {
  include?: {
    documents?: { orderBy?: { uploadedAt?: "asc" | "desc" } };
    messages?: { orderBy?: { timestamp?: "asc" | "desc" } };
    _count?: {
      select: {
        documents?: boolean;
        messages?: boolean;
      };
    };
  };
}) {
  const userId = await getCurrentUserId()
  if (!userId) return null

  return prisma.study.findFirst({
    where: {
      id: studyId,
      userId: userId,
    },
    ...options,
  });
}

/**
 * Validate that a chat belongs to the current user via study ownership
 * Returns the chat with study included, or null if not found/not owned
 */
export async function validateChatOwnership(chatId: string) {
  const userId = await getCurrentUserId()
  if (!userId) return null

  return prisma.chat.findUnique({
    where: {
      id: chatId,
      study: {
        userId: userId,
      },
    },
    include: { study: true }
  });
}