'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
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
import { offset } from '@dnd-kit/modifiers';
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
  Eye,
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
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: invoice.id,
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
      const dateStr = typeof date === 'string' ? date : date.toISOString();
      return formatDateForSydney(dateStr).split(' ')[0];
    } catch {
      return typeof date === 'string' ? date : date.toLocaleDateString();
    }
  };

  return (
    <div
      data-card-id={invoice.id}
      className={`mb-3 relative transition-all duration-150 ease-out ${
        isBeingDragged
          ? 'opacity-40'
          : 'hover:shadow-lg hover:-translate-y-0.5'
      }`}
      style={{
        transform: 'translateZ(0)', // Hardware acceleration
      }}
    >
      {/* Drag handle - invisible overlay for dragging */}
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className="absolute inset-0 z-10 cursor-grab active:cursor-grabbing"
        style={{
          background: 'transparent',
        }}
      />

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
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 truncate">
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

            {/* Category and Actions */}
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-xs">
                {invoice.category.replace('_', ' ')}
              </Badge>

              <div className="flex items-center space-x-1">
                {(invoice.invoiceUrl || invoice.oneDriveLink) && (
                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Eye className="h-3 w-3" />
                </Button>
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
    <div
      ref={setNodeRef}
      data-column-id={id}
      className={`
        rounded-xl border-2 border-dashed p-4 min-h-96 relative
        transition-all duration-200 ease-out transform-gpu
        ${getColumnColor(id)}
        ${isHighlighted
          ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 scale-[1.02] shadow-lg ring-2 ring-blue-400/30'
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
          <Badge variant="outline" className="ml-2">
            {invoices.length}
          </Badge>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-2">
        {invoices.map((invoice) => (
          <PerfectJiraCard
            key={invoice.id}
            invoice={invoice}
            isBeingDragged={draggedInvoiceId === invoice.id}
          />
        ))}
      </div>

      {/* Empty State */}
      {invoices.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-sm text-center">No invoices</p>
        </div>
      )}

      {/* Drop Indicator */}
      {isHighlighted && (
        <div className="absolute inset-0 rounded-xl border-2 border-blue-500 bg-blue-500/10 pointer-events-none">
          <div className="absolute inset-x-0 top-1/2 transform -translate-y-1/2 text-center">
            <div className="inline-block bg-blue-500 text-white px-3 py-1 rounded-full text-sm font-medium">
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
  onInvoiceUpdate: (invoiceId: string, newStatus: BoardStatus) => void;
}

export function PerfectJiraKanban({ invoices, onInvoiceUpdate }: PerfectJiraKanbanProps) {
  const [draggedInvoiceId, setDraggedInvoiceId] = useState<string | null>(null);
  const [highlightedColumnId, setHighlightedColumnId] = useState<BoardStatus | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null);

  const columns: { id: BoardStatus; title: string }[] = [
    { id: 'pending', title: 'Pending' },
    { id: 'in_review', title: 'In Review' },
    { id: 'approved', title: 'Approved' },
    { id: 'paid', title: 'Paid' },
    { id: 'overdue', title: 'Overdue' },
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
    setDraggedInvoiceId(event.active.id as string);

    // Calculate initial mouse offset within the card
    const draggedElement = document.querySelector(`[data-card-id="${event.active.id}"]`);
    if (draggedElement && event.activatorEvent) {
      const rect = draggedElement.getBoundingClientRect();
      const pointerEvent = event.activatorEvent as PointerEvent;

      const offsetX = pointerEvent.clientX - rect.left;
      const offsetY = pointerEvent.clientY - rect.top;

      setDragOffset({ x: offsetX, y: offsetY });
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    setHighlightedColumnId((over?.id as BoardStatus) ?? null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const invoiceId = active.id as string;

    // reset drag UI state
    setDraggedInvoiceId(null);
    setHighlightedColumnId(null);
    setDragOffset(null);
    
    if (!over) return;
    const targetColumnId = over.id as BoardStatus;

    // Find current status
    const invoice = invoices.find(inv => inv.id === invoiceId);
    if (!invoice) return;

    const currentStatus = (typeof invoice.status === 'string' ? invoice.status.toLowerCase() : invoice.status) as BoardStatus ||
                         (typeof invoice.paymentStatus === 'string' ? invoice.paymentStatus.toLowerCase() : invoice.paymentStatus) as BoardStatus ||
                         'pending';

    // Only update if status changed
    if (currentStatus !== targetColumnId) {
      onInvoiceUpdate(invoiceId, targetColumnId);
    }
  };

  const getDraggedInvoice = () => {
    if (!draggedInvoiceId) return null;
    return invoices.find(inv => inv.id === draggedInvoiceId) || null;
  };

  const draggedInvoice = getDraggedInvoice();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
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
        modifiers={dragOffset ? [offset({ x: -dragOffset.x, y: -dragOffset.y })] : undefined}
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