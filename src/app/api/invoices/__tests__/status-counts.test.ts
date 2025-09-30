/**
 * @jest-environment node
 */
import { describe, it, expect, beforeAll } from '@jest/globals';

describe('GET /api/invoices - Status Counts', () => {
  const baseUrl = process.env.TEST_API_URL || 'http://localhost:3007';

  it('should return statusCounts in response', async () => {
    const response = await fetch(`${baseUrl}/api/invoices?page=0&limit=20`);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('statusCounts');
    expect(data.statusCounts).toHaveProperty('pending');
    expect(data.statusCounts).toHaveProperty('paid');
    expect(data.statusCounts).toHaveProperty('overdue');
  });

  it('should return correct status counts across all pages', async () => {
    // Fetch page 1
    const page1Response = await fetch(`${baseUrl}/api/invoices?page=0&limit=20`);
    const page1Data = await page1Response.json();

    // Fetch page 2
    const page2Response = await fetch(`${baseUrl}/api/invoices?page=1&limit=20`);
    const page2Data = await page2Response.json();

    // Status counts should be the same regardless of page
    expect(page1Data.statusCounts).toEqual(page2Data.statusCounts);
  });

  it('should return status counts that match total count', async () => {
    const response = await fetch(`${baseUrl}/api/invoices?page=0&limit=20`);
    const data = await response.json();

    const sumOfStatusCounts =
      data.statusCounts.pending +
      data.statusCounts.paid +
      data.statusCounts.overdue;

    // Sum of status counts should equal total pagination count
    expect(sumOfStatusCounts).toBe(data.pagination.total);
  });

  it('should return filtered status counts when filters applied', async () => {
    // Get all pending invoices
    const pendingResponse = await fetch(`${baseUrl}/api/invoices?status=pending`);
    const pendingData = await pendingResponse.json();

    // When filtered to pending, only pending count should be non-zero
    expect(pendingData.statusCounts.pending).toBeGreaterThan(0);
    expect(pendingData.statusCounts.paid).toBe(0);
    expect(pendingData.statusCounts.overdue).toBe(0);
  });

  it('should return numeric status counts (not strings)', async () => {
    const response = await fetch(`${baseUrl}/api/invoices?page=0&limit=20`);
    const data = await response.json();

    expect(typeof data.statusCounts.pending).toBe('number');
    expect(typeof data.statusCounts.paid).toBe('number');
    expect(typeof data.statusCounts.overdue).toBe('number');
  });

  it('should return zero counts when no data matches', async () => {
    // Use a date range that has no invoices
    const response = await fetch(
      `${baseUrl}/api/invoices?dateFrom=2020-01-01&dateTo=2020-01-02`
    );
    const data = await response.json();

    expect(data.statusCounts.pending).toBe(0);
    expect(data.statusCounts.paid).toBe(0);
    expect(data.statusCounts.overdue).toBe(0);
    expect(data.pagination.total).toBe(0);
  });
});