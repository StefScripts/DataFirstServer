import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import * as schema from './schema';
import * as dotenv from 'dotenv';

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set in .env file');
}

// Create Neon client
const sql = neon(process.env.DATABASE_URL);

// Create Drizzle instance
export const db = drizzle(sql, { schema });

// For backwards compatibility
export const pool = {
  // Add minimal implementation of the pool interface
  query: async (text, params) => {
    const result = await sql(text, params);
    return { rows: result };
  }
};
