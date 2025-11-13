import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerComponentClient } from '@/lib/supabase-server';
import OpenAI from 'openai';

// Rate limiting: Track transcription requests per user
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 30; // transcriptions per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);
  
  if (!userLimit || now > userLimit.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_WINDOW });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }
  
  if (userLimit.count >= RATE_LIMIT) {
    return { allowed: false, remaining: 0 };
  }
  
  userLimit.count++;
  return { allowed: true, remaining: RATE_LIMIT - userLimit.count };
}

/**
 * POST /api/chat/transcribe
 * Transcribe audio using OpenAI Whisper API
 */
export async function POST(request: NextRequest) {
  try {
    // Check if OpenAI is configured
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API is not configured' },
        { status: 500 }
      );
    }

    // Get authenticated user
    const supabase = await getSupabaseServerComponentClient();
    if (!supabase) {
      return NextResponse.json(
        { error: 'Database not configured' },
        { status: 500 }
      );
    }
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const userId = session.user.id;
    
    // Check rate limit
    const rateLimit = checkRateLimit(userId);
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please wait a moment before transcribing more audio.' },
        { status: 429 }
      );
    }
    
    // Parse multipart form data
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    
    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }
    
    // Validate file size (max 25MB - Whisper API limit)
    const maxSize = 25 * 1024 * 1024; // 25MB
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: 'Audio file is too large. Maximum size is 25MB.' },
        { status: 400 }
      );
    }
    
    // Validate file type
    const allowedTypes = ['audio/webm', 'audio/mp4', 'audio/mpeg', 'audio/wav', 'audio/ogg'];
    if (!allowedTypes.includes(audioFile.type)) {
      return NextResponse.json(
        { error: `Unsupported audio format: ${audioFile.type}` },
        { status: 400 }
      );
    }
    
    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    
    // Transcribe audio using Whisper API
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'en', // You can make this configurable or let Whisper auto-detect
      response_format: 'json',
    });
    
    // Return transcribed text
    return NextResponse.json({
      text: transcription.text,
      success: true,
    });
    
  } catch (error: any) {
    console.error('Transcription error:', error);
    
    // Handle specific OpenAI errors
    if (error?.status === 401) {
      return NextResponse.json(
        { error: 'OpenAI API key is invalid' },
        { status: 500 }
      );
    }
    
    if (error?.status === 429) {
      return NextResponse.json(
        { error: 'OpenAI API rate limit exceeded. Please try again later.' },
        { status: 429 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to transcribe audio. Please try again.' },
      { status: 500 }
    );
  }
}



