const { Pool } = require('pg');

/**
 * Centralized PostgreSQL connection pool.
 *
 * Supports the platform-provided env vars (preferred):
 * - POSTGRES_URL (full connection string)
 *   OR individual parts:
 * - POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_PORT (+ optional POSTGRES_HOST)
 *
 * Also supports common `pg` aliases to improve portability:
 * - DATABASE_URL
 * - PGHOST, PGUSER, PGPASSWORD, PGDATABASE, PGPORT
 *
 * Notes:
 * - Some managed Postgres providers require SSL. Set `POSTGRES_SSL=true` if needed.
 */
const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;

/**
 * Determine whether to enable SSL for Postgres.
 * - If POSTGRES_SSL is explicitly set to true/false, honor it.
 * - Otherwise default to false (local/dev friendly).
 */
function shouldUseSsl() {
  const raw = process.env.POSTGRES_SSL;
  if (raw == null || raw === '') return false;
  return String(raw).toLowerCase() === 'true';
}

function requiredEnv(name, value) {
  if (value == null || value === '') {
    // Throwing during module init fails fast and gives a clear misconfig signal.
    throw new Error(`Missing required database environment variable: ${name}`);
  }
  return value;
}

const pool = new Pool(
  connectionString
    ? {
        connectionString,
        // If SSL is required, `pg` expects an object or boolean. We use `{ rejectUnauthorized: false }`
        // for compatibility with many managed DBs; tighten in production if you have proper CA bundles.
        ssl: shouldUseSsl() ? { rejectUnauthorized: false } : false,
      }
    : {
        host: process.env.POSTGRES_HOST || process.env.PGHOST || 'localhost',
        user: requiredEnv('POSTGRES_USER', process.env.POSTGRES_USER || process.env.PGUSER),
        password: requiredEnv(
          'POSTGRES_PASSWORD',
          process.env.POSTGRES_PASSWORD || process.env.PGPASSWORD
        ),
        database: requiredEnv('POSTGRES_DB', process.env.POSTGRES_DB || process.env.PGDATABASE),
        port: Number(process.env.POSTGRES_PORT || process.env.PGPORT || 5432),
        ssl: shouldUseSsl() ? { rejectUnauthorized: false } : false,
      }
);

// Helpful during local dev; no-op if PG is fine.
/* eslint-disable no-console */
pool.on('error', (err) => {
  console.error('Unexpected PG pool error', err);
});
/* eslint-enable no-console */

module.exports = pool;

