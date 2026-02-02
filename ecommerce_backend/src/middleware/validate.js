const { validationResult } = require('express-validator');

// PUBLIC_INTERFACE
function validate(req, res, next) {
  /** Return 400 if express-validator found any request validation errors. */
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({
    message: 'Validation error',
    errors: errors.array().map((e) => ({
      path: e.path,
      msg: e.msg,
    })),
  });
}

module.exports = {
  validate,
};

