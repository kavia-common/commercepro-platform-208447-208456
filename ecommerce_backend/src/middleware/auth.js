const { verifyAccessToken } = require('../utils/jwt');
const db = require('../db');

function extractBearerToken(req) {
  const hdr = req.headers.authorization || '';
  const [scheme, token] = hdr.split(' ');
  if (scheme !== 'Bearer' || !token) return null;
  return token;
}

/**
 * Attach req.user (id/email/isAdmin) if token valid.
 * Respond 401 if missing/invalid token.
 */
// PUBLIC_INTERFACE
async function requireAuth(req, res, next) {
  try {
    const token = extractBearerToken(req);
    if (!token) return res.status(401).json({ message: 'Missing Authorization Bearer token' });

    const decoded = verifyAccessToken(token);
    const userId = decoded?.sub;

    if (!userId) return res.status(401).json({ message: 'Invalid token' });

    const { rows } = await db.query(
      `
      SELECT
        u.id,
        u.email,
        u.first_name,
        u.last_name,
        u.is_active,
        EXISTS (
          SELECT 1
          FROM user_roles ur
          JOIN roles r ON r.id = ur.role_id
          WHERE ur.user_id = u.id AND r.name = 'admin'
        ) AS is_admin
      FROM users u
      WHERE u.id = $1
      `,
      [userId]
    );

    const user = rows[0];
    if (!user) return res.status(401).json({ message: 'User not found' });
    if (!user.is_active) return res.status(403).json({ message: 'User is inactive' });

    req.user = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      isAdmin: Boolean(user.is_admin),
    };

    return next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

/**
 * Require that req.user.isAdmin is true.
 */
// PUBLIC_INTERFACE
function requireAdmin(req, res, next) {
  /** Enforce admin access (must be used after requireAuth). */
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  if (!req.user.isAdmin) return res.status(403).json({ message: 'Admin access required' });
  return next();
}

module.exports = {
  requireAuth,
  requireAdmin,
};

