'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ChatMessage } from '@/hooks/use-chat';
import { safeFormatDistanceToNow } from '@/lib/date-utils';

interface MessageBubbleProps {
  message: ChatMessage;
  onInvoiceClick?: (invoiceId: string) => void;
}

export function MessageBubble({ message, onInvoiceClick }: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-lg px-4 py-3 ${
            isUser
              ? 'bg-blue-600 text-white'
              : isSystem
              ? 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
              : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  // Customize link rendering
                  a: ({ node, ...props }) => (
                    <a
                      {...props}
                      className="text-blue-600 dark:text-blue-400 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                    />
                  ),
                  // Customize code rendering
                  code: ({ node, className, children, ...props }) => {
                    const isInline = !className;
                    return isInline ? (
                      <code
                        className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded text-xs"
                        {...props}
                      >
                        {children}
                      </code>
                    ) : (
                      <code className={className} {...props}>
                        {children}
                      </code>
                    );
                  },
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
          
          {/* Invoice context indicators */}
          {message.invoiceContext && message.invoiceContext.length > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
              <p className="text-xs opacity-75 mb-1">Referenced invoices:</p>
              <div className="flex flex-wrap gap-1">
                {message.invoiceContext.slice(0, 5).map((invoiceId) => (
                  <button
                    key={invoiceId}
                    onClick={() => onInvoiceClick?.(invoiceId)}
                    className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded transition-colors"
                  >
                    {invoiceId.slice(0, 8)}...
                  </button>
                ))}
                {message.invoiceContext.length > 5 && (
                  <span className="text-xs opacity-75 px-2 py-1">
                    +{message.invoiceContext.length - 5} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Timestamp */}
        {safeFormatDistanceToNow(message.timestamp) && (
          <p className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${isUser ? 'text-right' : 'text-left'}`}>
            {safeFormatDistanceToNow(message.timestamp)}
          </p>
        )}
      </div>
    </div>
  );
}
