'use client';

import React, { useState } from 'react';
import { Conversation } from '@/hooks/use-chat';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MessageSquare, Search, Trash2, Plus } from 'lucide-react';
import { safeFormatDistanceToNow } from '@/lib/date-utils';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onArchiveConversation: (id: string) => void;
}

export function ConversationList({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onArchiveConversation,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      conv.title?.toLowerCase().includes(query) ||
      conv.userEmail?.toLowerCase().includes(query)
    );
  });
  
  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Conversations
          </h2>
          <Button
            onClick={onNewConversation}
            size="sm"
            className="h-8 w-8 p-0"
            title="New conversation"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="pl-9"
          />
        </div>
      </div>
      
      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-4 text-center">
            <MessageSquare className="h-12 w-12 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </p>
            <Button
              onClick={onNewConversation}
              size="sm"
              variant="outline"
              className="mt-4"
            >
              Start a conversation
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredConversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors relative group ${
                  activeConversationId === conv.id
                    ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate mb-1">
                      {conv.title || 'New conversation'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {conv.messageCount || 0} message{conv.messageCount !== 1 ? 's' : ''}
                      {safeFormatDistanceToNow(conv.updatedAt) && (
                        <>
                          {' · '}
                          {safeFormatDistanceToNow(conv.updatedAt)}
                        </>
                      )}
                    </p>
                  </div>
                  
                  {/* Archive button (shown on hover) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Archive this conversation?')) {
                        onArchiveConversation(conv.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-opacity"
                    title="Archive conversation"
                  >
                    <Trash2 className="h-4 w-4 text-gray-400" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
