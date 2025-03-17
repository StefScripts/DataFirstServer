import { defineConfig } from 'drizzle-kit';
import * as dotenv from 'dotenv';
import path from 'path';
dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL must be set in .env file');
}

export default defineConfig({
  out: './migrations',
  schema: './db/schema.ts', // Path relative to server directory
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL
  }
});
