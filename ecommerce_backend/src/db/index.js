const pool = require('./pool');

/**
 * Executes a SQL query with parameters.
 * @param {string} text SQL query
 * @param {any[]} params Parameter array
 * @returns {Promise<import('pg').QueryResult>}
 */
async function query(text, params = []) {
  return pool.query(text, params);
}

/**
 * Runs a function inside a transaction using a dedicated client.
 * Automatically commits/rollbacks.
 * @template T
 * @param {(client: import('pg').PoolClient) => Promise<T>} fn transaction body
 * @returns {Promise<T>}
 */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const res = await fn(client);
    await client.query('COMMIT');
    return res;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // ignore rollback errors
    }
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  query,
  withTransaction,
  pool,
};

