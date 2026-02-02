const express = require('express');
const { body, param, query } = require('express-validator');

const authController = require('../controllers/auth');
const categoriesController = require('../controllers/categories');
const productsController = require('../controllers/products');
const reviewsController = require('../controllers/reviews');
const cartController = require('../controllers/cart');
const ordersController = require('../controllers/orders');
const adminController = require('../controllers/admin');

const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   - name: Auth
 *   - name: Catalog
 *   - name: Cart
 *   - name: Orders
 *   - name: Reviews
 *   - name: Admin
 *
 * components:
 *   securitySchemes:
 *     BearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 *   schemas:
 *     Error:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *         user:
 *           type: object
 *           properties:
 *             id: { type: string, format: uuid }
 *             email: { type: string }
 *             name: { type: string }
 *     Category:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         name: { type: string }
 *         slug: { type: string }
 *         description: { type: string, nullable: true }
 *     Product:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         categoryId: { type: string, format: uuid, nullable: true }
 *         name: { type: string }
 *         slug: { type: string }
 *         description: { type: string, nullable: true }
 *         priceCents: { type: integer, minimum: 0 }
 *         currencyCode: { type: string, example: USD }
 *         sku: { type: string, nullable: true }
 *         imageUrl: { type: string, nullable: true }
 *         isActive: { type: boolean }
 *     Review:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         productId: { type: string, format: uuid }
 *         userId: { type: string, format: uuid, nullable: true }
 *         rating: { type: integer, minimum: 1, maximum: 5 }
 *         title: { type: string, nullable: true }
 *         body: { type: string, nullable: true }
 *         createdAt: { type: string, format: date-time }
 *     CartItem:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         productId: { type: string, format: uuid }
 *         quantity: { type: integer, minimum: 1 }
 *         unitPriceCents: { type: integer, minimum: 0 }
 *         currencyCode: { type: string }
 *         lineTotalCents: { type: integer, minimum: 0 }
 *     Cart:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         userId: { type: string, format: uuid }
 *         items:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/CartItem'
 *         subtotalCents: { type: integer, minimum: 0 }
 *         currencyCode: { type: string }
 *     Order:
 *       type: object
 *       properties:
 *         id: { type: string, format: uuid }
 *         userId: { type: string, format: uuid, nullable: true }
 *         status:
 *           type: string
 *           enum: [pending, paid, shipped, completed, cancelled, refunded]
 *         subtotalCents: { type: integer, minimum: 0 }
 *         taxCents: { type: integer, minimum: 0 }
 *         shippingCents: { type: integer, minimum: 0 }
 *         totalCents: { type: integer, minimum: 0 }
 *         currencyCode: { type: string }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 */

