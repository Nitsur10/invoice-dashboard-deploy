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
  DragOverlay,
  DragStartEvent,
  DragOverEvent,
  DragMoveEvent,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import {
  useSortable,
} from '@dnd-kit/sortable';
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
import { formatDateForSydney, isDueSoon, isOverdue } from '@/lib/data';

export type BoardStatus = 'pending' | 'in_review' | 'approved' | 'paid' | 'overdue';

interface MockKanbanCardProps {
  invoice: MockInvoice;
}

function MockKanbanCard({ invoice }: MockKanbanCardProps) {
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
    transition: isDragging ? 'none' : transition || 'transform 200ms ease',
    zIndex: isDragging ? 1000 : 'auto',
    opacity: isDragging ? 0.3 : 1,
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
      className={`mb-3 kanban-card ${
        isDragging ? 'dragging' : ''
      }`}
    >
      <div
        {...listeners}
        className="touch-none w-full h-full"
      >
      <Card className="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-lg transition-all duration-200">
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

            {/* Category Badge */}
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

            {/* Due Status Indicator */}
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
    </div>
  );
}

interface MockKanbanColumnProps {
  column: {
    id: BoardStatus;
    title: string;
  };
  invoices: MockInvoice[];
  isDropTarget?: boolean;
}

function MockKanbanColumnComponent({ column, invoices, isDropTarget }: MockKanbanColumnProps) {
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

  const columnClasses = `rounded-xl border-2 border-dashed p-4 min-h-96 transition-all duration-200 drop-zone ${getColumnColor(column.id)} ${
    isDropTarget ? 'active' : ''
  }`;

  return (
    <div
      ref={setNodeRef}
      className={columnClasses}
      style={{ minHeight: '400px' }}
    >
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
            <MockKanbanCard
              key={invoice.id}
              invoice={invoice}
            />
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

interface MockKanbanBoardProps {
  invoices: MockInvoice[];
  onInvoiceUpdate: (invoiceId: string, newStatus: BoardStatus) => void;
}

const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
};

export function MockKanbanBoard({ invoices, onInvoiceUpdate }: MockKanbanBoardProps) {
  const [draggedInvoice, setDraggedInvoice] = useState<MockInvoice | null>(null);
  const [activeDropZone, setActiveDropZone] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 3,
        tolerance: 5,
        delay: 100,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    setDraggedInvoice(null);
    setActiveDropZone(null);
    setIsDragging(false);

    if (!over) return;

    const activeInvoiceId = active.id as string;
    const overColumnId = over.id as BoardStatus;

    // Find which column the invoice is currently in
    const activeInvoice = invoices.find(inv => inv.id === activeInvoiceId);
    if (!activeInvoice) return;

    const currentStatus = (typeof activeInvoice.status === 'string' ? activeInvoice.status.toLowerCase() : activeInvoice.status) as BoardStatus ||
                         (typeof activeInvoice.paymentStatus === 'string' ? activeInvoice.paymentStatus.toLowerCase() : activeInvoice.paymentStatus) as BoardStatus ||
                         'pending';

    if (currentStatus !== overColumnId) {
      // Smooth update with slight delay for animation
      setTimeout(() => {
        onInvoiceUpdate(activeInvoiceId, overColumnId);
      }, 100);
    }
  }

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const activeInvoice = invoices.find(inv => inv.id === active.id);
    setDraggedInvoice(activeInvoice || null);
    setIsDragging(true);
  }

  function handleDragOver(event: DragOverEvent) {
    const { over } = event;

    // Immediate visual feedback for better UX
    requestAnimationFrame(() => {
      setActiveDropZone(over ? over.id as string : null);
    });
  }

  function handleDragCancel() {
    setDraggedInvoice(null);
    setActiveDropZone(null);
    setIsDragging(false);
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        {columns.map((column) => (
          <MockKanbanColumnComponent
            key={column.id}
            column={column}
            invoices={groupedInvoices[column.id] || []}
            isDropTarget={activeDropZone === column.id}
          />
        ))}
      </div>

      <DragOverlay
        adjustScale={false}
        dropAnimation={dropAnimationConfig}
        style={{
          transformOrigin: 'center',
        }}
        className="z-50"
      >
        {draggedInvoice ? (
          <div
            className="drag-overlay pointer-events-none"
            style={{
              width: '280px',
              transform: 'rotate(8deg) scale(1.05)',
              transformOrigin: 'center center',
            }}
          >
            <Card className="bg-white dark:bg-slate-800 border-2 border-blue-500 shadow-2xl">
              <CardContent className="p-3">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {draggedInvoice.invoiceNumber}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 truncate">
                        {draggedInvoice.description || draggedInvoice.subject}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Building className="h-3 w-3 text-slate-500" />
                    <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                      {draggedInvoice.vendorName || draggedInvoice.vendor}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <DollarSign className="h-3 w-3 text-slate-500" />
                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
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
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}