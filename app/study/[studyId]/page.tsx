"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { DocumentPanel } from "@/components/document/DocumentPanel";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { useRouter, useParams } from "next/navigation";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const mockStudyData = {
  "1": { name: "User Onboarding", documentCount: 5 },
  "2": { name: "Competitor Analysis", documentCount: 8 },
};

export default function StudyPage() {
  const params = useParams();
  const router = useRouter();
  const [documents, setDocuments] = useState([]);
  const [messages, setMessages] = useState([]);
  
  const studyId = params.studyId as string;
  const studyData = mockStudyData[studyId as keyof typeof mockStudyData] || { 
    name: "New study", 
    documentCount: 0 
  };

  const handleBackToStudies = () => {
    router.push("/");
  };

  const handleFileUpload = (files: File[]) => {
    console.log("Files to upload:", files);
  };

  const handleSendMessage = (message: string) => {
    console.log("Message to send:", message);
  };

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
                    {studyData.name}
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

      <main className="flex-1 flex overflow-hidden">
        <div className="w-[30%] min-w-[300px] border-r bg-muted/30">
          <DocumentPanel 
            documents={documents}
            onFileUpload={handleFileUpload}
            studyId={studyId}
          />
        </div>
        
        <div className="flex-1">
          <ChatPanel 
            messages={messages}
            onSendMessage={handleSendMessage}
            studyId={studyId}
          />
        </div>
      </main>
    </div>
  );
}