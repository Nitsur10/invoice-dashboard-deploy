'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Calendar,
  Filter,
  X,
  CalendarDays,
  DollarSign,
  Building,
  FileText,
  RefreshCw
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Invoice, PaymentStatus, InvoiceCategory } from '@/lib/types';
import { formatDateForSydney } from '@/lib/data';

interface InvoiceFiltersProps {
  invoices: Invoice[];
  onFilterChange: (filteredInvoices: Invoice[]) => void;
}

export function InvoiceFilters({ invoices, onFilterChange }: InvoiceFiltersProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<PaymentStatus | 'all'>('all');
  const [selectedCategory, setSelectedCategory] = useState<InvoiceCategory | 'all'>('all');
  const [selectedVendor, setSelectedVendor] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [minAmount, setMinAmount] = useState<string>('');
  const [maxAmount, setMaxAmount] = useState<string>('');

  // Get unique vendors for the dropdown
  const uniqueVendors = Array.from(new Set(invoices.map(inv => inv.vendor))).sort();

  // Apply filters
  useEffect(() => {
    let filtered = invoices;

    // Text search
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(invoice =>
        invoice.vendor.toLowerCase().includes(search) ||
        invoice.invoiceNumber.toLowerCase().includes(search) ||
        invoice.subject.toLowerCase().includes(search) ||
        invoice.fromName.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (selectedStatus !== 'all') {
      filtered = filtered.filter(invoice => {
        const status = invoice.paymentStatus || 'pending';
        return status === selectedStatus;
      });
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(invoice => invoice.category === selectedCategory);
    }

    // Vendor filter
    if (selectedVendor !== 'all') {
      filtered = filtered.filter(invoice => invoice.vendor === selectedVendor);
    }

    // Date range filter
    if (startDate || endDate) {
      filtered = filtered.filter(invoice => {
        const invoiceDate = new Date(invoice.receivedDate);
        
        if (startDate && invoiceDate < startDate) return false;
        if (endDate && invoiceDate > endDate) return false;
        
        return true;
      });
    }

    // Amount range filter
    if (minAmount || maxAmount) {
      const min = minAmount ? parseFloat(minAmount) : 0;
      const max = maxAmount ? parseFloat(maxAmount) : Infinity;
      
      filtered = filtered.filter(invoice => 
        invoice.amount >= min && invoice.amount <= max
      );
    }

    onFilterChange(filtered);
  }, [
    invoices,
    searchTerm,
    selectedStatus,
    selectedCategory,
    selectedVendor,
    startDate,
    endDate,
    minAmount,
    maxAmount,
    onFilterChange
  ]);

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedStatus('all');
    setSelectedCategory('all');
    setSelectedVendor('all');
    setStartDate(null);
    setEndDate(null);
    setMinAmount('');
    setMaxAmount('');
  };

  const setQuickDateRange = (range: 'thisMonth' | 'lastMonth' | 'thisQuarter' | 'july2025Onwards') => {
    const now = new Date();
    
    switch (range) {
      case 'thisMonth':
        setStartDate(new Date(now.getFullYear(), now.getMonth(), 1));
        setEndDate(new Date(now.getFullYear(), now.getMonth() + 1, 0));
        break;
      case 'lastMonth':
        setStartDate(new Date(now.getFullYear(), now.getMonth() - 1, 1));
        setEndDate(new Date(now.getFullYear(), now.getMonth(), 0));
        break;
      case 'thisQuarter':
        const quarter = Math.floor(now.getMonth() / 3);
        setStartDate(new Date(now.getFullYear(), quarter * 3, 1));
        setEndDate(new Date(now.getFullYear(), (quarter + 1) * 3, 0));
        break;
      case 'july2025Onwards':
        setStartDate(new Date(2025, 6, 1)); // July 1st, 2025
        setEndDate(null);
        break;
    }
  };

  const activeFiltersCount = [
    searchTerm,
    selectedStatus !== 'all' ? selectedStatus : '',
    selectedCategory !== 'all' ? selectedCategory : '',
    selectedVendor !== 'all' ? selectedVendor : '',
    startDate,
    endDate,
    minAmount,
    maxAmount
  ].filter(filter => filter).length;

  return (
    <Card className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-slate-200/50 dark:border-slate-700/50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Invoice Filters</span>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {activeFiltersCount} active
              </Badge>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters}>
              <X className="h-4 w-4 mr-1" />
              Clear All
            </Button>
          )}
        </CardTitle>
        <CardDescription>
          Filter invoices by date range, amount, vendor, status, and more
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search */}
        <div className="space-y-2">
          <Label htmlFor="search">Search Invoices</Label>
          <Input
            id="search"
            placeholder="Search by vendor, invoice number, or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </div>

        {/* Date Range */}
        <div className="space-y-4">
          <Label>Date Range</Label>
          
          {/* Quick Date Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDateRange('july2025Onwards')}
              className="text-xs"
            >
              July 2025 onwards
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDateRange('thisMonth')}
              className="text-xs"
            >
              This Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDateRange('lastMonth')}
              className="text-xs"
            >
              Last Month
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQuickDateRange('thisQuarter')}
              className="text-xs"
            >
              This Quarter
            </Button>
          </div>

          {/* Custom Date Pickers */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>From Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {startDate ? startDate.toLocaleDateString() : 'Select start date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DatePicker
                    selected={startDate}
                    onChange={(date) => setStartDate(date)}
                    inline
                    showYearDropdown
                    showMonthDropdown
                    dropdownMode="select"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>To Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarDays className="mr-2 h-4 w-4" />
                    {endDate ? endDate.toLocaleDateString() : 'Select end date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <DatePicker
                    selected={endDate}
                    onChange={(date) => setEndDate(date)}
                    inline
                    showYearDropdown
                    showMonthDropdown
                    dropdownMode="select"
                    minDate={startDate || undefined}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </div>

        {/* Amount Range */}
        <div className="space-y-2">
          <Label>Amount Range (AUD)</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm text-slate-600 dark:text-slate-400">Min Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  type="number"
                  placeholder="0.00"
                  value={minAmount}
                  onChange={(e) => setMinAmount(e.target.value)}
                  className="pl-8"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm text-slate-600 dark:text-slate-400">Max Amount</Label>
              <div className="relative">
                <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  type="number"
                  placeholder="No limit"
                  value={maxAmount}
                  onChange={(e) => setMaxAmount(e.target.value)}
                  className="pl-8"
                  min="0"
                  step="0.01"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>Payment Status</Label>
            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as PaymentStatus | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={selectedCategory} onValueChange={(value) => setSelectedCategory(value as InvoiceCategory | 'all')}>
              <SelectTrigger>
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="standard_pdf">Standard PDF</SelectItem>
                <SelectItem value="xero_with_pdf">Xero with PDF</SelectItem>
                <SelectItem value="xero_links_only">Xero Links Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Vendor</Label>
            <Select value={selectedVendor} onValueChange={setSelectedVendor}>
              <SelectTrigger>
                <SelectValue placeholder="All Vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Vendors</SelectItem>
                {uniqueVendors.map((vendor) => (
                  <SelectItem key={vendor} value={vendor}>
                    {vendor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Active Filters:</Label>
            <div className="flex flex-wrap gap-2">
              {searchTerm && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <span>Search: "{searchTerm}"</span>
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSearchTerm('')} />
                </Badge>
              )}
              {selectedStatus !== 'all' && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <span>Status: {selectedStatus}</span>
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedStatus('all')} />
                </Badge>
              )}
              {selectedCategory !== 'all' && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <span>Category: {selectedCategory}</span>
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedCategory('all')} />
                </Badge>
              )}
              {selectedVendor !== 'all' && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <span>Vendor: {selectedVendor}</span>
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedVendor('all')} />
                </Badge>
              )}
              {startDate && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <span>From: {startDate.toLocaleDateString()}</span>
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setStartDate(null)} />
                </Badge>
              )}
              {endDate && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <span>To: {endDate.toLocaleDateString()}</span>
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setEndDate(null)} />
                </Badge>
              )}
              {minAmount && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <span>Min: ${minAmount}</span>
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setMinAmount('')} />
                </Badge>
              )}
              {maxAmount && (
                <Badge variant="secondary" className="flex items-center space-x-1">
                  <span>Max: ${maxAmount}</span>
                  <X className="h-3 w-3 cursor-pointer" onClick={() => setMaxAmount('')} />
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}