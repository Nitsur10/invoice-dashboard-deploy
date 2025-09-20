'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import {
  defaultInvoiceFilters,
  InvoiceFiltersState,
  InvoiceSavedViewPayload,
  InvoiceStatusFilter,
} from '@/types/invoice-filters';

interface InvoiceFiltersContextValue {
  filters: InvoiceFiltersState;
  setFilters: (updater: InvoiceFiltersState | ((prev: InvoiceFiltersState) => InvoiceFiltersState)) => void;
  reset: () => void;
  applyQuickStatus: (status: InvoiceStatusFilter) => void;
  removeStatus: (status: InvoiceStatusFilter) => void;
  toggleStatus: (status: InvoiceStatusFilter) => void;
  toggleCategory: (category: string) => void;
  toggleVendor: (vendor: string) => void;
  setSearch: (value: string) => void;
  setDateRange: (range: { start?: string; end?: string }) => void;
  setAmountRange: (range?: { min?: number; max?: number }) => void;
  applySavedView: (view: InvoiceSavedViewPayload) => void;
}

const InvoiceFiltersContext = createContext<InvoiceFiltersContextValue | undefined>(undefined);

export function InvoiceFiltersProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFiltersState] = useState<InvoiceFiltersState>(defaultInvoiceFilters);

  const updateFilters = useCallback(
    (updater: InvoiceFiltersState | ((prev: InvoiceFiltersState) => InvoiceFiltersState)) => {
      setFiltersState((prev) => (typeof updater === 'function' ? (updater as (prev: InvoiceFiltersState) => InvoiceFiltersState)(prev) : updater));
    },
    []
  );

  const value = useMemo<InvoiceFiltersContextValue>(
    () => ({
      filters,
      setFilters: updateFilters,
      reset: () => setFiltersState(defaultInvoiceFilters),
      applyQuickStatus: (status) => {
        setFiltersState((prev) => {
          if (prev.statuses.includes(status)) return prev;
          return { ...prev, statuses: [...prev.statuses, status], savedViewId: undefined };
        });
      },
      removeStatus: (status) => {
        setFiltersState((prev) => ({
          ...prev,
          statuses: prev.statuses.filter((existing) => existing !== status),
          savedViewId: undefined,
        }));
      },
      toggleStatus: (status) => {
        setFiltersState((prev) => {
          const exists = prev.statuses.includes(status);
          return {
            ...prev,
            statuses: exists ? prev.statuses.filter((value) => value !== status) : [...prev.statuses, status],
            savedViewId: undefined,
          };
        });
      },
      toggleCategory: (category) => {
        setFiltersState((prev) => {
          const exists = prev.categories.includes(category);
          return {
            ...prev,
            categories: exists ? prev.categories.filter((value) => value !== category) : [...prev.categories, category],
            savedViewId: undefined,
          };
        });
      },
      toggleVendor: (vendor) => {
        setFiltersState((prev) => {
          const exists = prev.vendors.includes(vendor);
          return {
            ...prev,
            vendors: exists ? prev.vendors.filter((value) => value !== vendor) : [...prev.vendors, vendor],
            savedViewId: undefined,
          };
        });
      },
      setSearch: (value) => {
        setFiltersState((prev) => ({ ...prev, search: value, savedViewId: undefined }));
      },
      setDateRange: (range) => {
        setFiltersState((prev) => {
          const nextRange = {
            start: range.start ?? undefined,
            end: range.end ?? undefined,
          };

          if (!nextRange.start && !nextRange.end) {
            return { ...prev, dateRange: undefined, savedViewId: undefined };
          }

          return { ...prev, dateRange: nextRange, savedViewId: undefined };
        });
      },
      setAmountRange: (range) => {
        setFiltersState((prev) => ({
          ...prev,
          amountRange: range && (range.min !== undefined || range.max !== undefined)
            ? { min: range.min, max: range.max }
            : undefined,
          savedViewId: undefined,
        }));
      },
      applySavedView: (view) => {
        setFiltersState({
          ...defaultInvoiceFilters,
          ...view.filters,
          statuses: view.filters.statuses ?? [],
          categories: view.filters.categories ?? [],
          vendors: view.filters.vendors ?? [],
          savedViewId: view.id,
        });
      },
    }),
    [filters, updateFilters]
  );

  return <InvoiceFiltersContext.Provider value={value}>{children}</InvoiceFiltersContext.Provider>;
}

export function useInvoiceFilters(): InvoiceFiltersContextValue {
  const context = useContext(InvoiceFiltersContext);
  if (!context) {
    throw new Error('useInvoiceFilters must be used within an InvoiceFiltersProvider');
  }
  return context;
}

export type {
  InvoiceFiltersState,
  InvoiceSavedViewPayload,
  InvoiceStatusFilter,
} from '@/types/invoice-filters';

export { defaultInvoiceFilters } from '@/types/invoice-filters';
