import 'server-only';

export interface LogContext {
  method: string;
  url: string;
  userAgent?: string;
  userId?: string;
  requestId?: string;
  ip?: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  context?: LogContext;
  data?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration?: number;
}

class APILogger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  private formatLogEntry(entry: LogEntry): string {
    const timestamp = entry.timestamp;
    const level = entry.level.toUpperCase().padEnd(5);
    const message = entry.message;
    
    let formatted = `[${timestamp}] ${level} ${message}`;
    
    if (entry.context) {
      formatted += ` | ${entry.context.method} ${entry.context.url}`;
      if (entry.context.userId) {
        formatted += ` | User: ${entry.context.userId}`;
      }
      if (entry.duration !== undefined) {
        formatted += ` | ${entry.duration}ms`;
      }
    }
    
    if (entry.data && Object.keys(entry.data).length > 0) {
      formatted += ` | Data: ${JSON.stringify(entry.data)}`;
    }
    
    if (entry.error) {
      formatted += `\n  Error: ${entry.error.name}: ${entry.error.message}`;
      if (this.isDevelopment && entry.error.stack) {
        formatted += `\n  Stack: ${entry.error.stack}`;
      }
    }
    
    return formatted;
  }
  
  private createLogEntry(
    level: LogEntry['level'],
    message: string,
    context?: LogContext,
    data?: Record<string, any>,
    error?: Error,
    duration?: number
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: this.isDevelopment ? error.stack : undefined
      } : undefined,
      duration
    };
  }
  
  info(message: string, context?: LogContext, data?: Record<string, any>): void {
    const entry = this.createLogEntry('info', message, context, data);
    console.log(this.formatLogEntry(entry));
  }
  
  warn(message: string, context?: LogContext, data?: Record<string, any>): void {
    const entry = this.createLogEntry('warn', message, context, data);
    console.warn(this.formatLogEntry(entry));
  }
  
  error(message: string, error?: Error, context?: LogContext, data?: Record<string, any>): void {
    const entry = this.createLogEntry('error', message, context, data, error);
    console.error(this.formatLogEntry(entry));
  }
  
  debug(message: string, context?: LogContext, data?: Record<string, any>): void {
    if (this.isDevelopment) {
      const entry = this.createLogEntry('debug', message, context, data);
      console.debug(this.formatLogEntry(entry));
    }
  }
  
  // Performance logging
  logRequest(
    context: LogContext,
    status: number,
    duration: number,
    data?: Record<string, any>
  ): void {
    const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
    const message = `API Request ${status}`;
    
    const entry = this.createLogEntry(level, message, context, {
      status,
      ...data
    }, undefined, duration);
    
    if (level === 'error') {
      console.error(this.formatLogEntry(entry));
    } else if (level === 'warn') {
      console.warn(this.formatLogEntry(entry));
    } else {
      console.log(this.formatLogEntry(entry));
    }
  }
  
  // Database operation logging
  logDatabaseQuery(
    operation: string,
    table: string,
    duration: number,
    context?: LogContext,
    error?: Error,
    recordCount?: number
  ): void {
    const message = `Database ${operation} on ${table}`;
    const data: Record<string, any> = { recordCount };
    
    if (error) {
      const entry = this.createLogEntry('error', message, context, data, error, duration);
      console.error(this.formatLogEntry(entry));
    } else {
      const entry = this.createLogEntry('info', message, context, data, undefined, duration);
      console.log(this.formatLogEntry(entry));
    }
  }
  
  // Validation error logging
  logValidationError(
    message: string,
    validationErrors: Record<string, any>,
    context?: LogContext
  ): void {
    const entry = this.createLogEntry('warn', message, context, { validationErrors });
    console.warn(this.formatLogEntry(entry));
  }
  
  // Authentication/Authorization logging
  logAuthEvent(
    event: 'login' | 'logout' | 'unauthorized' | 'forbidden',
    userId?: string,
    context?: LogContext,
    data?: Record<string, any>
  ): void {
    const level = event === 'unauthorized' || event === 'forbidden' ? 'warn' : 'info';
    const message = `Auth event: ${event}`;
    const authContext = { ...context, userId };
    
    const entry = this.createLogEntry(level, message, authContext, data);
    
    if (level === 'warn') {
      console.warn(this.formatLogEntry(entry));
    } else {
      console.log(this.formatLogEntry(entry));
    }
  }
}

// Singleton instance
export const apiLogger = new APILogger();

// Utility function to create request context from Next.js Request
export function createLogContext(request: Request, userId?: string): LogContext {
  const url = new URL(request.url);
  
  return {
    method: request.method,
    url: `${url.pathname}${url.search}`,
    userAgent: request.headers.get('user-agent') || undefined,
    userId,
    requestId: request.headers.get('x-request-id') || undefined,
    ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || undefined
  };
}

// Performance timing utility
export class PerformanceTimer {
  private startTime: number;
  
  constructor() {
    this.startTime = performance.now();
  }
  
  end(): number {
    return Math.round(performance.now() - this.startTime);
  }
}

// Middleware-like logging wrapper for API routes
export function withLogging<T extends (...args: any[]) => Promise<Response>>(
  handler: T,
  routeName: string
): T {
  return (async (...args: Parameters<T>): Promise<Response> => {
    const [request] = args;
    const timer = new PerformanceTimer();
    const context = createLogContext(request);
    
    apiLogger.info(`${routeName} - Request started`, context);
    
    try {
      const response = await handler(...args);
      const duration = timer.end();
      
      apiLogger.logRequest(context, response.status, duration);
      
      return response;
    } catch (error) {
      const duration = timer.end();
      
      apiLogger.error(
        `${routeName} - Unhandled error`,
        error instanceof Error ? error : new Error(String(error)),
        context
      );
      
      // Re-throw to maintain error handling behavior
      throw error;
    }
  }) as T;
}