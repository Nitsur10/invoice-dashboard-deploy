/**
 * Custom hook for chat functionality
 * Manages conversation state and message sending
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  invoiceContext?: string[];
  actionTaken?: any;
  timestamp: string;
  metadata?: any;
}

export interface Conversation {
  id: string;
  userId: string;
  userEmail?: string;
  title?: string;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
  archived: boolean;
  messageCount?: number;
}

interface SendMessageParams {
  conversationId: string;
  message: string;
  context?: any;
}

interface ExecuteActionParams {
  conversationId: string;
  messageId: string;
  actionType: 'status_update' | 'note_added';
  params: any;
}

/**
 * Hook for managing a single conversation
 */
export function useConversation(conversationId?: string) {
  const queryClient = useQueryClient();
  
  // Fetch conversation with messages
  const { data, isLoading, error } = useQuery({
    queryKey: ['conversation', conversationId],
    queryFn: async () => {
      if (!conversationId) return null;
      
      const response = await fetch(`/api/chat/conversations/${conversationId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch conversation');
      }
      return response.json();
    },
    enabled: !!conversationId,
  });
  
  const conversation = data?.conversation;
  const messages = data?.messages || [];
  
  return {
    conversation,
    messages,
    isLoading,
    error,
  };
}

/**
 * Hook for managing conversations list
 */
export function useConversations() {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['conversations'],
    queryFn: async () => {
      const response = await fetch('/api/chat/conversations');
      if (!response.ok) {
        throw new Error('Failed to fetch conversations');
      }
      return response.json();
    },
  });
  
  const createConversation = useMutation({
    mutationFn: async (params: { title?: string; metadata?: any }) => {
      const response = await fetch('/api/chat/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create conversation');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
  
  const archiveConversation = useMutation({
    mutationFn: async (conversationId: string) => {
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to archive conversation');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });
  
  return {
    conversations: data?.conversations || [],
    isLoading,
    error,
    createConversation: createConversation.mutateAsync,
    archiveConversation: archiveConversation.mutateAsync,
  };
}

/**
 * Hook for sending messages
 */
export function useSendMessage() {
  const queryClient = useQueryClient();
  
  const [isSending, setIsSending] = useState(false);
  const [pendingAction, setPendingAction] = useState<any>(null);
  
  const sendMessage = useCallback(async ({ conversationId, message, context }: SendMessageParams) => {
    setIsSending(true);
    setPendingAction(null);
    
    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId, message, context }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to send message');
      }
      
      const result = await response.json();
      
      // Invalidate conversation to refresh messages
      queryClient.invalidateQueries({ queryKey: ['conversation', conversationId] });
      
      // If action requires confirmation, store it
      if (result.requiresConfirmation) {
        setPendingAction({
          messageId: result.assistantMessage.id,
          conversationId,
        });
      }
      
      return result;
    } catch (error) {
      console.error('Send message error:', error);
      throw error;
    } finally {
      setIsSending(false);
    }
  }, [queryClient]);
  
  const executeAction = useMutation({
    mutationFn: async (params: ExecuteActionParams) => {
      const response = await fetch('/api/chat/actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      
      if (!response.ok) {
        throw new Error('Failed to execute action');
      }
      
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['conversation', variables.conversationId] });
      setPendingAction(null);
    },
  });
  
  return {
    sendMessage,
    isSending,
    executeAction: executeAction.mutateAsync,
    pendingAction,
    clearPendingAction: () => setPendingAction(null),
  };
}

/**
 * Hook for managing chat state (open/closed, active conversation)
 */
export function useChatState() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  
  const openChat = useCallback((conversationId?: string) => {
    setIsOpen(true);
    if (conversationId) {
      setActiveConversationId(conversationId);
    }
  }, []);
  
  const closeChat = useCallback(() => {
    setIsOpen(false);
    if (!isExpanded) {
      // Only clear conversation if not expanded (full page)
      setActiveConversationId(null);
    }
  }, [isExpanded]);
  
  const toggleExpanded = useCallback(() => {
    setIsExpanded(prev => !prev);
  }, []);
  
  return {
    isOpen,
    isExpanded,
    activeConversationId,
    openChat,
    closeChat,
    toggleExpanded,
    setActiveConversationId,
  };
}
