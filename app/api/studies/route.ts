import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const studies = await prisma.study.findMany({
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

    const study = await prisma.study.create({
      data: {
        name: name.trim(),
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

    return NextResponse.json(study, { status: 201 });
  } catch (error) {
    console.error("Error creating study:", error);
    return NextResponse.json(
      { error: "Failed to create study" },
      { status: 500 }
    );
  }
}