import { NextRequest, NextResponse } from 'next/server';

// Stub route to prevent build errors from phantom references
async function getAuditHandler(request: NextRequest) {
  return NextResponse.json({
    message: "Audit route disabled - using Supabase directly",
    timestamp: new Date().toISOString(),
  });
}

export const GET = getAuditHandler;