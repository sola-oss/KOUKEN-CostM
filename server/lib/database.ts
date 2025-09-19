// PostgreSQL Database Client
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL environment variable is required');
}

// Create the Neon connection
const sql = neon(process.env.DATABASE_URL);

// Create the Drizzle database instance
export const db = drizzle(sql);

// Export the raw SQL connection for direct queries if needed
export { sql };