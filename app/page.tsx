"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Microscope } from "lucide-react";
import { StudyCard } from "@/components/study/StudyCard";
import { useState } from "react";

const mockStudies = [
  {
    id: "1",
    name: "User Onboarding",
    createdAt: new Date("2024-01-15"),
    author: "tanmvo",
    documentCount: 5,
  },
  {
    id: "2", 
    name: "Competitor Analysis",
    createdAt: new Date("2024-01-10"),
    author: "tanmvo",
    documentCount: 8,
  },
];

export default function StudiesPage() {
  const [studies, setStudies] = useState(mockStudies);

  const handleCreateStudy = () => {
    const newStudy = {
      id: Date.now().toString(),
      name: "New study",
      createdAt: new Date(),
      author: "tanmvo",
      documentCount: 0,
    };
    setStudies([newStudy, ...studies]);
  };

  const handleDeleteStudy = (studyId: string) => {
    setStudies(studies.filter(study => study.id !== studyId));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Microscope className="h-6 w-6" />
            <h1 className="text-xl font-semibold">Skate AI</h1>
          </div>
          <Button onClick={handleCreateStudy} className="gap-2">
            <Plus className="h-4 w-4" />
            Create
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-2">My Studies</h2>
          <p className="text-muted-foreground">
            Organize your research documents and chat with AI to discover insights
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studies.map((study) => (
            <StudyCard
              key={study.id}
              study={study}
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
              <Button onClick={handleCreateStudy} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Study
              </Button>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
