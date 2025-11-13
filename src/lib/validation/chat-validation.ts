import { z } from 'zod';

/**
 * Validation schemas for chat-related inputs
 */

// Message content validation
export const messageContentSchema = z
  .string()
  .min(1, 'Message cannot be empty')
  .max(4000, 'Message is too long (max 4000 characters)')
  .transform((val) => val.trim())
  .refine((val) => val.length > 0, 'Message cannot be empty after trimming');

// Conversation title validation
export const conversationTitleSchema = z
  .string()
  .min(1, 'Title cannot be empty')
  .max(200, 'Title is too long (max 200 characters)')
  .transform((val) => val.trim());

// Conversation ID validation (UUID)
export const conversationIdSchema = z
  .string()
  .uuid('Invalid conversation ID');

// Message ID validation (UUID)
export const messageIdSchema = z
  .string()
  .uuid('Invalid message ID');

// Action type validation
export const actionTypeSchema = z.enum([
  'status_update',
  'note_added',
  'search',
  'summary',
  'export'
], {
  errorMap: () => ({ message: 'Invalid action type' })
});

// Status update params validation
export const statusUpdateParamsSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  newStatus: z.enum(['pending', 'in_review', 'approved', 'paid', 'overdue'], {
    errorMap: () => ({ message: 'Invalid status value' })
  }),
  reason: z.string().min(1).max(500).optional(),
});

// Add note params validation
export const addNoteParamsSchema = z.object({
  invoiceId: z.string().uuid('Invalid invoice ID'),
  note: z.string().min(1, 'Note cannot be empty').max(1000, 'Note is too long (max 1000 characters)'),
});

/**
 * Sanitize user input to prevent XSS and injection attacks
 */
export function sanitizeInput(input: string): string {
  // Remove any HTML tags
  let sanitized = input.replace(/<[^>]*>/g, '');
  
  // Decode HTML entities
  sanitized = sanitized
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'");
  
  // Remove control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
  
  return sanitized;
}

/**
 * Validate and sanitize message content
 */
export function validateMessage(message: unknown): { success: true; data: string } | { success: false; error: string } {
  try {
    const parsed = messageContentSchema.parse(message);
    const sanitized = sanitizeInput(parsed);
    return { success: true, data: sanitized };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Invalid message' };
  }
}

/**
 * Validate action parameters based on action type
 */
export function validateActionParams(
  action: string,
  params: unknown
): { success: true; data: any } | { success: false; error: string } {
  try {
    const actionType = actionTypeSchema.parse(action);
    
    switch (actionType) {
      case 'status_update':
        const statusParams = statusUpdateParamsSchema.parse(params);
        return { success: true, data: statusParams };
      
      case 'note_added':
        const noteParams = addNoteParamsSchema.parse(params);
        return { success: true, data: noteParams };
      
      default:
        return { success: true, data: params };
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error: error.errors[0].message };
    }
    return { success: false, error: 'Invalid action parameters' };
  }
}

/**
 * Check if a string contains potentially dangerous content
 */
export function containsDangerousContent(input: string): boolean {
  const dangerousPatterns = [
    /<script/i,
    /javascript:/i,
    /on\w+\s*=/i, // Event handlers like onclick=
    /<iframe/i,
    /data:text\/html/i,
  ];
  
  return dangerousPatterns.some(pattern => pattern.test(input));
}

