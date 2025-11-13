'use client';

import React, { useState } from 'react';
import { ConversationList } from './conversation-list';
import { ChatPanel } from './chat-panel';
import { useConversations, useChatState } from '@/hooks/use-chat';
import { toast } from 'sonner';

export function ChatPage() {
  const {
    conversations,
    isLoading,
    createConversation,
    archiveConversation,
  } = useConversations();
  
  const { activeConversationId, setActiveConversationId } = useChatState();
  
  const handleNewConversation = async () => {
    try {
      const newConv = await createConversation({});
      setActiveConversationId(newConv.id);
      toast.success('New conversation started');
    } catch (error) {
      toast.error('Failed to create conversation');
    }
  };
  
  const handleArchiveConversation = async (id: string) => {
    try {
      await archiveConversation(id);
      if (activeConversationId === id) {
        setActiveConversationId(null);
      }
      toast.success('Conversation archived');
    } catch (error) {
      toast.error('Failed to archive conversation');
    }
  };
  
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Conversation List Sidebar */}
      <div className="w-80 flex-shrink-0 hidden md:block">
        <ConversationList
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={setActiveConversationId}
          onNewConversation={handleNewConversation}
          onArchiveConversation={handleArchiveConversation}
        />
      </div>
      
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversationId ? (
          <ChatPanel
            conversationId={activeConversationId}
            className="h-full"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
            <div className="max-w-md text-center px-6">
              <div className="mb-6 p-6 bg-blue-100 dark:bg-blue-900/30 rounded-full inline-block">
                <svg
                  className="h-16 w-16 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
              </div>
              
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                Welcome to Invoice Assistant
              </h1>
              
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Your AI-powered helper for managing invoices. Start a conversation to:
              </p>
              
              <div className="grid gap-3 text-left mb-8">
                <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">1</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Search & Filter</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Find invoices by vendor, status, amount, or date</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">2</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Get Insights</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">View summaries, totals, and analytics</p>
                  </div>
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-lg">
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 dark:text-blue-400 font-semibold">3</span>
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Take Action</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Update status, add notes with confirmation</p>
                  </div>
                </div>
              </div>
              
              <button
                onClick={handleNewConversation}
                disabled={isLoading}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                Start Conversation
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

