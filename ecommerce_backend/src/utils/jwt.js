const jwt = require('jsonwebtoken');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    const err = new Error('Missing JWT_SECRET environment variable');
    err.statusCode = 500;
    throw err;
  }
  return secret;
}

// PUBLIC_INTERFACE
function signAccessToken(payload, options = {}) {
  /** Sign a JWT access token for the given payload. */
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: '7d',
    ...options,
  });
}

// PUBLIC_INTERFACE
function verifyAccessToken(token) {
  /** Verify a JWT access token and return its decoded payload. */
  return jwt.verify(token, getJwtSecret());
}

module.exports = {
  signAccessToken,
  verifyAccessToken,
};

