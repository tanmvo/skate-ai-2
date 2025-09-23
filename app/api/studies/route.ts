import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { trackStudyEvent, trackErrorEvent } from "@/lib/analytics/server-analytics";

export async function GET() {
  try {
    const userId = await requireAuth();
    
    const studies = await prisma.study.findMany({
      where: {
        userId,
      },
      include: {
        _count: {
          select: {
            documents: true,
            messages: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    return NextResponse.json(studies);
  } catch (error) {
    console.error("Error fetching studies:", error);

    // Handle authentication errors
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await trackErrorEvent('api_error_occurred', {
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown error fetching studies',
      endpoint: '/api/studies',
      statusCode: 500,
      stackTrace: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: "Failed to fetch studies" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Study name is required" },
        { status: 400 }
      );
    }

    const userId = await requireAuth();

    const study = await prisma.study.create({
      data: {
        name: name.trim(),
        userId,
      },
      include: {
        _count: {
          select: {
            documents: true,
            messages: true,
          },
        },
      },
    });

    // Track study creation
    await trackStudyEvent('study_created', {
      studyId: study.id,
      studyName: study.name,
      documentCount: study._count.documents,
      messageCount: study._count.messages,
    }, userId);

    return NextResponse.json(study, { status: 201 });
  } catch (error) {
    console.error("Error creating study:", error);

    // Handle authentication errors
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    await trackErrorEvent('api_error_occurred', {
      errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : 'Unknown error creating study',
      endpoint: '/api/studies',
      statusCode: 500,
      stackTrace: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: "Failed to create study" },
      { status: 500 }
    );
  }
}