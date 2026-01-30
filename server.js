const dotenv = require("dotenv");
const envFile = `.env.${process.env.NODE_ENV || "development"}`;
dotenv.config({ path: envFile });
const express = require("express");
const cors = require("cors");
const connectDB = require("./db");
const Post = require("./models/Post");
const authRoutes = require("./routes/auth");
const auth = require("./middleware/auth");
const {
  validatePost,
  validatePostUpdate,
  handleValidationErrors,
} = require("./middleware/validation");
const rateLimitMiddleware = require("./middleware/rateLimit");
const asyncHandler = require("./middleware/asyncHandler");
const { errorHandler } = require("./middleware/errorHandler");
const { AppError } = require("./middleware/errorHandler");
const logger = require("./logger");

const postsRoutes = require("./routes/posts");
const app = express();

// CORS
app.use(
  cors({
    origin: "http://lcoalhost:5173",
    credentials: true,
  }),
);

const { specs, swaggerUi } = require("./swagger");

// Swagger documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(specs));

app.use("/uploads", express.static("uploads"));

// ADD THESE 2 LINES (after app = express())
app.use(express.json()); // Parse JSON data
app.use(express.urlencoded({ extended: true })); // Parse form data

// Hardcoded data (top of file, after middleware)
const posts = [];

app.use("/api/auth", authRoutes);

app.use("/api/posts", postsRoutes);

// POST - Create
app.post(
  "/api/posts",
  auth,
  validatePost,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { title, author, content } = req.body;
    const newPost = await Post.create({
      title,
      author,
      content,
      user: req.userId,
    });
    res
      .status(201)
      .json({ success: true, message: "Post created", post: newPost });
  }),
);

// GET - User's posts
app.get(
  "/api/posts/my/posts",
  auth,
  asyncHandler(async (req, res) => {
    const posts = await Post.find({ user: req.userId })
      .populate("user", "username email")
      .sort({ createdAt: -1 });
    res.json({ success: true, count: posts.length, posts });
  }),
);

// GET - All posts (pagination)
app.get(
  "/api/posts",
  asyncHandler(async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    let query = {};
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { content: { $regex: req.query.search, $options: "i" } },
      ];
    }
    if (req.query.author) {
      query.author = { $regex: req.query.author, $options: "i" };
    }

    let sortOption = { createdAt: -1 };
    if (req.query.sortBy) {
      const sortField = req.query.sortBy;
      const sortOrder = req.query.order === "asc" ? 1 : -1;
      sortOption = { [sortField]: sortOrder };
    }

    const total = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .populate("user", "username email")
      .skip(skip)
      .limit(limit)
      .sort(sortOption);

    res.json({
      success: true,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      count: posts.length,
      posts,
    });
  }),
);

// GET - Single post
app.get(
  "/api/posts/:id",
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id).populate(
      "user",
      "username email",
    );
    if (!post) throw new AppError("Post not found", 404);
    res.json({ success: true, post });
  }),
);

// PUT - Update
app.put(
  "/api/posts/:id",
  auth,
  validatePostUpdate,
  handleValidationErrors,
  asyncHandler(async (req, res) => {
    const { title, author, content } = req.body;
    const post = await Post.findById(req.params.id);

    if (!post) throw new AppError("Post not found", 404);
    if (post.user.toString() !== req.userId) {
      throw new AppError("Forbidden: You can only edit your own posts", 403);
    }

    const updateData = {};
    if (title) updateData.title = title;
    if (author) updateData.author = author;
    if (content) updateData.content = content;

    const updatedPost = await Post.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    );

    res.json({ success: true, message: "Post updated", post: updatedPost });
  }),
);

// DELETE
app.delete(
  "/api/posts/:id",
  auth,
  asyncHandler(async (req, res) => {
    const post = await Post.findById(req.params.id);

    if (!post) throw new AppError("Post not found", 404);
    if (post.user.toString() !== req.userId) {
      throw new AppError("Forbidden: You can only delete your own posts", 403);
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Post deleted" });
  }),
);

// Error middleware - LAST!
app.use(errorHandler);

// Only listen if not in test mode
if (process.env.NODE_ENV !== "test") {
  connectDB().then(() => {
    app.listen(process.env.PORT || 3000, () => {
      logger.info(`Server running on port ${process.env.PORT || 3000}`);
      console.log(
        `Server running on http://localhost:${process.env.PORT || 3000}`,
      );
    });
  });
}

module.exports = app;

module.exports = app; // Export for testing
