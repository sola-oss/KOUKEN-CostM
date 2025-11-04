// Production Management MVP - SQLite Database Initialization
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export class ProductionSqliteInitializer {
  private dbPath: string;

  constructor(dbPath?: string) {
    this.dbPath = dbPath || process.env.DB_PATH || './server/db/production.sqlite';
  }

  async initialize(): Promise<void> {
    try {
      console.log(`📦 Initializing Production Management SQLite database at: ${this.dbPath}`);
      
      // Create database directory if it doesn't exist
      const dbDir = dirname(this.dbPath);
      const { mkdirSync } = await import('fs');
      try {
        mkdirSync(dbDir, { recursive: true });
      } catch (error) {
        // Directory might already exist
      }

      const db = new Database(this.dbPath);
      
      // Enable foreign keys
      db.pragma('foreign_keys = ON');
      
      // Read and execute migration
      const migrationPath = join(__dirname, '../migrations/002_production_mvp.sql');
      const migrationSQL = readFileSync(migrationPath, 'utf8');
      
      // Execute migration in transaction
      const transaction = db.transaction(() => {
        // Split migration into individual statements and execute
        const statements = migrationSQL
          .split(';')
          .map(stmt => stmt.trim())
          .filter(stmt => stmt.length > 0);
        
        for (const statement of statements) {
          try {
            db.exec(statement);
          } catch (error) {
            console.log(`Skipping statement (may already exist): ${statement.substring(0, 50)}...`);
          }
        }
      });
      
      transaction();
      
      // Verify tables exist
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('orders', 'procurements', 'workers_log', 'tasks', 'work_logs')
      `).all();
      
      if (tables.length !== 5) {
        throw new Error(`Expected 5 tables, found ${tables.length}`);
      }
      
      console.log('✓ Production Management tables created successfully');
      
      // Add sample data if tables are empty
      await this.seedSampleData(db);
      
      db.close();
      console.log('✓ Production Management SQLite database initialized successfully');
      
    } catch (error) {
      console.error('✗ Failed to initialize Production Management SQLite database:', error);
      throw error;
    }
  }

  private async seedSampleData(db: Database.Database): Promise<void> {
    try {
      // Check if we already have data
      const orderCount = db.prepare('SELECT COUNT(*) as count FROM orders').get() as { count: number };
      
      if (orderCount.count > 0) {
        console.log('📊 Sample data already exists, skipping seeding');
        return;
      }
      
      console.log('📊 Seeding sample production management data...');
      
      const now = new Date().toISOString();
      
      // Sample orders
      const sampleOrders = [
        {
          product_name: 'アルミ部品A',
          qty: 100,
          due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          sales: 150000,
          estimated_material_cost: 80000,
          std_time_per_unit: 0.5,
          status: 'completed',
          customer_name: null
        },
        {
          product_name: 'ステンレス部品B',
          qty: 50,
          due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
          sales: 200000,
          estimated_material_cost: 60000,
          std_time_per_unit: 0.8,
          status: 'completed',
          customer_name: null
        },
        {
          product_name: '樹脂成型品C',
          qty: 200,
          due_date: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days from now
          sales: 80000,
          estimated_material_cost: 30000,
          std_time_per_unit: 0.3,
          status: 'completed',
          customer_name: null
        }
      ];
      
      const insertOrder = db.prepare(`
        INSERT INTO orders (product_name, qty, due_date, sales, estimated_material_cost, std_time_per_unit, status, customer_name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const orderIds: number[] = [];
      
      for (const order of sampleOrders) {
        const result = insertOrder.run(
          order.product_name,
          order.qty,
          order.due_date,
          order.sales,
          order.estimated_material_cost,
          order.std_time_per_unit,
          order.status,
          order.customer_name,
          now,
          now
        );
        orderIds.push(result.lastInsertRowid as number);
      }
      
      // Sample procurements
      const sampleProcurements = [
        {
          order_id: orderIds[0],
          kind: 'purchase',
          item_name: 'アルミ材料',
          qty: 110,
          eta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
          status: 'ordered',
          vendor: 'アルミ商事',
          unit_price: 750
        },
        {
          order_id: orderIds[0],
          kind: 'manufacture',
          item_name: 'アルミ部品A加工',
          qty: 100,
          eta: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
          status: 'planned',
          std_time_per_unit: 0.5,
          worker: '田中'
        },
        {
          order_id: orderIds[1],
          kind: 'purchase',
          item_name: 'ステンレス材料',
          qty: 55,
          eta: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
          status: 'planned',
          vendor: '鋼材屋',
          unit_price: 1100
        }
      ];
      
      const insertProcurement = db.prepare(`
        INSERT INTO procurements (
          order_id, kind, item_name, qty, unit, eta, status, vendor, unit_price, 
          received_at, std_time_per_unit, act_time_per_unit, worker, completed_at, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      for (const proc of sampleProcurements) {
        insertProcurement.run(
          proc.order_id,
          proc.kind,
          proc.item_name,
          proc.qty,
          proc.kind === 'purchase' ? 'kg' : null, // unit
          proc.eta,
          proc.status,
          proc.vendor || null,
          proc.unit_price || null,
          null, // received_at
          (proc as any).std_time_per_unit || null,
          null, // act_time_per_unit
          (proc as any).worker || null,
          null, // completed_at
          now
        );
      }
      
      // Sample worker logs
      const sampleWorkerLogs = [
        {
          order_id: orderIds[0],
          qty: 20,
          act_time_per_unit: 0.6,
          worker: '田中',
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // yesterday
        },
        {
          order_id: orderIds[0],
          qty: 30,
          act_time_per_unit: 0.4,
          worker: '佐藤',
          date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // yesterday
        },
        {
          order_id: orderIds[1],
          qty: 10,
          act_time_per_unit: 0.9,
          worker: '鈴木',
          date: new Date().toISOString() // today
        }
      ];
      
      const insertWorkerLog = db.prepare(`
        INSERT INTO workers_log (order_id, qty, act_time_per_unit, worker, date, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      
      for (const log of sampleWorkerLogs) {
        insertWorkerLog.run(
          log.order_id,
          log.qty,
          log.act_time_per_unit,
          log.worker,
          log.date,
          now
        );
      }
      
      console.log('✓ Sample production management data seeded successfully');
      console.log(`  - ${sampleOrders.length} orders created`);
      console.log(`  - ${sampleProcurements.length} procurements created`);
      console.log(`  - ${sampleWorkerLogs.length} worker logs created`);
      
    } catch (error) {
      console.error('✗ Failed to seed sample data:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const productionSqliteInitializer = new ProductionSqliteInitializer();