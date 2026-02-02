const db = require('../db');

function mapOrderRow(r) {
  return {
    id: r.id,
    userId: r.user_id,
    status: r.status,
    subtotalCents: r.subtotal_cents,
    taxCents: r.tax_cents,
    shippingCents: r.shipping_cents,
    totalCents: r.total_cents,
    currencyCode: r.currency_code,
    shipping: {
      name: r.shipping_name,
      address1: r.shipping_address1,
      address2: r.shipping_address2,
      city: r.shipping_city,
      state: r.shipping_state,
      postalCode: r.shipping_postal_code,
      country: r.shipping_country,
    },
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

class OrdersController {
  async checkout(req, res, next) {
    try {
      const userId = req.user.id;
      const shipping = req.body?.shipping || {};
      const payment = req.body?.payment || {};

      const result = await db.withTransaction(async (client) => {
        // Ensure cart exists
        const cartRes = await client.query('SELECT id FROM carts WHERE user_id=$1', [userId]);
        const cart = cartRes.rows[0];
        if (!cart) {
          const err = new Error('Cart is empty');
          err.statusCode = 400;
          throw err;
        }

        const itemsRes = await client.query(
          `
          SELECT
            ci.id,
            ci.product_id,
            ci.quantity,
            ci.unit_price_cents,
            ci.currency_code,
            p.name AS product_name,
            p.sku AS sku
          FROM cart_items ci
          JOIN products p ON p.id = ci.product_id
          WHERE ci.cart_id = $1
          `,
          [cart.id]
        );

        const items = itemsRes.rows;
        if (items.length === 0) {
          const err = new Error('Cart is empty');
          err.statusCode = 400;
          throw err;
        }

        const currencyCode = items[0].currency_code || 'USD';
        const subtotalCents = items.reduce(
          (sum, it) => sum + it.quantity * it.unit_price_cents,
          0
        );

        // For now: tax/shipping = 0 (frontend can pass later; we keep server authoritative).
        const taxCents = 0;
        const shippingCents = 0;
        const totalCents = subtotalCents + taxCents + shippingCents;

        const orderRes = await client.query(
          `
          INSERT INTO orders (
            user_id, status,
            subtotal_cents, tax_cents, shipping_cents, total_cents,
            currency_code,
            payment_provider, payment_reference,
            shipping_name, shipping_address1, shipping_address2, shipping_city,
            shipping_state, shipping_postal_code, shipping_country
          )
          VALUES (
            $1, 'pending',
            $2, $3, $4, $5,
            $6,
            $7, $8,
            $9, $10, $11, $12,
            $13, $14, $15
          )
          RETURNING *
          `,
          [
            userId,
            subtotalCents,
            taxCents,
            shippingCents,
            totalCents,
            currencyCode,
            payment.provider || null,
            payment.reference || null,
            shipping.name || null,
            shipping.address1 || null,
            shipping.address2 || null,
            shipping.city || null,
            shipping.state || null,
            shipping.postalCode || null,
            shipping.country || null,
          ]
        );

        const order = orderRes.rows[0];

        // Create order items
        for (const it of items) {
          const lineTotalCents = it.quantity * it.unit_price_cents;
          await client.query(
            `
            INSERT INTO order_items (
              order_id, product_id, product_name, sku,
              quantity, unit_price_cents, currency_code, line_total_cents
            )
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
            `,
            [
              order.id,
              it.product_id,
              it.product_name,
              it.sku,
              it.quantity,
              it.unit_price_cents,
              it.currency_code,
              lineTotalCents,
            ]
          );
        }

        // Clear cart items
        await client.query('DELETE FROM cart_items WHERE cart_id=$1', [cart.id]);

        return order;
      });

      return res.status(201).json(mapOrderRow(result));
    } catch (err) {
      if (err.statusCode) return res.status(err.statusCode).json({ message: err.message });
      return next(err);
    }
  }

  async listMine(req, res, next) {
    try {
      const userId = req.user.id;

      const { rows } = await db.query(
        `
        SELECT *
        FROM orders
        WHERE user_id = $1
        ORDER BY created_at DESC
        `,
        [userId]
      );

      return res.status(200).json(rows.map(mapOrderRow));
    } catch (err) {
      return next(err);
    }
  }

  async getMine(req, res, next) {
    try {
      const userId = req.user.id;
      const { orderId } = req.params;

      const orderRes = await db.query('SELECT * FROM orders WHERE id=$1 AND user_id=$2', [
        orderId,
        userId,
      ]);
      const order = orderRes.rows[0];
      if (!order) return res.status(404).json({ message: 'Order not found' });

      const itemsRes = await db.query(
        `
        SELECT id, product_id, product_name, sku, quantity, unit_price_cents, currency_code, line_total_cents, created_at
        FROM order_items
        WHERE order_id = $1
        ORDER BY created_at ASC
        `,
        [orderId]
      );

      return res.status(200).json({
        ...mapOrderRow(order),
        items: itemsRes.rows.map((it) => ({
          id: it.id,
          productId: it.product_id,
          productName: it.product_name,
          sku: it.sku,
          quantity: it.quantity,
          unitPriceCents: it.unit_price_cents,
          currencyCode: it.currency_code,
          lineTotalCents: it.line_total_cents,
        })),
      });
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new OrdersController();
