// Enhanced error handling middleware
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export interface AppError extends Error {
  status?: number;
  statusCode?: number;
  code?: string;
  details?: any;
}

/**
 * Enhanced error handler with proper logging and response formatting
 */
export const errorHandler = (
  error: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Don't log errors if response already sent
  if (res.headersSent) {
    return next(error);
  }

  const status = error.status || error.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Log error details
  const errorInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    error: {
      name: error.name,
      message: error.message,
      status,
      code: error.code,
      stack: isProduction ? undefined : error.stack,
    },
  };

  // Enhanced logging based on status
  if (status >= 500) {
    console.error('🔥 Server Error:', JSON.stringify(errorInfo, null, 2));
  } else if (status >= 400) {
    console.warn('⚠️ Client Error:', JSON.stringify(errorInfo, null, 2));
  }

  // Handle specific error types
  let responseMessage = error.message || 'Internal Server Error';
  let responseDetails: any = undefined;

  // Zod validation errors
  if (error instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message,
        code: err.code,
      })),
    });
  }

  // Database errors (SQLite specific)
  if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    responseMessage = 'Duplicate entry found';
    responseDetails = { constraint: 'unique' };
  } else if (error.code === 'SQLITE_CONSTRAINT_FOREIGNKEY') {
    responseMessage = 'Referenced record not found';
    responseDetails = { constraint: 'foreign_key' };
  }

  // Prepare response
  const response: any = {
    error: status >= 500 ? 'Internal Server Error' : 'Request Error',
    message: responseMessage,
  };

  // Add details in development or for client errors
  if (!isProduction || status < 500) {
    if (responseDetails) {
      response.details = responseDetails;
    }
    if (error.code) {
      response.code = error.code;
    }
  }

  // Add request ID for debugging
  if (req.headers['x-request-id']) {
    response.requestId = req.headers['x-request-id'];
  }

  res.status(status).json(response);
};

/**
 * 404 handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response) => {
  const isApiRequest = req.path.startsWith('/api');
  
  if (isApiRequest) {
    res.status(404).json({
      error: 'Not Found',
      message: `API endpoint ${req.method} ${req.path} not found`,
      availableEndpoints: [
        'GET /api/employees',
        'GET /api/vendors',
        'GET /api/projects',
        'GET /api/time-entries',
        'GET /api/reports/dashboard',
      ],
    });
  } else {
    // For non-API requests, let the frontend handle routing
    res.status(404).json({
      error: 'Not Found',
      message: 'Resource not found',
    });
  }
};

/**
 * Async error wrapper to catch promise rejections
 */
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create standardized API error
 */
export const createError = (
  message: string, 
  status: number = 500, 
  code?: string, 
  details?: any
): AppError => {
  const error = new Error(message) as AppError;
  error.status = status;
  error.code = code;
  error.details = details;
  return error;
};