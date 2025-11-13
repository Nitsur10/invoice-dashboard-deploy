/**
 * Claude API Client for Invoice Chat Assistant
 * Handles communication with Anthropic's Claude API
 */

import Anthropic from '@anthropic-ai/sdk';
import { SYSTEM_PROMPT, FUNCTION_DEFINITIONS } from './prompt-templates';

// Initialize Claude client
let anthropicClient: Anthropic | null = null;

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured. Please set it in your environment variables.');
    }
    
    anthropicClient = new Anthropic({
      apiKey,
    });
  }
  
  return anthropicClient;
}

/**
 * Configuration for Claude chat
 */
export interface ClaudeConfig {
  model?: string;
  maxTokens?: number;
  temperature?: number;
}

const DEFAULT_CONFIG: ClaudeConfig = {
  model: process.env.CHAT_MODEL || 'claude-haiku-4-5',
  maxTokens: parseInt(process.env.CHAT_MAX_TOKENS || '4096', 10),
  temperature: parseFloat(process.env.CHAT_TEMPERATURE || '0.7'),
};

/**
 * Message in Claude format
 */
export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: string; [key: string]: any }>;
}

/**
 * Function call result
 */
export interface FunctionCall {
  name: string;
  input: Record<string, any>;
}

/**
 * Claude response with potential function calls
 */
export interface ClaudeResponse {
  content: string;
  functionCalls: FunctionCall[];
  stopReason: 'end_turn' | 'max_tokens' | 'tool_use' | 'stop_sequence';
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Send a message to Claude and get a response
 */
export async function sendMessage(
  messages: ClaudeMessage[],
  config: ClaudeConfig = {},
  contextPrompt?: string
): Promise<ClaudeResponse> {
  const client = getAnthropicClient();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // Build system prompt with context
  const systemPrompt = contextPrompt 
    ? `${SYSTEM_PROMPT}${contextPrompt}`
    : SYSTEM_PROMPT;
  
  try {
    const response = await client.messages.create({
      model: finalConfig.model!,
      max_tokens: finalConfig.maxTokens!,
      temperature: finalConfig.temperature!,
      system: systemPrompt,
      messages: messages as Anthropic.Messages.MessageParam[],
      tools: FUNCTION_DEFINITIONS as Anthropic.Messages.Tool[],
    });
    
    // Extract text content and function calls
    let textContent = '';
    const functionCalls: FunctionCall[] = [];
    
    for (const block of response.content) {
      if (block.type === 'text') {
        textContent += block.text;
      } else if (block.type === 'tool_use') {
        functionCalls.push({
          name: block.name,
          input: block.input as Record<string, any>,
        });
      }
    }
    
    return {
      content: textContent,
      functionCalls,
      stopReason: response.stop_reason as any,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  } catch (error) {
    console.error('Claude API error:', error);
    
    if (error instanceof Anthropic.APIError) {
      if (error.status === 401) {
        throw new Error('Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY environment variable.');
      } else if (error.status === 429) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      }
    }
    
    throw new Error(`Failed to communicate with Claude: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Send a message with function results back to Claude
 */
export async function sendMessageWithFunctionResults(
  messages: ClaudeMessage[],
  functionResults: Array<{ name: string; result: any }>,
  config: ClaudeConfig = {}
): Promise<ClaudeResponse> {
  // Add function results to messages in Claude's expected format
  const messagesWithResults = [
    ...messages,
    {
      role: 'user' as const,
      content: functionResults.map(({ name, result }) => ({
        type: 'tool_result',
        tool_use_id: name,
        content: JSON.stringify(result),
      })),
    },
  ];
  
  return sendMessage(messagesWithResults, config);
}

/**
 * Stream a response from Claude (for real-time UI updates)
 */
export async function* streamMessage(
  messages: ClaudeMessage[],
  config: ClaudeConfig = {},
  contextPrompt?: string
): AsyncGenerator<string, void, unknown> {
  const client = getAnthropicClient();
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const systemPrompt = contextPrompt 
    ? `${SYSTEM_PROMPT}${contextPrompt}`
    : SYSTEM_PROMPT;
  
  try {
    const stream = await client.messages.create({
      model: finalConfig.model!,
      max_tokens: finalConfig.maxTokens!,
      temperature: finalConfig.temperature!,
      system: systemPrompt,
      messages: messages as Anthropic.Messages.MessageParam[],
      tools: FUNCTION_DEFINITIONS as Anthropic.Messages.Tool[],
      stream: true,
    });
    
    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          yield event.delta.text;
        }
      }
    }
  } catch (error) {
    console.error('Claude streaming error:', error);
    throw new Error(`Failed to stream from Claude: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check if Claude API is configured and available
 */
export function isClaudeConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/**
 * Test the Claude connection
 */
export async function testConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await sendMessage([
      { role: 'user', content: 'Hello! Just testing the connection.' }
    ]);
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

