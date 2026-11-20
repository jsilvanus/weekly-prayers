import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import pg from 'pg';

config();

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Pool } = pg;

let poolConfig = {};
if (process.env.DATABASE_URL) {
  poolConfig.connectionString = process.env.DATABASE_URL;
} else {
  poolConfig = {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'prayers',
    password: process.env.DB_PASSWORD || 'prayers_secret',
    database: process.env.DB_NAME || 'weekly_prayers',
  };
}

if (process.env.DB_SSL === 'true') {
  poolConfig.ssl = {
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'true',
  };
}

const pool = new Pool(poolConfig);

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL UNIQUE,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}

async function getAppliedMigrations(client) {
  const result = await client.query('SELECT name FROM migrations ORDER BY id');
  return result.rows.map(row => row.name);
}

async function getMigrationFiles() {
  const files = await readdir(__dirname);
  return files
    .filter(f => f.endsWith('.sql'))
    .sort();
}

async function runMigration(client, filename) {
  const filepath = join(__dirname, filename);
  const sql = await readFile(filepath, 'utf-8');

  console.log(`Running migration: ${filename}`);
  await client.query(sql);
  await client.query('INSERT INTO migrations (name) VALUES ($1)', [filename]);
  console.log(`Migration completed: ${filename}`);
}

export async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Checking database migrations...');
    await ensureMigrationsTable(client);

    const applied = await getAppliedMigrations(client);
    const files = await getMigrationFiles();
    const pending = files.filter(f => !applied.includes(f));

    if (pending.length === 0) {
      console.log('No pending migrations.');
      return;
    }

    console.log(`Found ${pending.length} pending migration(s):`, pending);

    for (const filename of pending) {
      await client.query('BEGIN');
      try {
        await runMigration(client, filename);
        await client.query('COMMIT');
      } catch (error) {
        await client.query('ROLLBACK');
        console.error(`Migration ${filename} failed:`, error);
        throw error;
      }
    }

    console.log('All migrations applied successfully.');
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrate().catch(error => {
    console.error('Migration runner failed:', error);
    process.exit(1);
  });
}
