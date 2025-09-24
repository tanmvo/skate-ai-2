"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Microscope, LogOut } from "lucide-react";
import { StudyCard } from "@/components/study/StudyCard";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStudies } from "@/lib/hooks/useStudies";
import { signOut } from "next-auth/react";

export default function StudiesPage() {
  const [creating, setCreating] = useState(false);
  const router = useRouter();
  const { studies, isLoading, createStudy, deleteStudy } = useStudies();

  const handleCreateStudy = async () => {
    setCreating(true);
    try {
      const newStudy = await createStudy('New Study');
      // Navigate to the new study
      router.push(`/study/${newStudy.id}`);
    } catch {
      // Error handling is done in the hook
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteStudy = async (studyId: string) => {
    try {
      await deleteStudy(studyId);
    } catch {
      // Error handling is done in the hook
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Microscope className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Skate AI</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleCreateStudy} disabled={creating} className="gap-2">
              <Plus className="h-4 w-4" />
              {creating ? 'Creating...' : 'Create'}
            </Button>
            <Button
              variant="outline"
              onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              className="gap-2"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">My Studies</h2>
          <p className="text-muted-foreground">
            Organize your research documents and chat with AI to discover insights
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-6 animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-3"></div>
                <div className="h-3 bg-muted rounded w-1/2 mb-2"></div>
                <div className="h-3 bg-muted rounded w-1/4"></div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {studies.map((study) => (
              <StudyCard
                key={study.id}
                study={{
                  id: study.id,
                  name: study.name,
                  createdAt: new Date(study.createdAt),
                  author: "You",
                  documentCount: study._count.documents,
                }}
                onDelete={() => handleDeleteStudy(study.id)}
              />
            ))}
            
            {studies.length === 0 && (
              <Card className="p-8 text-center col-span-full border-dashed">
                <Microscope className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-medium mb-2">No studies yet</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first research study to get started
                </p>
                <Button onClick={handleCreateStudy} disabled={creating} className="gap-2">
                  <Plus className="h-4 w-4" />
                  {creating ? 'Creating...' : 'Create Study'}
                </Button>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
