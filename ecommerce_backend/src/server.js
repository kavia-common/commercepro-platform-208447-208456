const app = require('./app');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

const server = app.listen(PORT, HOST, () => {
  // Note: In production this may be behind a TLS proxy; protocol is determined by the proxy.
  /* eslint-disable no-console */
  console.log(`Server running on ${HOST}:${PORT}`);
  /* eslint-enable no-console */
});

/**
 * Ensure listen/bind failures (EADDRINUSE, EACCES, etc.) don't crash the process
 * with an unhandled 'error' event, which manifests as "connection refused".
 */
server.on('error', (err) => {
  /* eslint-disable no-console */
  console.error('Failed to start HTTP server:', err);
  /* eslint-enable no-console */
  // Exiting helps preview manager restart and surfaces a clear failure reason in logs.
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  /* eslint-disable no-console */
  console.log('SIGTERM signal received: closing HTTP server');
  /* eslint-enable no-console */

  server.close(() => {
    /* eslint-disable no-console */
    console.log('HTTP server closed');
    /* eslint-enable no-console */
    process.exit(0);
  });
});

module.exports = server;
