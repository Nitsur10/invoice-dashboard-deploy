'use client';

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

interface ActionConfirmationProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  action: {
    type: 'status_update' | 'note_added';
    invoiceNumber?: string;
    vendor?: string;
    oldValue?: string;
    newValue?: string;
  } | null;
  isExecuting?: boolean;
}

export function ActionConfirmation({
  isOpen,
  onClose,
  onConfirm,
  action,
  isExecuting = false,
}: ActionConfirmationProps) {
  if (!action) return null;
  
  const isStatusUpdate = action.type === 'status_update';
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600" />
            Confirm Action
          </DialogTitle>
          <DialogDescription>
            Please review and confirm this action before proceeding.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Invoice details */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              Invoice Details
            </p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Invoice:</span>
                <span className="font-medium">{action.invoiceNumber || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Vendor:</span>
                <span className="font-medium">{action.vendor || 'Unknown'}</span>
              </div>
            </div>
          </div>
          
          {/* Action details */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">
              {isStatusUpdate ? 'Status Change' : 'Note Addition'}
            </p>
            
            {isStatusUpdate ? (
              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded-full font-medium">
                  {action.oldValue}
                </span>
                <span className="text-gray-400">→</span>
                <span className="px-3 py-1 bg-blue-600 text-white rounded-full font-medium">
                  {action.newValue}
                </span>
              </div>
            ) : (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <p className="italic">&ldquo;{action.newValue}&rdquo;</p>
              </div>
            )}
          </div>
          
          {/* Warning */}
          <div className="flex items-start gap-2 text-xs text-amber-600 dark:text-amber-500">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>
              This action will be logged and can be audited. Make sure the details are correct before confirming.
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isExecuting}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isExecuting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isExecuting ? 'Executing...' : 'Confirm'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
