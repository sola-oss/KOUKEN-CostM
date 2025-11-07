import { productionSqliteInitializer } from './lib/production-sqlite-init.js';

productionSqliteInitializer.initialize()
  .then(() => {
    console.log('✅ Database initialized successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  });
