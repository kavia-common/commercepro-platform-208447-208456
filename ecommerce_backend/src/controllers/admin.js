const db = require('../db');

class AdminController {
  async summary(req, res, next) {
    try {
      const [users, orders, products] = await Promise.all([
        db.query('SELECT count(*)::int AS count FROM users'),
        db.query('SELECT count(*)::int AS count FROM orders'),
        db.query('SELECT count(*)::int AS count FROM products'),
      ]);

      return res.status(200).json({
        users: users.rows[0].count,
        orders: orders.rows[0].count,
        products: products.rows[0].count,
      });
    } catch (err) {
      return next(err);
    }
  }

  async listOrders(req, res, next) {
    try {
      const { rows } = await db.query(
        `
        SELECT
          o.*,
          u.email AS user_email
        FROM orders o
        LEFT JOIN users u ON u.id = o.user_id
        ORDER BY o.created_at DESC
        LIMIT 200
        `
      );

      return res.status(200).json(
        rows.map((o) => ({
          id: o.id,
          userId: o.user_id,
          userEmail: o.user_email,
          status: o.status,
          subtotalCents: o.subtotal_cents,
          taxCents: o.tax_cents,
          shippingCents: o.shipping_cents,
          totalCents: o.total_cents,
          currencyCode: o.currency_code,
          createdAt: o.created_at,
          updatedAt: o.updated_at,
        }))
      );
    } catch (err) {
      return next(err);
    }
  }

  async listProducts(req, res, next) {
    try {
      const { rows } = await db.query(
        `
        SELECT
          p.id, p.category_id, p.name, p.slug, p.description,
          p.price_cents, p.currency_code, p.sku, p.image_url, p.is_active,
          c.slug AS category_slug
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        ORDER BY p.created_at DESC
        LIMIT 500
        `
      );

      return res.status(200).json(
        rows.map((p) => ({
          id: p.id,
          categoryId: p.category_id,
          categorySlug: p.category_slug,
          name: p.name,
          slug: p.slug,
          description: p.description,
          priceCents: p.price_cents,
          currencyCode: p.currency_code,
          sku: p.sku,
          imageUrl: p.image_url,
          isActive: p.is_active,
        }))
      );
    } catch (err) {
      return next(err);
    }
  }

  async createProduct(req, res, next) {
    try {
      const {
        categoryId,
        name,
        slug,
        description,
        priceCents,
        currencyCode,
        sku,
        imageUrl,
        isActive,
      } = req.body;

      const { rows } = await db.query(
        `
        INSERT INTO products (category_id, name, slug, description, price_cents, currency_code, sku, image_url, is_active)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
        RETURNING id
        `,
        [
          categoryId || null,
          name,
          slug,
          description || null,
          priceCents,
          currencyCode || 'USD',
          sku || null,
          imageUrl || null,
          isActive !== false,
        ]
      );

      return res.status(201).json({ id: rows[0].id });
    } catch (err) {
      if (err && err.code === '23505') return res.status(409).json({ message: 'Duplicate slug/sku' });
      return next(err);
    }
  }

  async updateProduct(req, res, next) {
    try {
      const { id } = req.params;
      const {
        categoryId,
        name,
        slug,
        description,
        priceCents,
        currencyCode,
        sku,
        imageUrl,
        isActive,
      } = req.body;

      const { rowCount } = await db.query(
        `
        UPDATE products
        SET
          category_id=$1,
          name=$2,
          slug=$3,
          description=$4,
          price_cents=$5,
          currency_code=$6,
          sku=$7,
          image_url=$8,
          is_active=$9,
          updated_at=now()
        WHERE id=$10
        `,
        [
          categoryId || null,
          name,
          slug,
          description || null,
          priceCents,
          currencyCode || 'USD',
          sku || null,
          imageUrl || null,
          isActive !== false,
          id,
        ]
      );

      if (rowCount === 0) return res.status(404).json({ message: 'Product not found' });
      return res.status(200).json({ id });
    } catch (err) {
      if (err && err.code === '23505') return res.status(409).json({ message: 'Duplicate slug/sku' });
      return next(err);
    }
  }
}

module.exports = new AdminController();
