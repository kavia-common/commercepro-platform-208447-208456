const db = require('../db');

class ReviewsController {
  async listForProduct(req, res, next) {
    try {
      const { id: productId } = req.params;

      const { rows } = await db.query(
        `
        SELECT
          r.id,
          r.product_id,
          r.user_id,
          r.rating,
          r.title,
          r.body,
          r.created_at,
          COALESCE(u.first_name || ' ' || u.last_name, u.email, 'Anonymous') AS author_name
        FROM reviews r
        LEFT JOIN users u ON u.id = r.user_id
        WHERE r.product_id = $1 AND r.is_approved = TRUE
        ORDER BY r.created_at DESC
        `,
        [productId]
      );

      return res.status(200).json(
        rows.map((r) => ({
          id: r.id,
          productId: r.product_id,
          userId: r.user_id,
          rating: r.rating,
          title: r.title,
          body: r.body,
          createdAt: r.created_at,
          authorName: (r.author_name || '').trim(),
        }))
      );
    } catch (err) {
      return next(err);
    }
  }

  async createForProduct(req, res, next) {
    try {
      const { id: productId } = req.params;
      const { rating, title, body } = req.body;

      // Ensure product exists
      const prod = await db.query('SELECT id FROM products WHERE id=$1', [productId]);
      if (prod.rowCount === 0) return res.status(404).json({ message: 'Product not found' });

      const { rows } = await db.query(
        `
        INSERT INTO reviews (product_id, user_id, rating, title, body, is_approved)
        VALUES ($1, $2, $3, $4, $5, TRUE)
        RETURNING id, product_id, user_id, rating, title, body, created_at
        `,
        [productId, req.user.id, rating, title || null, body || null]
      );

      const r = rows[0];
      return res.status(201).json({
        id: r.id,
        productId: r.product_id,
        userId: r.user_id,
        rating: r.rating,
        title: r.title,
        body: r.body,
        createdAt: r.created_at,
      });
    } catch (err) {
      // Unique constraint: one review per product per user
      if (err && err.code === '23505') {
        return res.status(409).json({ message: 'You already reviewed this product' });
      }
      return next(err);
    }
  }
}

module.exports = new ReviewsController();
