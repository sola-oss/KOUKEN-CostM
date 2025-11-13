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
      const migrationPath = join(__dirname, '../migrations/001_production_schema.sql');
      const migrationSQL = readFileSync(migrationPath, 'utf8');
      
      // Execute migration directly (contains full schema)
      try {
        db.exec(migrationSQL);
      } catch (error: any) {
        if (!error.message?.includes('already exists')) {
          throw error;
        }
        console.log('Database tables already exist, skipping schema creation');
      }
      
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
          order_id: '1',
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
          order_id: '2',
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
          order_id: '3',
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
        INSERT INTO orders (
          order_id, order_date, client_name, manager, client_order_no, project_title,
          is_delivered, has_shipping_fee, is_amount_confirmed, is_invoiced,
          due_date, delivery_date, confirmed_date,
          estimated_amount, invoiced_amount, invoice_month,
          subcontractor, processing_hours, note,
          product_name, qty, start_date, sales, estimated_material_cost,
          std_time_per_unit, status, customer_name,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      const orderIds: string[] = [];
      
      for (const order of sampleOrders) {
        insertOrder.run(
          order.order_id,
          // 新受注管理項目（サンプルデータ用の初期値）
          new Date().toISOString().split('T')[0], // order_date
          null, // client_name
          null, // manager
          null, // client_order_no
          order.product_name, // project_title
          // ステータスフラグ
          order.status === 'completed' ? 1 : 0, // is_delivered
          0, // has_shipping_fee
          order.status === 'completed' ? 1 : 0, // is_amount_confirmed
          order.status === 'completed' ? 1 : 0, // is_invoiced
          // 日付情報
          order.due_date, // due_date
          order.status === 'completed' ? new Date().toISOString().split('T')[0] : null, // delivery_date
          order.status === 'completed' ? new Date().toISOString().split('T')[0] : null, // confirmed_date
          // 金額情報
          order.sales, // estimated_amount
          order.status === 'completed' ? order.sales : null, // invoiced_amount
          order.status === 'completed' ? new Date().toISOString().substring(0, 7) : null, // invoice_month (YYYY-MM)
          // 作業情報
          null, // subcontractor
          null, // processing_hours
          null, // note
          // レガシー項目
          order.product_name,
          order.qty,
          null, // start_date
          order.sales,
          order.estimated_material_cost,
          order.std_time_per_unit,
          order.status,
          order.customer_name,
          // システム管理
          now,
          now
        );
        orderIds.push(order.order_id);
      }
      
      // Sample procurements (materials for each order)
      const sampleProcurements = [
        // Order 1: アルミ部品A - 材料8件
        {
          order_id: orderIds[0],
          kind: 'purchase',
          item_name: 'アルミ板 A5052',
          qty: 110,
          unit: 'kg',
          eta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'ordered',
          vendor: 'アルミ商事',
          unit_price: 750
        },
        {
          order_id: orderIds[0],
          kind: 'purchase',
          item_name: 'ステンレスボルト M6×20',
          qty: 200,
          unit: '個',
          eta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'received',
          vendor: 'ネジ工業',
          unit_price: 15
        },
        {
          order_id: orderIds[0],
          kind: 'purchase',
          item_name: 'ステンレスナット M6',
          qty: 200,
          unit: '個',
          eta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'received',
          vendor: 'ネジ工業',
          unit_price: 8
        },
        {
          order_id: orderIds[0],
          kind: 'purchase',
          item_name: 'ワッシャー M6',
          qty: 200,
          unit: '個',
          eta: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'received',
          vendor: 'ネジ工業',
          unit_price: 5
        },
        {
          order_id: orderIds[0],
          kind: 'purchase',
          item_name: '切削油',
          qty: 5,
          unit: 'L',
          eta: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'received',
          vendor: '工具商会',
          unit_price: 2800
        },
        {
          order_id: orderIds[0],
          kind: 'purchase',
          item_name: 'エンドミル 10mm',
          qty: 2,
          unit: '本',
          eta: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'received',
          vendor: '工具商会',
          unit_price: 4500
        },
        {
          order_id: orderIds[0],
          kind: 'purchase',
          item_name: '梱包用ダンボール箱',
          qty: 10,
          unit: '箱',
          eta: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'received',
          vendor: '梱包資材',
          unit_price: 350
        },
        {
          order_id: orderIds[0],
          kind: 'purchase',
          item_name: '緩衝材シート',
          qty: 20,
          unit: '枚',
          eta: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'received',
          vendor: '梱包資材',
          unit_price: 120
        },
        {
          order_id: orderIds[0],
          kind: 'purchase',
          item_name: '工具セット（切削用）',
          qty: 1,
          unit: 'セット',
          eta: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'received',
          vendor: '工具商会',
          unit_price: 28000
        },
        {
          order_id: orderIds[0],
          kind: 'manufacture',
          item_name: 'アルミ部品A加工',
          qty: 100,
          eta: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'planned',
          std_time_per_unit: 0.5,
          worker: '田中'
        },
        
        // Order 2: ステンレス部品B - 材料7件
        {
          order_id: orderIds[1],
          kind: 'purchase',
          item_name: 'ステンレス板 SUS304',
          qty: 55,
          unit: 'kg',
          eta: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'ordered',
          vendor: '鋼材屋',
          unit_price: 1100
        },
        {
          order_id: orderIds[1],
          kind: 'purchase',
          item_name: '溶接棒 SUS308',
          qty: 50,
          unit: '本',
          eta: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'ordered',
          vendor: '溶接材料',
          unit_price: 280
        },
        {
          order_id: orderIds[1],
          kind: 'purchase',
          item_name: '研磨ディスク 100mm',
          qty: 15,
          unit: '枚',
          eta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'planned',
          vendor: '工具商会',
          unit_price: 320
        },
        {
          order_id: orderIds[1],
          kind: 'purchase',
          item_name: '防錆スプレー',
          qty: 3,
          unit: '本',
          eta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'planned',
          vendor: 'ケミカル商事',
          unit_price: 1200
        },
        {
          order_id: orderIds[1],
          kind: 'purchase',
          item_name: 'クリーニング液',
          qty: 2,
          unit: 'L',
          eta: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'planned',
          vendor: 'ケミカル商事',
          unit_price: 1800
        },
        {
          order_id: orderIds[1],
          kind: 'purchase',
          item_name: '保護フィルム',
          qty: 60,
          unit: 'm',
          eta: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'planned',
          vendor: '梱包資材',
          unit_price: 150
        },
        {
          order_id: orderIds[1],
          kind: 'purchase',
          item_name: '木製パレット',
          qty: 5,
          unit: '枚',
          eta: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'planned',
          vendor: '物流資材',
          unit_price: 2200
        },
        {
          order_id: orderIds[1],
          kind: 'purchase',
          item_name: '溶接治具セット',
          qty: 1,
          unit: 'セット',
          eta: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'planned',
          vendor: '工具商会',
          unit_price: 45000
        },
        
        // Order 3: 樹脂成型品C - 材料6件
        {
          order_id: orderIds[2],
          kind: 'purchase',
          item_name: 'PP樹脂ペレット',
          qty: 45,
          unit: 'kg',
          eta: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'planned',
          vendor: '樹脂材料',
          unit_price: 420
        },
        {
          order_id: orderIds[2],
          kind: 'purchase',
          item_name: '着色剤（黒）',
          qty: 2,
          unit: 'kg',
          eta: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'planned',
          vendor: '樹脂材料',
          unit_price: 3500
        },
        {
          order_id: orderIds[2],
          kind: 'purchase',
          item_name: '離型剤',
          qty: 3,
          unit: 'L',
          eta: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'planned',
          vendor: 'ケミカル商事',
          unit_price: 2400
        },
        {
          order_id: orderIds[2],
          kind: 'purchase',
          item_name: 'ポリ袋 小',
          qty: 250,
          unit: '枚',
          eta: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'planned',
          vendor: '梱包資材',
          unit_price: 8
        },
        {
          order_id: orderIds[2],
          kind: 'purchase',
          item_name: 'ラベルシール',
          qty: 300,
          unit: '枚',
          eta: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'planned',
          vendor: '印刷屋',
          unit_price: 12
        },
        {
          order_id: orderIds[2],
          kind: 'purchase',
          item_name: '外箱（大）',
          qty: 20,
          unit: '箱',
          eta: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'planned',
          vendor: '梱包資材',
          unit_price: 480
        },
        {
          order_id: orderIds[2],
          kind: 'purchase',
          item_name: '成形金型メンテナンスセット',
          qty: 1,
          unit: 'セット',
          eta: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'planned',
          vendor: '工具商会',
          unit_price: 35000
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
          (proc as any).unit || null, // unit
          proc.eta,
          proc.status,
          (proc as any).vendor || null,
          (proc as any).unit_price || null,
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