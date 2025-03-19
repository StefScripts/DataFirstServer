// db/index.ts
import { drizzle } from 'drizzle-orm/neon-http';
import { neon, neonConfig } from '@neondatabase/serverless';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set in .env file');
}

// Configure Neon client for performance
// Only use configuration options that are available in your version
neonConfig.fetchConnectionCache = true; // Enable connection cache

// Create Neon client
const sql = neon(process.env.DATABASE_URL);

// Create Drizzle instance without unsupported options
export const db = drizzle(sql, { schema });

// For backwards compatibility
export const pool = {
  query: async (text, params) => {
    const result = await sql(text, params);
    return { rows: result };
  }
};

// Function to test database connection
export async function testConnection() {
  try {
    const startTime = Date.now();
    await sql('SELECT 1');
    const duration = Date.now() - startTime;
    console.log(`Database connection test successful in ${duration}ms`);
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}
