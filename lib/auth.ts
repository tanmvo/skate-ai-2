/**
 * Authentication utilities for MVP development mode
 * 
 * This provides basic user validation and security checks
 * for the single-user development environment.
 */

import { prisma } from "./prisma";
import { DEFAULT_USER, DEFAULT_USER_ID } from "./constants";

/**
 * Get the current user (hardcoded for MVP)
 * In production, this would validate against a session/token
 */
export function getCurrentUserId(): string {
  return DEFAULT_USER_ID;
}

/**
 * Ensure the default user exists in the database
 * Call this during app initialization
 */
export async function ensureDefaultUser() {
  try {
    const existingUser = await prisma.user.findUnique({
      where: { id: DEFAULT_USER_ID },
    });

    if (!existingUser) {
      await prisma.user.create({
        data: {
          id: DEFAULT_USER_ID,
          name: DEFAULT_USER.name,
          email: DEFAULT_USER.email,
        },
      });
      console.log("✓ Default user created:", DEFAULT_USER.email);
    } else {
      console.log("✓ Default user exists:", existingUser.email);
    }
  } catch (error) {
    console.error("Failed to ensure default user:", error);
    throw error;
  }
}

/**
 * Validate that a study belongs to the current user
 */
export async function validateStudyOwnership(studyId: string): Promise<boolean> {
  try {
    const study = await prisma.study.findFirst({
      where: {
        id: studyId,
        userId: getCurrentUserId(),
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
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        study: {
          userId: getCurrentUserId(),
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
  return prisma.study.findMany({
    where: {
      userId: getCurrentUserId(),
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
  return prisma.study.findFirst({
    where: {
      id: studyId,
      userId: getCurrentUserId(),
    },
    ...options,
  });
}