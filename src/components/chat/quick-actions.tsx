'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, AlertCircle, TrendingUp } from 'lucide-react';

interface QuickActionsProps {
  onSelectAction: (query: string) => void;
}

const QUICK_ACTIONS = [
  {
    id: 'overdue',
    label: 'Show overdue invoices',
    query: 'Show me all overdue invoices',
    icon: AlertCircle,
    color: 'text-red-600',
  },
  {
    id: 'pending-total',
    label: 'Total pending amount',
    query: 'What is the total amount of pending invoices?',
    icon: DollarSign,
    color: 'text-yellow-600',
  },
  {
    id: 'last-30-days',
    label: 'Last 30 days summary',
    query: 'Give me a summary of invoices from the last 30 days',
    icon: Clock,
    color: 'text-blue-600',
  },
  {
    id: 'top-vendors',
    label: 'Top vendors',
    query: 'Show me the top 5 vendors by total amount',
    icon: TrendingUp,
    color: 'text-green-600',
  },
];

export function QuickActions({ onSelectAction }: QuickActionsProps) {
  return (
    <div className="border-t border-gray-200 dark:border-gray-700 p-3 bg-gray-50 dark:bg-gray-800/50">
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">
        Quick Actions
      </p>
      <div className="grid grid-cols-2 gap-2">
        {QUICK_ACTIONS.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              variant="outline"
              size="sm"
              onClick={() => onSelectAction(action.query)}
              className="justify-start text-left h-auto py-2 px-3"
            >
              <Icon className={`h-4 w-4 mr-2 flex-shrink-0 ${action.color}`} />
              <span className="text-xs truncate">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
