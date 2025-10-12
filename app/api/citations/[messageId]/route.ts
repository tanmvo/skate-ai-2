import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { CitationMap } from '@/lib/types/citations';

/**
 * GET /api/citations/[messageId]
 *
 * Fetches citation data for a specific message.
 * Returns empty object if message has no citations.
 *
 * Security:
 * - Validates user ownership via study relationship
 * - Returns 404 if message doesn't belong to user's studies
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ messageId: string }> }
) {
  try {
    // Authenticate user
    const userId = await requireAuth();

    const { messageId } = await params;

    // Validate messageId format
    if (!messageId || messageId.trim() === '') {
      return Response.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    // Fetch message with ownership validation via study relationship
    const message = await prisma.chatMessage.findFirst({
      where: {
        id: messageId,
        study: {
          userId: userId, // Ensures user owns the study containing this message
        },
      },
      select: {
        citations: true,
      },
    });

    // Return 404 if message doesn't exist or user doesn't own it
    if (!message) {
      return Response.json(
        { error: 'Message not found or access denied' },
        { status: 404 }
      );
    }

    // Parse citations from database (stored as JSON)
    // Prisma returns JsonValue which needs type assertion
    const citations: CitationMap = message.citations
      ? (message.citations as unknown as CitationMap)
      : {};

    return Response.json(citations);

  } catch (error) {
    console.error('[Citations API] Error fetching citations:', error);

    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
