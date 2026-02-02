const { Pool } = require('pg');

/**
 * Centralized PostgreSQL connection pool.
 *
 * Env vars required (provided by the database container runtime):
 * - POSTGRES_URL (preferred, full connection string)
 *   OR individual parts:
 * - POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB, POSTGRES_PORT (+ optional POSTGRES_HOST)
 */
const connectionString = process.env.POSTGRES_URL;

const pool = new Pool(
  connectionString
    ? { connectionString }
    : {
        host: process.env.POSTGRES_HOST || 'localhost',
        user: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
        port: process.env.POSTGRES_PORT ? Number(process.env.POSTGRES_PORT) : undefined,
      }
);

// Helpful during local dev; no-op if PG is fine.
/* eslint-disable no-console */
pool.on('error', (err) => {
  console.error('Unexpected PG pool error', err);
});
/* eslint-enable no-console */

module.exports = pool;

