// Health check and system status routes
import { Router } from 'express';
import { SqliteDatabase } from '../dao/sqlite/database.js';

const router = Router();

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
  };

  try {
    // Check database connection
    const db = new SqliteDatabase();
    const isConnected = db.isConnected();
    await db.close();

    health.database = {
      status: isConnected ? 'connected' : 'disconnected',
    };

    res.json(health);
  } catch (error) {
    health.status = 'error';
    health.database = {
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
    res.status(500).json(health);
  }
});

/**
 * Detailed system status (for monitoring)
 */
router.get('/status', async (req, res) => {
  try {
    const db = new SqliteDatabase();
    
    // Get database statistics
    const stats = db.getStats();
    const dashboardStats = await db.reports.getDashboardStats();
    
    await db.close();

    res.json({
      server: {
        status: 'running',
        pid: process.pid,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        cpuUsage: process.cpuUsage(),
      },
      database: {
        ...stats,
        stats: dashboardStats,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

export default router;