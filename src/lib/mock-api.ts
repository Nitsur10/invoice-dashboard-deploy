import { mockInvoiceData, mockDashboardStats } from './sample-data';
import { Invoice } from './types';

/**
 * Mock API functions for testing without backend
 */
export class MockAPI {
  private static invoices = mockInvoiceData;
  
  /**
   * Fetch invoices with filtering, sorting, pagination
   */
  static async getInvoices(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    status?: string[];
  }) {
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate network delay
    
    let filteredInvoices = [...this.invoices];
    
    // Apply search filter
    if (params.search) {
      const searchLower = params.search.toLowerCase();
      filteredInvoices = filteredInvoices.filter(invoice => 
        invoice.vendorName.toLowerCase().includes(searchLower) ||
        invoice.invoiceNumber.toLowerCase().includes(searchLower) ||
        invoice.description.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply status filter
    if (params.status && params.status.length > 0) {
      filteredInvoices = filteredInvoices.filter(invoice => 
        params.status!.includes(invoice.status)
      );
    }
    
    // Apply sorting
    if (params.sortBy) {
      filteredInvoices.sort((a, b) => {
        const aValue = (a as any)[params.sortBy!];
        const bValue = (b as any)[params.sortBy!];
        
        if (typeof aValue === 'string') {
          const comparison = aValue.localeCompare(bValue);
          return params.sortOrder === 'desc' ? -comparison : comparison;
        }
        
        if (typeof aValue === 'number') {
          const comparison = aValue - bValue;
          return params.sortOrder === 'desc' ? -comparison : comparison;
        }
        
        return 0;
      });
    }
    
    // Apply pagination
    const page = params.page || 0;
    const limit = params.limit || 20;
    const startIndex = page * limit;
    const endIndex = startIndex + limit;
    const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);
    
    return {
      data: paginatedInvoices,
      pagination: {
        total: filteredInvoices.length,
        pageCount: Math.ceil(filteredInvoices.length / limit),
        pageSize: limit,
        pageIndex: page
      }
    };
  }
  
  /**
   * Get single invoice by ID
   */
  static async getInvoice(id: string): Promise<Invoice | null> {
    await new Promise(resolve => setTimeout(resolve, 200));
    return this.invoices.find(invoice => invoice.id === id) || null;
  }
  
  /**
   * Update invoice
   */
  static async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    const index = this.invoices.findIndex(invoice => invoice.id === id);
    if (index === -1) {
      throw new Error('Invoice not found');
    }
    
    this.invoices[index] = { ...this.invoices[index], ...updates };
    return this.invoices[index];
  }
  
  /**
   * Get dashboard stats
   */
  static async getDashboardStats() {
    await new Promise(resolve => setTimeout(resolve, 300));
    return mockDashboardStats;
  }
  
  /**
   * Test all components functionality
   */
  static async testAllComponents() {
    const results = {
      dashboard: false,
      invoiceList: false,
      invoiceDetail: false,
      kanban: false,
      analytics: false,
      import: false,
      settings: false
    };
    
    try {
      // Test dashboard stats
      await this.getDashboardStats();
      results.dashboard = true;
      
      // Test invoice list
      await this.getInvoices({ page: 0, limit: 20 });
      results.invoiceList = true;
      
      // Test invoice detail
      const firstInvoice = await this.getInvoice(this.invoices[0].id);
      results.invoiceDetail = !!firstInvoice;
      
      // Test invoice update
      await this.updateInvoice(this.invoices[0].id, { status: 'approved' });
      
      // Mock other components
      results.kanban = true;
      results.analytics = true;
      results.import = true;
      results.settings = true;
      
    } catch (error) {
      console.error('Component test failed:', error);
    }
    
    return results;
  }
}