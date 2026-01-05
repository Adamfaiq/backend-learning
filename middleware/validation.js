const { body, validationResult } = require("express-validator");

// Validation rules for creating post
const validatePost = [
  body("title")
    .trim()
    .notEmpty()
    .withMessage("Title is required")
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be 3-100 characters"),

  body("author")
    .trim()
    .notEmpty()
    .withMessage("Author is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Author must be 2-50 characters"),

  body("content")
    .trim()
    .notEmpty()
    .withMessage("Content is required")
    .isLength({ min: 10, max: 5000 })
    .withMessage("Content must be 10-5000 characters"),
];

// Validation for updating post (all fields optional)
const validatePostUpdate = [
  body("title")
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage("Title must be 3-100 characters"),

  body("author")
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage("Author must be 2-50 characters"),

  body("content")
    .optional()
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage("Content must be 10-5000 characters"),

  // At least one field must be provided
  body().custom((value, { req }) => {
    if (!req.body.title && !req.body.author && !req.body.content) {
      throw new Error(
        "At least one field (title, author, or content) must be provided"
      );
    }
    return true;
  }),
];

// Middleware to check validation results
const handleValidationErrors = (req, res, next) => {
  console.log("Validation middleware running..."); // LOG 1

  const errors = validationResult(req);
  console.log("Validation errors:", errors.array()); // LOG 2

  if (!errors.isEmpty()) {
    console.log("Validation failed!"); // LOG 3
    return res.status(400).json({
      error: "Validation failed",
      details: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }

  console.log("Validation passed, calling next()"); // LOG 4
  next();
};

module.exports = { validatePost, validatePostUpdate, handleValidationErrors };

// .trim() - Remove spaces
// .notEmpty() - Not blank
// .isLength() - Check length
// .withMessage() - Custom error
