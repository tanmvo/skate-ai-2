import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ studyId: string }> }
) {
  const params = await context.params;
  try {
    const study = await prisma.study.findUnique({
      where: { id: params.studyId },
      include: {
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
        messages: {
          orderBy: { timestamp: "asc" },
        },
        _count: {
          select: {
            documents: true,
            messages: true,
          },
        },
      },
    });

    if (!study) {
      return NextResponse.json(
        { error: "Study not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(study);
  } catch (error) {
    console.error("Error fetching study:", error);
    return NextResponse.json(
      { error: "Failed to fetch study" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ studyId: string }> }
) {
  const params = await context.params;
  try {
    const { name } = await request.json();

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Study name is required" },
        { status: 400 }
      );
    }

    const study = await prisma.study.update({
      where: { id: params.studyId },
      data: { name: name.trim() },
      include: {
        _count: {
          select: {
            documents: true,
            messages: true,
          },
        },
      },
    });

    return NextResponse.json(study);
  } catch (error) {
    console.error("Error updating study:", error);
    return NextResponse.json(
      { error: "Failed to update study" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ studyId: string }> }
) {
  const params = await context.params;
  try {
    await prisma.study.delete({
      where: { id: params.studyId },
    });

    return NextResponse.json({ message: "Study deleted successfully" });
  } catch (error) {
    console.error("Error deleting study:", error);
    return NextResponse.json(
      { error: "Failed to delete study" },
      { status: 500 }
    );
  }
}