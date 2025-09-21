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
  CollisionDetection,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
  UniqueIdentifier,
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
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

// Temporary type for mock data compatibility
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

interface Column {
  id: BoardStatus;
  title: string;
  items: MockInvoice[];
}

interface JiraKanbanCardProps {
  invoice: MockInvoice;
  isDragging?: boolean;
}

function JiraKanbanCard({ invoice, isDragging = false }: JiraKanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    isDragging: draggableIsDragging,
  } = useDraggable({
    id: invoice.id,
    data: {
      type: 'invoice',
      invoice,
    },
  });

  const style = {
    opacity: draggableIsDragging ? 0.5 : 1,
    cursor: draggableIsDragging ? 'grabbing' : 'grab',
  };

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
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="jira-card mb-3"
      data-dragging={draggableIsDragging}
    >
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all duration-200">
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

interface JiraKanbanColumnProps {
  column: Column;
  isOverContainer?: boolean;
}

function JiraKanbanColumn({ column, isOverContainer }: JiraKanbanColumnProps) {
  const { setNodeRef } = useDroppable({
    id: column.id,
  });
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
      className={`
        jira-column rounded-xl border-2 border-dashed p-4 min-h-96 relative
        ${getColumnColor(column.id)}
        ${isOverContainer ? 'drop-target' : ''}
      `}
    >
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          {getStatusIcon(column.id)}
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            {column.title}
          </h3>
          <Badge variant="outline" className="ml-2">
            {column.items.length}
          </Badge>
        </div>
      </div>

      {/* Draggable Cards */}
      <div className="space-y-2">
        {column.items.map((invoice) => (
          <JiraKanbanCard
            key={invoice.id}
            invoice={invoice}
          />
        ))}
      </div>

      {/* Empty State */}
      {column.items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 text-slate-400 dark:text-slate-500">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-sm text-center">No invoices in this status</p>
        </div>
      )}
    </div>
  );
}

interface JiraKanbanBoardProps {
  invoices: MockInvoice[];
  onInvoiceUpdate: (invoiceId: string, newStatus: BoardStatus) => void;
}

export function JiraKanbanBoard({ invoices, onInvoiceUpdate }: JiraKanbanBoardProps) {
  const [columns, setColumns] = useState<Column[]>([
    { id: 'pending', title: 'Pending', items: [] },
    { id: 'in_review', title: 'In Review', items: [] },
    { id: 'approved', title: 'Approved', items: [] },
    { id: 'paid', title: 'Paid', items: [] },
    { id: 'overdue', title: 'Overdue', items: [] },
  ]);

  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null);
  const [overId, setOverId] = useState<UniqueIdentifier | null>(null);

  // Update columns when invoices change
  useEffect(() => {
    const newColumns = columns.map(col => ({ ...col, items: [] }));

    invoices.forEach(invoice => {
      const status = (typeof invoice.status === 'string' ? invoice.status.toLowerCase() : invoice.status) as BoardStatus ||
                    (typeof invoice.paymentStatus === 'string' ? invoice.paymentStatus.toLowerCase() : invoice.paymentStatus) as BoardStatus ||
                    'pending';

      const columnIndex = newColumns.findIndex(col => col.id === status);
      if (columnIndex !== -1) {
        newColumns[columnIndex].items.push(invoice);
      }
    });

    setColumns(newColumns);
  }, [invoices]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
      },
    })
  );

  // Simplified collision detection - just detect column drops
  const collisionDetectionStrategy: CollisionDetection = useCallback((args) => {
    // Use closestCenter but prioritize column containers
    const collisions = closestCenter(args);

    if (collisions.length > 0) {
      // Check if we're over a column
      const columnCollision = collisions.find(collision =>
        columns.some(col => col.id === collision.id)
      );

      if (columnCollision) {
        return [columnCollision];
      }
    }

    return collisions;
  }, [columns]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;

    // Only update visual indicators, don't move cards during drag
    setOverId(over ? over.id : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    setActiveId(null);
    setOverId(null);

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id;

    // Check if we're dropping on a different column
    const isColumnDrop = columns.some(col => col.id === overId);

    if (isColumnDrop) {
      const newStatus = overId as BoardStatus;

      // Find the current status of the dragged invoice
      const draggedInvoice = invoices.find(inv => inv.id === activeId);
      if (!draggedInvoice) return;

      const currentStatus = (typeof draggedInvoice.status === 'string' ? draggedInvoice.status.toLowerCase() : draggedInvoice.status) as BoardStatus ||
                           (typeof draggedInvoice.paymentStatus === 'string' ? draggedInvoice.paymentStatus.toLowerCase() : draggedInvoice.paymentStatus) as BoardStatus ||
                           'pending';

      // Only update if status actually changed
      if (currentStatus !== newStatus) {
        onInvoiceUpdate(activeId, newStatus);
      }
    }
  };

  const findContainer = (id: UniqueIdentifier) => {
    if (columns.some(col => col.id === id)) {
      return id as BoardStatus;
    }

    return columns.find(col =>
      col.items.some(item => item.id === id)
    )?.id;
  };

  const getActiveInvoice = () => {
    if (!activeId) return null;

    for (const column of columns) {
      const item = column.items.find(item => item.id === activeId);
      if (item) return item;
    }
    return null;
  };

  const activeInvoice = getActiveInvoice();

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetectionStrategy}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {columns.map((column) => (
          <JiraKanbanColumn
            key={column.id}
            column={column}
            isOverContainer={overId === column.id}
          />
        ))}
      </div>

      <DragOverlay
        adjustScale={false}
        style={{
          transformOrigin: 'top left',
        }}
      >
        {activeInvoice ? (
          <div className="jira-drag-overlay">
            <JiraKanbanCard invoice={activeInvoice} isDragging />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}