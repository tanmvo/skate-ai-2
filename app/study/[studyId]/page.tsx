"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { DocumentPanel } from "@/components/document/DocumentPanel";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { useRouter, useParams } from "next/navigation";
import { StudyProvider, useStudyContext } from "@/lib/contexts/StudyContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function StudyPageContent() {
  const router = useRouter();
  const { study, isLoading, error } = useStudyContext();

  const handleBackToStudies = () => {
    router.push("/");
  };

  const handleFileUpload = (file: { id: string; fileName: string; status: string }) => {
    console.log("File uploaded:", file);
    // The StudyContext will automatically refresh data
  };

  // Handle errors by redirecting to dashboard
  if (error && error.message === 'Study not found') {
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleBackToStudies}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Studies
            </Button>
            
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-2">
                <span className="text-lg">📚</span>
                <span className="font-medium text-lg">Study:</span>
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2 text-lg font-medium">
                    {isLoading ? 'Loading...' : study?.name || 'Unknown Study'}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem>Rename study</DropdownMenuItem>
                  <DropdownMenuItem>Export chat history</DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    Delete study
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {isLoading ? (
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading study...</p>
          </div>
        </main>
      ) : study ? (
        <main className="flex-1 flex overflow-hidden">
          <div className="w-[30%] min-w-[300px] border-r bg-muted/30">
            <DocumentPanel 
              documents={study.documents}
              onFileUploaded={handleFileUpload}
              studyId={study.id}
            />
          </div>
          
          <div className="flex-1">
            <ChatPanel 
              studyId={study.id}
            />
          </div>
        </main>
      ) : (
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Study not found</p>
            <Button onClick={handleBackToStudies}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Studies
            </Button>
          </div>
        </main>
      )}
    </div>
  );
}

export default function StudyPage() {
  const params = useParams();
  const studyId = params.studyId as string;

  return (
    <StudyProvider studyId={studyId}>
      <StudyPageContent />
    </StudyProvider>
  );
}