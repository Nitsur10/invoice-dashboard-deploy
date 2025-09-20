import { NextRequest, NextResponse } from 'next/server';

// Temporary stub to fix Prisma build error
async function getOutstandingHandler(request: NextRequest) {
  return NextResponse.json({
    outstanding: [],
    summary: {
      totalOutstanding: 0,
      totalCount: 0,
      overdueCount: 0,
      largestInvoice: 0,
    },
    metadata: {
      generatedAt: new Date().toISOString(),
      dateRange: { from: null, to: null }
    }
  });
}

export const GET = getOutstandingHandler;