const db = require('../db');

class CategoriesController {
  async list(req, res, next) {
    try {
      const { rows } = await db.query(
        `
        SELECT id, name, slug, description
        FROM categories
        ORDER BY name ASC
        `
      );
      return res.status(200).json(rows);
    } catch (err) {
      return next(err);
    }
  }
}

module.exports = new CategoriesController();

