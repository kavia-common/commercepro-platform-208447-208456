const db = require('../db');

function toMoney(productRow) {
  return {
    ...productRow,
    priceCents: productRow.price_cents,
    currencyCode: productRow.currency_code,
    categoryId: productRow.category_id,
    imageUrl: productRow.image_url,
    isActive: productRow.is_active,
  };
}

class ProductsController {
  async list(req, res, next) {
    try {
      const q = (req.query.q || '').toString().trim();
      const category = (req.query.category || '').toString().trim(); // slug

      const params = [];
      let where = 'WHERE p.is_active = TRUE';

      if (q) {
        params.push(`%${q}%`);
        where += ` AND (p.name ILIKE $${params.length} OR p.description ILIKE $${params.length})`;
      }

      if (category) {
        params.push(category);
        where += ` AND c.slug = $${params.length}`;
      }

      const { rows } = await db.query(
        `
        SELECT
          p.id, p.category_id, p.name, p.slug, p.description,
          p.price_cents, p.currency_code, p.sku, p.image_url, p.is_active,
          c.name AS category_name, c.slug AS category_slug,
          i.quantity, i.reserved
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN inventory i ON i.product_id = p.id
        ${where}
        ORDER BY p.created_at DESC
        `,
        params
      );

      const out = rows.map((r) => ({
        ...toMoney(r),
        categoryName: r.category_name,
        categorySlug: r.category_slug,
        inventory: r.quantity == null ? null : { quantity: r.quantity, reserved: r.reserved },
      }));

      return res.status(200).json(out);
    } catch (err) {
      return next(err);
    }
  }

  async get(req, res, next) {
    try {
      const { id } = req.params;

      const { rows } = await db.query(
        `
        SELECT
          p.id, p.category_id, p.name, p.slug, p.description,
          p.price_cents, p.currency_code, p.sku, p.image_url, p.is_active,
          c.name AS category_name, c.slug AS category_slug,
          i.quantity, i.reserved
        FROM products p
        LEFT JOIN categories c ON c.id = p.category_id
        LEFT JOIN inventory i ON i.product_id = p.id
        WHERE p.id = $1
        `,
        [id]
      );

      const r = rows[0];
      if (!r) return res.status(404).json({ message: 'Product not found' });

      return res.status(200).json({
        ...toMoney(r),
        categoryName: r.category_name,
        categorySlug: r.category_slug,
        inventory: r.quantity == null ? null : { quantity: r.quantity, reserved: r.reserved },
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new ProductsController();
