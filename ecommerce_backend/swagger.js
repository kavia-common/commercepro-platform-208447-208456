const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'CommercePro E-Commerce API',
      version: '1.0.0',
      description:
        'REST API for the CommercePro e-commerce platform (auth, catalog, cart, orders, reviews, admin).',
    },
  },
  // Scan all route files (including nested) for JSDoc @swagger blocks.
  apis: ['./src/routes/**/*.js'],
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
