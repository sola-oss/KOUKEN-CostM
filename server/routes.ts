// Main routes configuration using the new DAO-based system
import type { Express } from "express";
import { createServer, type Server } from "http";
import router from './routes/index.js';

export async function registerRoutes(app: Express): Promise<Server> {
  // Use the main router which aggregates all route modules
  app.use(router);

  const httpServer = createServer(app);
  return httpServer;
}