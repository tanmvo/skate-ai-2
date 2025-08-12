import useSWR from 'swr';

interface DatabaseMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  timestamp: string;
}

interface AISDKMessage {
  id: string;
  role: 'user' | 'assistant';
  parts: Array<{ type: 'text'; text: string }>;
  createdAt: Date;
}

async function fetchMessages(studyId: string, chatId: string): Promise<AISDKMessage[]> {
  const response = await fetch(`/api/studies/${studyId}/chats/${chatId}/messages`);
  
  if (!response.ok) {
    throw new Error(`Failed to fetch messages: ${response.status}`);
  }
  
  const dbMessages: DatabaseMessage[] = await response.json();
  
  // Transform to AI SDK format
  return dbMessages.map((msg) => ({
    id: msg.id,
    role: msg.role.toLowerCase() as 'user' | 'assistant',
    parts: [{ type: 'text', text: msg.content }],
    createdAt: new Date(msg.timestamp),
  }));
}

export function useMessages(studyId: string, chatId: string | null) {
  const { data: messages, error, isLoading, mutate } = useSWR(
    chatId ? [`/api/studies/${studyId}/chats/${chatId}/messages`, studyId, chatId] : null,
    () => chatId ? fetchMessages(studyId, chatId) : null,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      errorRetryCount: 2,
      // Cache messages for 5 minutes when switching between chats
      dedupingInterval: 300000,
    }
  );

  return {
    messages: messages || [],
    isLoading,
    error,
    mutate,
  };
}