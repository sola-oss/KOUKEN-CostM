// Load environment variables from .env file
import 'dotenv/config';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import { corsConfig, helmetConfig, rateLimitConfig, apiRateLimitConfig, timeoutMiddleware } from './middleware/security.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestLogger, healthCheckLogger } from './middleware/logging.js';

const app = express();

// Security middleware
app.use(helmetConfig);
app.use(corsConfig);

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

// Request timeout
app.use(timeoutMiddleware(30000)); // 30 second timeout

// Health check logging (simplified)
app.use(healthCheckLogger);

// Enhanced request logging
app.use(requestLogger);

// Rate limiting
app.use(rateLimitConfig);
app.use('/api', apiRateLimitConfig);

(async () => {
  // Initialize Production Management SQLite database
  try {
    const { productionSqliteInitializer } = await import('./lib/production-sqlite-init.js');
    await productionSqliteInitializer.initialize();
  } catch (error) {
    console.error('✗ Failed to initialize Production Management SQLite database:', error);
    process.exit(1);
  }

  const server = await registerRoutes(app);

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // 404 handler for API routes only (after Vite setup)
  app.use('/api', notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
