'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  pointerWithin,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';
import { snapCenterToCursor } from '@dnd-kit/modifiers';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Clock,
  DollarSign,
  Building,
  Calendar,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  MoreHorizontal,
} from 'lucide-react';
import { formatDateForSydney, isDueSoon, isOverdue } from '@/lib/data';

export type BoardStatus = 'pending' | 'in_review' | 'approved' | 'paid' | 'overdue';

interface MockInvoice {
  id: string;
  invoiceNumber: string;
  vendor?: string;
  vendorName?: string;
  subject?: string;
  description?: string;
  amount: number;
  status: BoardStatus | string;
  paymentStatus?: BoardStatus | string;
  dueDate: string | Date;
  category: string;
  oneDriveLink?: string | null;
  invoiceUrl?: string;
}

interface PerfectJiraCardProps {
  invoice: MockInvoice;
  isBeingDragged: boolean;
}

function PerfectJiraCard({ invoice, isBeingDragged }: PerfectJiraCardProps) {
  const cardId = `card:${String(invoice.id || invoice.invoiceNumber || 'unknown')}`;
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: cardId,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: 'AUD'
    }).format(amount);
  };

  const formatDate = (date: string | Date) => {
    if (!date) return '-';
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString('en-AU', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return typeof date === 'string' ? date : date.toLocaleDateString();
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      data-card-id={invoice.id}
      className={`mb-3 relative cursor-grab active:cursor-grabbing transition-all duration-150 ease-out ${
        isBeingDragged
          ? 'opacity-40'
          : 'hover:shadow-lg hover:-translate-y-0.5'
      }`}
      style={{
        transform: 'translateZ(0)', // Hardware acceleration
      }}
    >

      {/* Always visible card content */}
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm">
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                  {invoice.invoiceNumber}
                </h4>
                <p
                  className="text-xs text-slate-600 dark:text-slate-400 mt-1 line-clamp-2"
                  title={invoice.description || invoice.subject}
                >
                  {invoice.description || invoice.subject}
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
                {invoice.vendorName || invoice.vendor}
              </span>
            </div>

            {/* Amount and Due Date */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <DollarSign className="h-3 w-3 text-slate-500" />
                <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {formatCurrency(invoice.amount)}
                </span>
              </div>

              {invoice.dueDate && (
                <div className={`flex items-center space-x-1 ${
                  isOverdue(typeof invoice.dueDate === 'string' ? invoice.dueDate : invoice.dueDate.toISOString())
                    ? 'text-red-600 dark:text-red-400'
                    : isDueSoon(typeof invoice.dueDate === 'string' ? invoice.dueDate : invoice.dueDate.toISOString())
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-500'
                }`}>
                  <Calendar className="h-3 w-3" />
                  <span className="text-xs">{formatDate(invoice.dueDate)}</span>
                </div>
              )}
            </div>

            {/* Supplier and Invoice Link */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building className="h-3 w-3 text-slate-500" />
                <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                  {invoice.vendorName || invoice.vendor || 'Unknown Supplier'}
                </span>
              </div>

              <div className="flex items-center space-x-1">
                {(invoice.invoiceUrl || invoice.oneDriveLink) && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 hover:bg-slate-100 dark:hover:bg-slate-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      const url = invoice.invoiceUrl || invoice.oneDriveLink;
                      if (url) {
                        window.open(url, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    title="View Invoice"
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>

            {/* Due Status Indicators */}
            {invoice.dueDate && isOverdue(typeof invoice.dueDate === 'string' ? invoice.dueDate : invoice.dueDate.toISOString()) && (
              <div className="flex items-center space-x-1 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded-md px-2 py-1">
                <AlertTriangle className="h-3 w-3" />
                <span className="text-xs font-medium">Overdue</span>
              </div>
            )}

            {invoice.dueDate && isDueSoon(typeof invoice.dueDate === 'string' ? invoice.dueDate : invoice.dueDate.toISOString()) && !isOverdue(typeof invoice.dueDate === 'string' ? invoice.dueDate : invoice.dueDate.toISOString()) && (
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

interface PerfectJiraColumnProps {
  id: BoardStatus;
  title: string;
  invoices: MockInvoice[];
  isHighlighted: boolean;
  draggedInvoiceId: string | null;
}

function PerfectJiraColumn({ id, title, invoices, isHighlighted, draggedInvoiceId }: PerfectJiraColumnProps) {
  const { setNodeRef } = useDroppable({ id });

  const getColumnColor = (status: BoardStatus) => {
    switch (status) {
      case 'pending':
        return 'border-blue-200 dark:border-blue-700 bg-blue-50/30 dark:bg-blue-950/10';
      case 'in_review':
        return 'border-amber-200 dark:border-amber-700 bg-amber-50/30 dark:bg-amber-950/10';
      case 'approved':
        return 'border-purple-200 dark:border-purple-700 bg-purple-50/30 dark:bg-purple-950/10';
      case 'paid':
        return 'border-emerald-200 dark:border-emerald-700 bg-emerald-50/30 dark:bg-emerald-950/10';
      case 'overdue':
        return 'border-red-200 dark:border-red-700 bg-red-50/30 dark:bg-red-950/10';
      default:
        return 'border-slate-200 dark:border-slate-700 bg-slate-50/30 dark:bg-slate-950/10';
    }
  };

  const getStatusIcon = (status: BoardStatus) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />;
      case 'overdue':
        return <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-300" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-blue-600 dark:text-blue-300" />;
      case 'in_review':
        return <Clock className="h-4 w-4 text-amber-600 dark:text-amber-300" />;
      case 'approved':
        return <Clock className="h-4 w-4 text-purple-600 dark:text-purple-300" />;
      default:
        return <Clock className="h-4 w-4 text-slate-600 dark:text-slate-300" />;
    }
  };

  return (
    <div
      ref={setNodeRef}
      data-column-id={id}
      className={`
        rounded-xl border-2 border-dashed p-4 min-h-96 relative
        transition-all duration-200 ease-out transform-gpu
        ${getColumnColor(id)}
        ${isHighlighted
          ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 shadow-lg ring-2 ring-blue-400/40'
          : ''
        }
      `}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {getStatusIcon(id)}
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          <Badge
            variant="outline"
            className="ml-2 bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-200 dark:border-slate-700"
          >
            {invoices.length}
          </Badge>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {invoices.map((invoice, idx) => (
          <PerfectJiraCard
            key={`${String(invoice.id || invoice.invoiceNumber || 'unknown')}-${id}-${idx}`}
            invoice={invoice}
            isBeingDragged={draggedInvoiceId === String(invoice.id || invoice.invoiceNumber || 'unknown')}
          />
        ))}
      </div>

      {/* Empty State */}
      {invoices.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-sm text-center text-slate-600 dark:text-slate-400">No invoices</p>
        </div>
      )}

      {/* Drop Indicator */}
      {isHighlighted && (
        <div className="absolute inset-0 rounded-xl border-2 border-blue-500 bg-blue-500/20 dark:bg-blue-500/30 pointer-events-none">
          <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 text-center">
            <div className="inline-block bg-blue-600 dark:bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium shadow-lg">
              Drop here
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface PerfectJiraKanbanProps {
  invoices: MockInvoice[];
  onInvoiceUpdate: (invoiceId: string, newStatus: BoardStatus) => void | Promise<void>;
}

export function PerfectJiraKanban({ invoices, onInvoiceUpdate }: PerfectJiraKanbanProps) {
  const [draggedInvoiceId, setDraggedInvoiceId] = useState<string | null>(null);
  const [highlightedColumnId, setHighlightedColumnId] = useState<BoardStatus | null>(null);
  

  const columns: { id: BoardStatus; title: string }[] = [
    { id: 'overdue', title: 'Overdue' },
    { id: 'pending', title: 'Pending' },
    { id: 'in_review', title: 'In Review' },
    { id: 'approved', title: 'Approved' },
    { id: 'paid', title: 'Paid' },
  ];

  // Group invoices by status
  const groupedInvoices = invoices.reduce((acc, invoice) => {
    const status = (typeof invoice.status === 'string' ? invoice.status.toLowerCase() : invoice.status) as BoardStatus ||
                  (typeof invoice.paymentStatus === 'string' ? invoice.paymentStatus.toLowerCase() : invoice.paymentStatus) as BoardStatus ||
                  'pending';

    if (!acc[status]) {
      acc[status] = [];
    }
    acc[status].push(invoice);
    return acc;
  }, {} as Record<BoardStatus, MockInvoice[]>);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Small distance for immediate response
      },
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const raw = String(event.active.id || '');
    const normalized = raw.startsWith('card:') ? raw.replace('card:', '') : raw;
    setDraggedInvoiceId(normalized);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setHighlightedColumnId((over?.id as BoardStatus) ?? null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    const raw = String(active.id || '');
    const invoiceId = raw.startsWith('card:') ? raw.replace('card:', '') : raw;

    // reset drag UI state
    setDraggedInvoiceId(null);
    setHighlightedColumnId(null);


    if (!over) return;
    const targetColumnId = over.id as BoardStatus;

    // Find current status
    const invoice = invoices.find(inv => String(inv.id || inv.invoiceNumber || 'unknown') === invoiceId);
    if (!invoice) return;

    const currentStatus = (typeof invoice.status === 'string' ? invoice.status.toLowerCase() : invoice.status) as BoardStatus ||
                         (typeof invoice.paymentStatus === 'string' ? invoice.paymentStatus.toLowerCase() : invoice.paymentStatus) as BoardStatus ||
                         'pending';

    // Only update if status changed
    if (currentStatus !== targetColumnId) {
      try {
        await onInvoiceUpdate(invoiceId, targetColumnId);
      } catch (error) {
        console.error('Failed to update invoice status:', error);
      }
    }
  };

  const getDraggedInvoice = () => {
    if (!draggedInvoiceId) return null;
    return invoices.find(inv => String(inv.id || inv.invoiceNumber || 'unknown') === draggedInvoiceId) || null;
  };

  const draggedInvoice = getDraggedInvoice();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={(args) => {
        const pointerCollisions = pointerWithin(args);
        if (pointerCollisions.length > 0) return pointerCollisions;
        return closestCenter(args);
      }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {columns.map((column) => (
          <PerfectJiraColumn
            key={column.id}
            id={column.id}
            title={column.title}
            invoices={groupedInvoices[column.id] || []}
            isHighlighted={highlightedColumnId === column.id}
            draggedInvoiceId={draggedInvoiceId}
          />
        ))}
      </div>

      {/* Professional Drag Overlay */}
      <DragOverlay
        adjustScale={false}
        dropAnimation={null}
        modifiers={[snapCenterToCursor]}
      >
        {draggedInvoice && (
          <div
            className="opacity-95 transform-gpu pointer-events-none"
            style={{
              transform: 'rotate(8deg) scale(1.05)',
              filter: 'drop-shadow(0 20px 40px rgba(0,0,0,0.3))',
              zIndex: 9999,
            }}
          >
            <Card className="bg-white dark:bg-slate-800 border-2 border-blue-500 shadow-2xl">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {draggedInvoice.invoiceNumber}
                  </h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">
                    {draggedInvoice.description || draggedInvoice.subject}
                  </p>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-3 w-3 text-slate-500" />
                    <span className="text-sm font-semibold">
                      {new Intl.NumberFormat('en-AU', {
                        style: 'currency',
                        currency: 'AUD'
                      }).format(draggedInvoice.amount)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}