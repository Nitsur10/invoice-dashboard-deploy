'use client';

import React from 'react';
import { ChatPanel } from './chat-panel';
import { Button } from '@/components/ui/button';
import { MessageSquare } from 'lucide-react';
import { useChatState } from '@/hooks/use-chat';
import { motion, AnimatePresence } from 'framer-motion';

function ChatWidgetInner() {
  const { isOpen, activeConversationId, openChat, closeChat } = useChatState();
  
  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              onClick={() => openChat()}
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
              title="Open Chat Assistant"
            >
              <MessageSquare className="h-6 w-6" />
              {/* Badge for unread messages (optional) */}
              {/* <span className="absolute -top-1 -right-1 h-5 w-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
                3
              </span> */}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Chat Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', duration: 0.3 }}
            className="fixed bottom-6 right-6 z-50 w-96 h-[600px] max-h-[calc(100vh-3rem)] rounded-lg shadow-2xl overflow-hidden border border-gray-200 dark:border-gray-700"
          >
            <ChatPanel
              conversationId={activeConversationId || undefined}
              onClose={closeChat}
              onExpand={() => {
                // Navigate to full chat page
                window.location.href = '/chat';
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Mobile: Full screen overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={closeChat}
          />
        )}
      </AnimatePresence>
    </>
  );
}

// Error boundary wrapper
export class ChatWidget extends React.Component<{}, { hasError: boolean }> {
  constructor(props: {}) {
    super(props);
    this.state = { hasError: false };
  }
  
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ChatWidget error:', error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return null; // Gracefully hide the widget on error
    }
    
    return <ChatWidgetInner />;
  }
}
