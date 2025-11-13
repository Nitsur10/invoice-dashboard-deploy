'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageBubble } from './message-bubble';
import { QuickActions } from './quick-actions';
import { ActionConfirmation } from './action-confirmation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useConversation, useSendMessage, useConversations } from '@/hooks/use-chat';
import { useVoiceRecording } from '@/hooks/use-voice-recording';
import { Send, Maximize2, X, Loader2, MessageSquarePlus, Mic, MicOff } from 'lucide-react';
import { toast } from 'sonner';

interface ChatPanelProps {
  conversationId?: string;
  onClose?: () => void;
  onExpand?: () => void;
  className?: string;
}

export function ChatPanel({ conversationId, onClose, onExpand, className = '' }: ChatPanelProps) {
  const [message, setMessage] = useState('');
  const [localConversationId, setLocalConversationId] = useState(conversationId);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingActionDetails, setPendingActionDetails] = useState<any>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [inputMethod, setInputMethod] = useState<'text' | 'voice'>('text');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const { conversations, createConversation } = useConversations();
  const { messages, isLoading: isLoadingMessages } = useConversation(localConversationId);
  const { sendMessage: sendMsg, isSending, executeAction, pendingAction } = useSendMessage();
  const { 
    state: recordingState, 
    startRecording, 
    stopRecording, 
    cancelRecording, 
    isSupported: isVoiceSupported,
    error: recordingError,
    recordingDuration
  } = useVoiceRecording();
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Handle recording errors
  useEffect(() => {
    if (recordingError) {
      toast.error(recordingError);
    }
  }, [recordingError]);
  
  // Create conversation if none exists
  const ensureConversation = async () => {
    if (!localConversationId) {
      try {
        const newConv = await createConversation({});
        setLocalConversationId(newConv.id);
        return newConv.id;
      } catch (error) {
        toast.error('Failed to create conversation');
        throw error;
      }
    }
    return localConversationId;
  };
  
  const handleSendMessage = async () => {
    if (!message.trim() || isSending) return;
    
    const messageText = message.trim();
    const method = inputMethod;
    setMessage('');
    setInputMethod('text'); // Reset for next message
    
    try {
      const convId = await ensureConversation();
      await sendMsg({
        conversationId: convId,
        message: messageText,
        context: {
          input_method: method,
        },
      });
    } catch (error) {
      toast.error('Failed to send message');
      setMessage(messageText); // Restore message on error
    }
  };
  
  const handleQuickAction = async (query: string) => {
    setMessage(query);
    // Auto-send quick actions
    setTimeout(() => handleSendMessage(), 100);
  };
  
  const handleConfirmAction = async () => {
    if (!pendingAction || !pendingActionDetails) return;
    
    try {
      await executeAction({
        conversationId: pendingAction.conversationId,
        messageId: pendingAction.messageId,
        actionType: pendingActionDetails.type,
        params: pendingActionDetails.params,
      });
      
      toast.success('Action executed successfully');
      setShowConfirmation(false);
      setPendingActionDetails(null);
    } catch (error) {
      toast.error('Failed to execute action');
    }
  };
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleVoiceInput = async () => {
    if (recordingState === 'recording') {
      // Stop recording and transcribe
      try {
        console.log('Stopping recording...');
        const audioBlob = await stopRecording();
        
        console.log('Audio blob received:', audioBlob);
        
        if (!audioBlob) {
          toast.error('Failed to capture audio. Please try again.');
          return;
        }
        
        if (audioBlob.size === 0) {
          toast.error('No audio recorded. Please speak into your microphone.');
          return;
        }
        
        console.log('Audio blob size:', audioBlob.size, 'bytes');
        setIsTranscribing(true);
        
        // Send audio to transcription endpoint
        const formData = new FormData();
        formData.append('audio', audioBlob, 'recording.webm');
        
        console.log('Sending to transcription API...');
        const response = await fetch('/api/chat/transcribe', {
          method: 'POST',
          body: formData,
        });
        
        console.log('Transcription response status:', response.status);
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Transcription failed' }));
          throw new Error(error.error || 'Transcription failed');
        }
        
        const result = await response.json();
        console.log('Transcription result:', result);
        
        if (!result.text || result.text.trim().length === 0) {
          toast.error('No speech detected. Please speak clearly and try again.');
          return;
        }
        
        // Populate input with transcribed text
        setMessage(result.text);
        setInputMethod('voice');
        toast.success('Voice transcribed! You can edit before sending.');
        
      } catch (error: any) {
        console.error('Transcription error:', error);
        toast.error(error.message || 'Failed to transcribe audio. Please try again.');
      } finally {
        setIsTranscribing(false);
      }
    } else {
      // Start recording
      console.log('Starting recording...');
      try {
        await startRecording();
        console.log('Recording started successfully');
      } catch (error) {
        console.error('Failed to start recording:', error);
        toast.error('Failed to start recording. Please check microphone permissions.');
      }
    }
  };
  
  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-900 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="flex items-center gap-2">
          <MessageSquarePlus className="h-5 w-5" />
          <div>
            <h3 className="font-semibold text-sm">Invoice Assistant</h3>
            <p className="text-xs opacity-90">Ask me anything about your invoices</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {onExpand && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onExpand}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
              title="Expand to full page"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-white hover:bg-white/20 h-8 w-8 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoadingMessages ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full">
              <MessageSquarePlus className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Welcome to Invoice Assistant
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 max-w-sm">
              I can help you search invoices, get summaries, check status, and more. Try one of the quick actions below or ask me anything!
            </p>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                onInvoiceClick={(id) => {
                  // TODO: Open invoice details
                  toast.info(`Invoice: ${id}`);
                }}
              />
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      {/* Quick Actions */}
      {messages.length === 0 && <QuickActions onSelectAction={handleQuickAction} />}
      
      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-gray-800/50">
        {/* Recording Banner */}
        {recordingState === 'recording' && (
          <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-red-700 dark:text-red-300">
                  Recording: {Math.floor(recordingDuration / 1000)}s
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={cancelRecording}
                  size="sm"
                  variant="ghost"
                  className="h-8 text-red-600 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/30"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleVoiceInput}
                  size="sm"
                  className="h-8 bg-red-600 hover:bg-red-700 text-white"
                >
                  <MicOff className="h-4 w-4 mr-2" />
                  Stop & Transcribe
                </Button>
              </div>
            </div>
          </div>
        )}
        
        {/* Transcribing Banner */}
        {isTranscribing && (
          <div className="mb-3 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                Transcribing your voice... Please wait
              </span>
            </div>
          </div>
        )}
        
        <div className="flex items-end gap-2">
          {/* Voice Input Button */}
          {isVoiceSupported && recordingState === 'idle' && !isTranscribing && (
            <Button
              onClick={handleVoiceInput}
              disabled={isSending}
              size="sm"
              variant="outline"
              className="h-10 px-3"
              title="Click to start voice recording"
            >
              <Mic className="h-4 w-4" />
            </Button>
          )}
          
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={recordingState === 'recording' ? 'Recording in progress...' : 'Ask about your invoices...'}
            disabled={isSending || recordingState === 'recording' || isTranscribing}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!message.trim() || isSending || recordingState === 'recording' || isTranscribing}
            size="sm"
            className="h-10 px-4"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {recordingState === 'recording' 
              ? 'Speak clearly into your microphone' 
              : isTranscribing 
                ? 'Converting speech to text...' 
                : 'Press Enter to send, Shift+Enter for new line'}
          </p>
          {isVoiceSupported && recordingState === 'idle' && !isTranscribing && (
            <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
              <Mic className="h-3 w-3" />
              Click mic to record
            </p>
          )}
        </div>
      </div>
      
      {/* Action Confirmation Dialog */}
      <ActionConfirmation
        isOpen={showConfirmation}
        onClose={() => setShowConfirmation(false)}
        onConfirm={handleConfirmAction}
        action={pendingActionDetails}
        isExecuting={isSending}
      />
    </div>
  );
}
