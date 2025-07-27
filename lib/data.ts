import { prisma } from "./prisma";

export async function getStudies() {
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
    return studies;
  } catch (error) {
    console.error("Error fetching studies:", error);
    throw error;
  }
}

export async function getStudy(studyId: string) {
  try {
    const study = await prisma.study.findUnique({
      where: { id: studyId },
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
    const study = await prisma.study.create({
      data: { name },
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
    await prisma.study.delete({
      where: { id: studyId },
    });
  } catch (error) {
    console.error("Error deleting study:", error);
    throw error;
  }
}