// ---------- Auth ----------

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new customer account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, minLength: 6 }
 *     responses:
 *       201:
 *         description: Registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       409:
 *         description: Email already registered
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post(
  '/auth/register',
  body('name').isString().isLength({ min: 1 }),
  body('email').isEmail(),
  body('password').isString().isLength({ min: 6 }),
  validate,
  authController.register.bind(authController)
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive a JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Logged in
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/AuthResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post(
  '/auth/login',
  body('email').isEmail(),
  body('password').isString().isLength({ min: 1 }),
  validate,
  authController.login.bind(authController)
);

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get current user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user
 *       401:
 *         description: Unauthorized
 */
router.get('/auth/me', requireAuth, authController.me.bind(authController));

// ---------- Catalog ----------

/**
 * @swagger
 * /api/categories:
 *   get:
 *     tags: [Catalog]
 *     summary: List categories
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items: { $ref: '#/components/schemas/Category' }
 */
router.get('/categories', categoriesController.list.bind(categoriesController));

/**
 * @swagger
 * /api/products:
 *   get:
 *     tags: [Catalog]
 *     summary: List active products
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Search by name/description
 *       - in: query
 *         name: category
 *         schema: { type: string }
 *         description: Category slug
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  '/products',
  query('q').optional().isString(),
  query('category').optional().isString(),
  validate,
  productsController.list.bind(productsController)
);

/**
 * @swagger
 * /api/products/{id}:
 *   get:
 *     tags: [Catalog]
 *     summary: Get product by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
router.get(
  '/products/:id',
  param('id').isUUID(),
  validate,
  productsController.get.bind(productsController)
);

// ---------- Reviews ----------

/**
 * @swagger
 * /api/products/{id}/reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: List approved reviews for a product
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200:
 *         description: OK
 */
router.get(
  '/products/:id/reviews',
  param('id').isUUID(),
  validate,
  reviewsController.listForProduct.bind(reviewsController)
);

/**
 * @swagger
 * /api/products/{id}/reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Create a review for a product (one per user)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating]
 *             properties:
 *               rating: { type: integer, minimum: 1, maximum: 5 }
 *               title: { type: string }
 *               body: { type: string }
 *     responses:
 *       201: { description: Created }
 *       409: { description: Duplicate review }
 */
router.post(
  '/products/:id/reviews',
  requireAuth,
  param('id').isUUID(),
  body('rating').isInt({ min: 1, max: 5 }),
  body('title').optional().isString(),
  body('body').optional().isString(),
  validate,
  reviewsController.createForProduct.bind(reviewsController)
);

// ---------- Cart ----------

/**
 * @swagger
 * /api/cart:
 *   get:
 *     tags: [Cart]
 *     summary: Get current user's cart
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Cart' }
 */
router.get('/cart', requireAuth, cartController.getCart.bind(cartController));

/**
 * @swagger
 * /api/cart/items:
 *   post:
 *     tags: [Cart]
 *     summary: Add an item to cart (or increment quantity)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [productId, quantity]
 *             properties:
 *               productId: { type: string, format: uuid }
 *               quantity: { type: integer, minimum: 1 }
 *     responses:
 *       201: { description: Added }
 */
router.post(
  '/cart/items',
  requireAuth,
  body('productId').isUUID(),
  body('quantity').isInt({ min: 1 }),
  validate,
  cartController.addItem.bind(cartController)
);

/**
 * @swagger
 * /api/cart/items/{itemId}:
 *   patch:
 *     tags: [Cart]
 *     summary: Update cart item quantity
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [quantity]
 *             properties:
 *               quantity: { type: integer, minimum: 1 }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 */
router.patch(
  '/cart/items/:itemId',
  requireAuth,
  param('itemId').isUUID(),
  body('quantity').isInt({ min: 1 }),
  validate,
  cartController.updateItem.bind(cartController)
);

/**
 * @swagger
 * /api/cart/items/{itemId}:
 *   delete:
 *     tags: [Cart]
 *     summary: Remove item from cart
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: itemId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       204: { description: Deleted }
 *       404: { description: Not found }
 */
router.delete(
  '/cart/items/:itemId',
  requireAuth,
  param('itemId').isUUID(),
  validate,
  cartController.removeItem.bind(cartController)
);

// ---------- Checkout / Orders ----------

/**
 * @swagger
 * /api/checkout:
 *   post:
 *     tags: [Orders]
 *     summary: Checkout current cart into an order
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               shipping:
 *                 type: object
 *                 properties:
 *                   name: { type: string }
 *                   address1: { type: string }
 *                   address2: { type: string }
 *                   city: { type: string }
 *                   state: { type: string }
 *                   postalCode: { type: string }
 *                   country: { type: string }
 *               payment:
 *                 type: object
 *                 properties:
 *                   provider: { type: string }
 *                   reference: { type: string }
 *     responses:
 *       201:
 *         description: Order created
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Order' }
 *       400:
 *         description: Cart empty
 */
router.post('/checkout', requireAuth, ordersController.checkout.bind(ordersController));

/**
 * @swagger
 * /api/orders:
 *   get:
 *     tags: [Orders]
 *     summary: List current user's orders
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200: { description: OK }
 */
router.get('/orders', requireAuth, ordersController.listMine.bind(ordersController));

/**
 * @swagger
 * /api/orders/{orderId}:
 *   get:
 *     tags: [Orders]
 *     summary: Get a single order (must belong to current user)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: orderId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: OK }
 *       404: { description: Not found }
 */
router.get(
  '/orders/:orderId',
  requireAuth,
  param('orderId').isUUID(),
  validate,
  ordersController.getMine.bind(ordersController)
);

// ---------- Admin ----------

/**
 * @swagger
 * /api/admin/summary:
 *   get:
 *     tags: [Admin]
 *     summary: Admin dashboard summary counts
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200: { description: OK }
 *       403: { description: Forbidden }
 */
router.get('/admin/summary', requireAuth, requireAdmin, adminController.summary.bind(adminController));

/**
 * @swagger
 * /api/admin/orders:
 *   get:
 *     tags: [Admin]
 *     summary: List latest orders (admin)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200: { description: OK }
 */
router.get(
  '/admin/orders',
  requireAuth,
  requireAdmin,
  adminController.listOrders.bind(adminController)
);

/**
 * @swagger
 * /api/admin/products:
 *   get:
 *     tags: [Admin]
 *     summary: List products (admin)
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200: { description: OK }
 */
router.get(
  '/admin/products',
  requireAuth,
  requireAdmin,
  adminController.listProducts.bind(adminController)
);

/**
 * @swagger
 * /api/admin/products:
 *   post:
 *     tags: [Admin]
 *     summary: Create product (admin)
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug, priceCents]
 *             properties:
 *               categoryId: { type: string, format: uuid }
 *               name: { type: string }
 *               slug: { type: string }
 *               description: { type: string }
 *               priceCents: { type: integer, minimum: 0 }
 *               currencyCode: { type: string, example: USD }
 *               sku: { type: string }
 *               imageUrl: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       201: { description: Created }
 */
router.post(
  '/admin/products',
  requireAuth,
  requireAdmin,
  body('name').isString().isLength({ min: 1 }),
  body('slug').isString().isLength({ min: 1 }),
  body('priceCents').isInt({ min: 0 }),
  body('categoryId').optional({ nullable: true }).isUUID(),
  body('currencyCode').optional().isString().isLength({ min: 3, max: 3 }),
  body('sku').optional().isString(),
  body('imageUrl').optional().isString(),
  body('isActive').optional().isBoolean(),
  validate,
  adminController.createProduct.bind(adminController)
);

/**
 * @swagger
 * /api/admin/products/{id}:
 *   put:
 *     tags: [Admin]
 *     summary: Update product (admin)
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, slug, priceCents]
 *             properties:
 *               categoryId: { type: string, format: uuid }
 *               name: { type: string }
 *               slug: { type: string }
 *               description: { type: string }
 *               priceCents: { type: integer, minimum: 0 }
 *               currencyCode: { type: string, example: USD }
 *               sku: { type: string }
 *               imageUrl: { type: string }
 *               isActive: { type: boolean }
 *     responses:
 *       200: { description: Updated }
 *       404: { description: Not found }
 */
router.put(
  '/admin/products/:id',
  requireAuth,
  requireAdmin,
  param('id').isUUID(),
  body('name').isString().isLength({ min: 1 }),
  body('slug').isString().isLength({ min: 1 }),
  body('priceCents').isInt({ min: 0 }),
  body('categoryId').optional({ nullable: true }).isUUID(),
  body('currencyCode').optional().isString().isLength({ min: 3, max: 3 }),
  body('sku').optional().isString(),
  body('imageUrl').optional().isString(),
  body('isActive').optional().isBoolean(),
  validate,
  adminController.updateProduct.bind(adminController)
);

module.exports = router;

