import { prisma } from "./prisma";
import { getCurrentUserId } from "./auth";

export async function getStudies() {
  try {
    const userId = getCurrentUserId();
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
    return studies;
  } catch (error) {
    console.error("Error fetching studies:", error);
    throw error;
  }
}

export async function getStudy(studyId: string) {
  try {
    const userId = getCurrentUserId();
    const study = await prisma.study.findFirst({
      where: { 
        id: studyId,
        userId,
      },
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
    return study;
  } catch (error) {
    console.error("Error fetching study:", error);
    throw error;
  }
}

export async function createStudy(name: string) {
  try {
    const userId = getCurrentUserId();
    const study = await prisma.study.create({
      data: { 
        name,
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
    return study;
  } catch (error) {
    console.error("Error creating study:", error);
    throw error;
  }
}

export async function deleteStudy(studyId: string) {
  try {
    const userId = getCurrentUserId();
    const result = await prisma.study.deleteMany({
      where: { 
        id: studyId,
        userId,
      },
    });
    
    if (result.count === 0) {
      throw new Error("Study not found or access denied");
    }
  } catch (error) {
    console.error("Error deleting study:", error);
    throw error;
  }
}