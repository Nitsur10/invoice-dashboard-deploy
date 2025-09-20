'use client';

import { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  DollarSign,
  Building,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Eye,
  ExternalLink,
  MoreHorizontal,
} from 'lucide-react';
import { Invoice } from '@/lib/types';
import { formatDateForSydney, isDueSoon, isOverdue } from '@/lib/data';

export type BoardStatus = 'pending' | 'in_review' | 'approved' | 'paid' | 'overdue';

interface KanbanCardProps {
  invoice: Invoice;
}

function KanbanCard({ invoice }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: invoice.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    try {
      return formatDateForSydney(dateString).split(' ')[0];
    } catch {
      return dateString;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`mb-3 cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
    >
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {invoice.invoiceNumber}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 truncate">
                  {invoice.subject}
                </p>
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                <MoreHorizontal className="h-3 w-3" />
              </Button>
            </div>

            {/* Vendor */}
            <div className="flex items-center space-x-2">
              <Building className="h-3 w-3 text-slate-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                {invoice.vendor}
              </span>
            </div>

            {/* Amount */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-3 w-3 text-slate-500" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(invoice.amount)}
                </span>
              </div>
              
              {invoice.dueDate && (
                <div className={`flex items-center space-x-1 ${
                  isOverdue(invoice.dueDate) 
                    ? 'text-red-600 dark:text-red-400' 
                    : isDueSoon(invoice.dueDate)
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-500'
                }`}>
                  <Calendar className="h-3 w-3" />
                  <span className="text-xs">{formatDate(invoice.dueDate)}</span>
                </div>
              )}
            </div>

            {/* Category Badge */}
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {invoice.category.replace('_', ' ')}
              </Badge>
              
              <div className="flex items-center space-x-1">
                {invoice.oneDriveLink && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Eye className="h-3 w-3" />
                </Button>
              </div>
            </div>

            {/* Due Status Indicator */}
            {invoice.dueDate && isOverdue(invoice.dueDate) && (
              <div className="flex items-center space-x-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-md px-2 py-1">
                <AlertTriangle className="h-3 w-3" />
                <span className="text-xs font-medium">Overdue</span>
              </div>
            )}
            
            {invoice.dueDate && isDueSoon(invoice.dueDate) && !isOverdue(invoice.dueDate) && (
              <div className="flex items-center space-x-1 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded-md px-2 py-1">
                <Clock className="h-3 w-3" />
                <span className="text-xs font-medium">Due Soon</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

interface KanbanColumnProps {
  column: {
    id: BoardStatus;
    title: string;
  };
  invoices: Invoice[];
}

function KanbanColumnComponent({ column, invoices }: KanbanColumnProps) {
  const getColumnColor = (status: BoardStatus) => {
    switch (status) {
      case 'pending':
        return 'border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/10';
      case 'in_review':
        return 'border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10';
      case 'approved':
        return 'border-purple-200 dark:border-purple-800 bg-purple-50/30 dark:bg-purple-950/10';
      case 'paid':
        return 'border-emerald-200 dark:border-emerald-800 bg-emerald-50/30 dark:bg-emerald-950/10';
      case 'overdue':
        return 'border-red-200 dark:border-red-800 bg-red-50/30 dark:bg-red-950/10';
      default:
        return 'border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-950/10';
    }
  };

  const getStatusIcon = (status: BoardStatus) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-emerald-600" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-slate-600" />;
    }
  };

  return (
    <div className={`rounded-lg border-2 border-dashed p-4 min-h-96 ${getColumnColor(column.id)}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {getStatusIcon(column.id)}
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            {column.title}
          </h3>
          <Badge variant="outline" className="ml-2">
            {invoices.length}
          </Badge>
        </div>
      </div>

      <SortableContext items={invoices.map(i => i.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">
          {invoices.map((invoice) => (
            <KanbanCard key={invoice.id} invoice={invoice} />
          ))}
        </div>
      </SortableContext>

      {invoices.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-sm text-center">No invoices in this status</p>
        </div>
      )}
    </div>
  );
}

interface KanbanBoardProps {
  invoices: Invoice[];
  onInvoiceUpdate: (invoiceId: string, newStatus: BoardStatus) => void;
}

export function KanbanBoard({ invoices, onInvoiceUpdate }: KanbanBoardProps) {
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const columns: { id: BoardStatus; title: string }[] = [
    { id: 'pending', title: 'Pending', invoices: [] },
    { id: 'in_review', title: 'In Review', invoices: [] },
    { id: 'approved', title: 'Approved', invoices: [] },
    { id: 'paid', title: 'Paid', invoices: [] },
    { id: 'overdue', title: 'Overdue', invoices: [] },
  ];

  // Group invoices by status
  const groupedInvoices = invoices.reduce((acc, invoice) => {
    const status = (invoice.status ?? invoice.paymentStatus ?? 'pending') as BoardStatus;
    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(invoice);
    return acc;
  }, {} as Record<BoardStatus, Invoice[]>);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (!over) return;

    const activeInvoiceId = active.id as string;
    const overColumnId = over.id as BoardStatus;

    // Find which column the invoice is currently in
    const activeInvoice = invoices.find(inv => inv.id === activeInvoiceId);
    if (!activeInvoice) return;

    const currentStatus = (activeInvoice.status ?? activeInvoice.paymentStatus ?? 'pending') as BoardStatus;
    
    if (currentStatus !== overColumnId) {
      onInvoiceUpdate(activeInvoiceId, overColumnId);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {columns.map((column) => (
          <KanbanColumnComponent
            key={column.id}
            column={column}
            invoices={groupedInvoices[column.id] || []}
          />
        ))}
      </div>
    </DndContext>
  );
}
