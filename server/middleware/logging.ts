// Enhanced request logging middleware
import { Request, Response, NextFunction } from 'express';
// nanoid is not available in this context, using crypto instead
import { randomBytes } from 'crypto';

interface RequestWithId extends Request {
  id?: string;
  startTime?: number;
}

/**
 * Enhanced request logger with timing and response details
 */
export const requestLogger = (req: RequestWithId, res: Response, next: NextFunction) => {
  req.id = randomBytes(4).toString('hex');
  req.startTime = Date.now();
  
  // Add request ID to headers for client debugging
  res.setHeader('X-Request-ID', req.id);

  let capturedJsonResponse: Record<string, any> | undefined = undefined;
  
  // Capture JSON responses for logging
  const originalResJson = res.json;
  res.json = function (bodyJson: any) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson]);
  };

  res.on('finish', () => {
    const duration = Date.now() - (req.startTime || 0);
    const path = req.path;
    const method = req.method;
    const status = res.statusCode;

    // Enhanced logging for API requests
    if (path.startsWith('/api')) {
      let logLine = `${method} ${path} ${status} in ${duration}ms`;
      
      // Add query parameters if present
      if (Object.keys(req.query).length > 0) {
        const queryString = new URLSearchParams(req.query as any).toString();
        logLine += ` [query: ${queryString}]`;
      }

      // Add response data for errors or in development
      if (capturedJsonResponse && (status >= 400 || process.env.NODE_ENV === 'development')) {
        const responseStr = JSON.stringify(capturedJsonResponse);
        if (responseStr.length > 100) {
          logLine += ` :: ${responseStr.slice(0, 97)}...`;
        } else {
          logLine += ` :: ${responseStr}`;
        }
      }

      // Add request size for POST/PUT/PATCH requests
      if (['POST', 'PUT', 'PATCH'].includes(method)) {
        const contentLength = req.get('content-length');
        if (contentLength) {
          logLine += ` [${contentLength} bytes]`;
        }
      }

      // Color coding based on status
      const timestamp = new Date().toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit', 
        second: '2-digit',
        hour12: true,
      });

      if (status >= 500) {
        console.error(`${timestamp} [express] 🔴 ${logLine}`);
      } else if (status >= 400) {
        console.warn(`${timestamp} [express] 🟡 ${logLine}`);
      } else if (status >= 300) {
        console.info(`${timestamp} [express] 🔵 ${logLine}`);
      } else {
        console.log(`${timestamp} [express] 🟢 ${logLine}`);
      }
    }
  });

  next();
};

/**
 * Health check endpoint logger (simplified)
 */
export const healthCheckLogger = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/health' || req.path === '/api/health') {
    // Skip verbose logging for health checks
    res.on('finish', () => {
      if (res.statusCode !== 200) {
        console.warn(`Health check failed: ${res.statusCode}`);
      }
    });
  }
  next();
};