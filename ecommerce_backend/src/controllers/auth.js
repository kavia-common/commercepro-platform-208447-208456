const db = require('../db');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signAccessToken } = require('../utils/jwt');

class AuthController {
  /**
   * Register a new user (customer).
   * Accepts: { name, email, password }
   */
  async register(req, res, next) {
    try {
      const { name, email, password } = req.body;

      const [firstName, ...rest] = String(name || '').trim().split(/\s+/);
      const lastName = rest.join(' ') || null;

      const passwordHash = await hashPassword(password);

      const userRes = await db.query(
        `
        INSERT INTO users (email, password_hash, first_name, last_name, is_active)
        VALUES ($1, $2, $3, $4, TRUE)
        RETURNING id, email, first_name, last_name, created_at
        `,
        [email, passwordHash, firstName || null, lastName]
      );

      const user = userRes.rows[0];

      // Ensure customer role exists (seed should have it).
      await db.query(
        `
        INSERT INTO user_roles (user_id, role_id)
        SELECT $1, r.id FROM roles r WHERE r.name='customer'
        ON CONFLICT DO NOTHING
        `,
        [user.id]
      );

      const token = signAccessToken({ sub: user.id, email: user.email });

      return res.status(201).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: [user.first_name, user.last_name].filter(Boolean).join(' '),
        },
      });
    } catch (err) {
      // Unique violation on email
      if (err && err.code === '23505') {
        return res.status(409).json({ message: 'Email already registered' });
      }
      return next(err);
    }
  }

  /**
   * Login.
   * Accepts: { email, password }
   */
  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      const { rows } = await db.query(
        `
        SELECT id, email, password_hash, first_name, last_name, is_active
        FROM users
        WHERE email = $1
        `,
        [email]
      );

      const user = rows[0];
      if (!user) return res.status(401).json({ message: 'Invalid credentials' });
      if (!user.is_active) return res.status(403).json({ message: 'User is inactive' });

      const ok = await verifyPassword(password, user.password_hash);
      if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

      await db.query('UPDATE users SET last_login_at = now() WHERE id = $1', [user.id]);

      const token = signAccessToken({ sub: user.id, email: user.email });

      return res.status(200).json({
        token,
        user: {
          id: user.id,
          email: user.email,
          name: [user.first_name, user.last_name].filter(Boolean).join(' '),
        },
      });
    } catch (err) {
      return next(err);
    }
  }

  /**
   * Current user.
   */
  async me(req, res) {
    const user = req.user;
    return res.status(200).json({
      id: user.id,
      email: user.email,
      name: [user.firstName, user.lastName].filter(Boolean).join(' '),
      isAdmin: user.isAdmin,
    });
  }
}

module.exports = new AuthController();
