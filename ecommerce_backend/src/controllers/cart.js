const db = require('../db');

function mapCartItemRow(r) {
  return {
    id: r.id,
    productId: r.product_id,
    quantity: r.quantity,
    unitPriceCents: r.unit_price_cents,
    currencyCode: r.currency_code,
    product: {
      id: r.product_id,
      name: r.product_name,
      imageUrl: r.product_image_url,
    },
    lineTotalCents: r.quantity * r.unit_price_cents,
  };
}

class CartController {
  async getCart(req, res, next) {
    try {
      const userId = req.user.id;

      const cartRes = await db.query('SELECT id, user_id FROM carts WHERE user_id=$1', [userId]);
      let cart = cartRes.rows[0];

      if (!cart) {
        const created = await db.query(
          'INSERT INTO carts (user_id) VALUES ($1) RETURNING id, user_id',
          [userId]
        );
        cart = created.rows[0];
      }

      const itemsRes = await db.query(
        `
        SELECT
          ci.id,
          ci.product_id,
          ci.quantity,
          ci.unit_price_cents,
          ci.currency_code,
          p.name AS product_name,
          p.image_url AS product_image_url
        FROM cart_items ci
        JOIN products p ON p.id = ci.product_id
        WHERE ci.cart_id = $1
        ORDER BY ci.created_at DESC
        `,
        [cart.id]
      );

      const items = itemsRes.rows.map(mapCartItemRow);
      const subtotalCents = items.reduce((sum, it) => sum + it.lineTotalCents, 0);

      return res.status(200).json({
        id: cart.id,
        userId: cart.user_id,
        items,
        subtotalCents,
        currencyCode: items[0]?.currencyCode || 'USD',
      });
    } catch (err) {
      return next(err);
    }
  }

  async addItem(req, res, next) {
    try {
      const userId = req.user.id;
      const { productId, quantity } = req.body;

      const cartRes = await db.query('SELECT id FROM carts WHERE user_id=$1', [userId]);
      let cart = cartRes.rows[0];
      if (!cart) {
        const created = await db.query('INSERT INTO carts (user_id) VALUES ($1) RETURNING id', [
          userId,
        ]);
        cart = created.rows[0];
      }

      const prodRes = await db.query(
        `
        SELECT id, price_cents, currency_code
        FROM products
        WHERE id=$1 AND is_active=TRUE
        `,
        [productId]
      );
      const prod = prodRes.rows[0];
      if (!prod) return res.status(404).json({ message: 'Product not found' });

      const upsert = await db.query(
        `
        INSERT INTO cart_items (cart_id, product_id, quantity, unit_price_cents, currency_code)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (cart_id, product_id)
        DO UPDATE SET
          quantity = cart_items.quantity + EXCLUDED.quantity,
          updated_at = now()
        RETURNING id, cart_id, product_id, quantity, unit_price_cents, currency_code
        `,
        [cart.id, productId, quantity, prod.price_cents, prod.currency_code]
      );

      return res.status(201).json({
        id: upsert.rows[0].id,
        productId: upsert.rows[0].product_id,
        quantity: upsert.rows[0].quantity,
      });
    } catch (err) {
      return next(err);
    }
  }

  async updateItem(req, res, next) {
    try {
      const userId = req.user.id;
      const { itemId } = req.params;
      const { quantity } = req.body;

      const cartRes = await db.query('SELECT id FROM carts WHERE user_id=$1', [userId]);
      const cart = cartRes.rows[0];
      if (!cart) return res.status(404).json({ message: 'Cart not found' });

      const { rows } = await db.query(
        `
        UPDATE cart_items
        SET quantity=$1, updated_at=now()
        WHERE id=$2 AND cart_id=$3
        RETURNING id, product_id, quantity
        `,
        [quantity, itemId, cart.id]
      );

      if (!rows[0]) return res.status(404).json({ message: 'Cart item not found' });

      return res.status(200).json({
        id: rows[0].id,
        productId: rows[0].product_id,
        quantity: rows[0].quantity,
      });
    } catch (err) {
      return next(err);
    }
  }

  async removeItem(req, res, next) {
    try {
      const userId = req.user.id;
      const { itemId } = req.params;

      const cartRes = await db.query('SELECT id FROM carts WHERE user_id=$1', [userId]);
      const cart = cartRes.rows[0];
      if (!cart) return res.status(404).json({ message: 'Cart not found' });

      const del = await db.query('DELETE FROM cart_items WHERE id=$1 AND cart_id=$2', [
        itemId,
        cart.id,
      ]);

      if (del.rowCount === 0) return res.status(404).json({ message: 'Cart item not found' });

      return res.status(204).send();
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new CartController();
