import { useState, useEffect, useCallback } from 'react';

interface Chat {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  studyId: string;
  userId: string;
  _count: {
    messages: number;
  };
}

export function useChatManager(studyId: string) {
  const [chats, setChats] = useState<Chat[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSwitching, setIsSwitching] = useState(false);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [titleGenerationChatId, setTitleGenerationChatId] = useState<string | null>(null);

  const loadChats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch existing chats
      const response = await fetch(`/api/studies/${studyId}/chats`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }
      
      const studyChats = await response.json();
      
      // If no chats exist, create a default one
      if (studyChats.length === 0) {
        const createResponse = await fetch(`/api/studies/${studyId}/chats`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ title: 'New Chat' }),
        });

        if (!createResponse.ok) {
          throw new Error('Failed to create default chat');
        }

        const defaultChat = await createResponse.json();
        setChats([defaultChat]);
        setCurrentChatId(defaultChat.id);
      } else {
        // Set current chat to the first one (most recent)
        setChats(studyChats);
        setCurrentChatId(studyChats[0].id);
      }
    } catch (err) {
      console.error('Error loading chats:', err);
      setError('Failed to load chats');
    } finally {
      setLoading(false);
    }
  }, [studyId]);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  const createNewChat = useCallback(async () => {
    try {
      setIsCreatingNew(true);
      setError(null);

      const response = await fetch(`/api/studies/${studyId}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title: 'New Chat' }),
      });

      if (!response.ok) {
        throw new Error('Failed to create chat');
      }

      const newChat = await response.json();
      
      // Add to chats list and switch to it
      setChats(prev => [newChat, ...prev]);
      setCurrentChatId(newChat.id);

      return newChat;
    } catch (err) {
      console.error('Error creating new chat:', err);
      setError('Failed to create new chat');
      throw err;
    } finally {
      setIsCreatingNew(false);
    }
  }, [studyId]);

  const switchToChat = useCallback(async (chatId: string) => {
    if (chatId === currentChatId) return;
    
    try {
      setIsSwitching(true);
      setError(null);
      
      // Optimistic update
      setCurrentChatId(chatId);
      
      // Small delay to show switching state
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (err) {
      console.error('Error switching chat:', err);
      setError('Failed to switch chat');
      throw err;
    } finally {
      setIsSwitching(false);
    }
  }, [currentChatId]);

  const updateChatTitle = useCallback(async (chatId: string, title: string) => {
    try {
      const response = await fetch(`/api/studies/${studyId}/chats/${chatId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        throw new Error('Failed to update chat title');
      }

      const updatedChat = await response.json();
      
      // Update chat in list
      setChats(prev => prev.map(chat => 
        chat.id === chatId ? updatedChat : chat
      ));

      return updatedChat;
    } catch (err) {
      console.error('Error updating chat title:', err);
      throw err;
    }
  }, [studyId]);

  const generateTitle = useCallback(async (chatId: string) => {
    try {
      setIsGeneratingTitle(true);
      setTitleGenerationChatId(chatId);
      setError(null);

      const response = await fetch(`/api/studies/${studyId}/chats/${chatId}/generate-title`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const updatedChat = await response.json();
      
      // Update chat in list
      setChats(prev => prev.map(chat => 
        chat.id === chatId ? updatedChat : chat
      ));

      return updatedChat;
    } catch (err) {
      console.error('Error generating title:', err);
      // Don't set error state for title generation failures - they should be silent
      throw err;
    } finally {
      setIsGeneratingTitle(false);
      setTitleGenerationChatId(null);
    }
  }, [studyId]);

  const generateTitleInBackground = useCallback(async (chatId: string) => {
    try {
      await generateTitle(chatId);
    } catch (err) {
      // Silent failure for background title generation
      console.warn('Background title generation failed:', err);
    }
  }, [generateTitle]);

  const getCurrentChat = useCallback(() => {
    return chats.find(chat => chat.id === currentChatId) || null;
  }, [chats, currentChatId]);

  return {
    chats,
    currentChatId,
    currentChat: getCurrentChat(),
    loading,
    error,
    isSwitching,
    isCreatingNew,
    isGeneratingTitle,
    titleGenerationChatId,
    createNewChat,
    switchToChat,
    updateChatTitle,
    generateTitle,
    generateTitleInBackground,
    refetchChats: loadChats,
  };
}