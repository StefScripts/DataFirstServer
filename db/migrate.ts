// import { drizzle } from 'drizzle-orm/neon-http';
// import { neon } from '@neondatabase/serverless';
// import { migrate } from 'drizzle-orm/neon-http/migrator';
// import * as dotenv from 'dotenv';

// dotenv.config();

// const runMigration = async () => {
//   if (!process.env.DATABASE_URL) {
//     throw new Error('DATABASE_URL must be set in .env file');
//   }

//   const sql = neon(process.env.DATABASE_URL);
//   const db = drizzle(sql);

//   console.log('Running migrations...');

//   await migrate(db, { migrationsFolder: 'drizzle' });

//   console.log('Migrations completed!');
//   process.exit(0);
// };

// runMigration().catch((err) => {
//   console.error('Migration failed!', err);
//   process.exit(1);
// });

import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const runMigration = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL must be set in .env file');
  }

  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  console.log('Running migrations...');

  // Use the path relative to the server directory
  await migrate(db, { migrationsFolder: path.resolve(__dirname, '..', 'migrations') });

  console.log('Migrations completed!');
  process.exit(0);
};

runMigration().catch((err) => {
  console.error('Migration failed!', err);
  process.exit(1);
});
