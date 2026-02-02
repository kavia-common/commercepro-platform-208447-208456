const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 10;

// PUBLIC_INTERFACE
function hashPassword(password) {
  /** Hash a plaintext password using bcrypt. */
  return bcrypt.hash(password, SALT_ROUNDS);
}

// PUBLIC_INTERFACE
function verifyPassword(password, passwordHash) {
  /** Verify a plaintext password against a bcrypt hash. */
  return bcrypt.compare(password, passwordHash);
}

module.exports = {
  hashPassword,
  verifyPassword,
};

