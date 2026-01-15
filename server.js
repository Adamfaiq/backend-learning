require("dotenv").config();

const express = require("express");
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

const app = express();

// ADD THESE 2 LINES (after app = express())
app.use(express.json()); // Parse JSON data
app.use(express.urlencoded({ extended: true })); // Parse form data
app.use(rateLimitMiddleware);

// Hardcoded data (top of file, after middleware)
const posts = [];

app.use("/api/auth", authRoutes);

// GET all posts
app.post(
  "/api/posts",
  auth,
  validatePost,
  handleValidationErrors,
  async (req, res) => {
    console.log("POST route hit!"); // LOG 1
    console.log("Body:", req.body); // LOG 2
    try {
      const { title, author, content } = req.body;
      console.log("Creating post..."); // LOG 3

      // No need for manual validation anymore!
      // Middleware already checked

      const newPost = await Post.create({
        title,
        author,
        content,
        user: req.userId,
      });
      console.log("Post created:", newPost); // LOG 4

      res.status(201).json({
        message: "Post created successfully",
        post: newPost,
      });
    } catch (error) {
      res.status(500).json({ error: "Server error", details: error.message });
      console.log("Error:", error); // LOG 5
    }
  }
);

// GET all posts
// Get logged-in user's posts only
app.get("/api/posts/my/posts", auth, async (req, res) => {
  try {
    const posts = await Post.find({ user: req.userId })
      .populate("user", "username email")
      .sort({ createdAt: -1 });

    res.json({
      count: posts.length,
      posts: posts,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

app.get("/api/posts", async (req, res) => {
  try {
    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Build query
    let query = {};

    // Search
    if (req.query.search) {
      query.$or = [
        { title: { $regex: req.query.search, $options: "i" } },
        { content: { $regex: req.query.search, $options: "i" } },
      ];
    }

    // Filter by author
    if (req.query.author) {
      query.author = { $regex: req.query.author, $options: "i" };
    }

    // Sorting
    let sortOption = { createdAt: -1 }; // Default: newest first

    if (req.query.sortBy) {
      const sortField = req.query.sortBy;
      const sortOrder = req.query.order === "asc" ? 1 : -1;
      sortOption = { [sortField]: sortOrder };
    }

    // Get total
    const total = await Post.countDocuments(query);

    // Get posts
    const posts = await Post.find(query)
      .populate("user", "username email")
      .skip(skip)
      .limit(limit)
      .sort(sortOption);

    res.json({
      page: page,
      limit: limit,
      total: total,
      totalPages: Math.ceil(total / limit),
      count: posts.length,
      posts: posts,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Single Post - Id
app.get("/api/posts/:id", async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).populate(
      "user",
      "username email"
    ); // ADD THIS

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json(post);
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Update Post
app.put(
  "/api/posts/:id",
  auth,
  validatePostUpdate,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, author, content } = req.body;

      // Find post
      const post = await Post.findById(req.params.id);

      if (!post) {
        return res.status(404).json({ error: "Post not found" });
      }

      // Check ownership - IMPORTANT!
      if (post.user.toString() !== req.userId) {
        return res.status(403).json({
          error: "Forbidden: You can only edit your own posts",
        });
      }

      // Build update object
      const updateData = {};
      if (title) updateData.title = title;
      if (author) updateData.author = author;
      if (content) updateData.content = content;

      const updatedPost = await Post.findByIdAndUpdate(
        req.params.id,
        updateData,
        { new: true, runValidators: true } // ADD runValidators!
      );

      if (!updatedPost) {
        return res.status(404).json({ error: "Post not found" });
      }

      res.json({ message: "Post updated successfully", post: updatedPost });
    } catch (error) {
      res.status(500).json({ error: "Server error", details: error.message });
    }
  }
);

// Delete
app.delete("/api/posts/:id", auth, async (req, res) => {
  try {
    // Find post
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Check ownership
    if (post.user.toString() !== req.userId) {
      return res.status(403).json({
        error: "Forbidden: You can only delete your own posts",
      });
    }
    const deletedPost = await Post.findByIdAndDelete(req.params.id);

    if (!deletedPost) {
      return res.status(404).json({ error: "Post not found" });
    }

    res.json({
      message: "Post deleted successfully",
      deletedPost: deletedPost,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// CREATE New Post ( Post Request)
app.post("/api/posts", async (req, res) => {
  try {
    const { title, author, content } = req.body;

    // Validation
    if (!title || !author || !content) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["title", "author", "content"],
      });
    }

    // Create new post in database
    const newPost = await Post.create({
      title,
      author,
      content,
    });

    res.status(201).json({
      message: "Post created successfully",
      post: newPost,
    });
  } catch (error) {
    res.status(500).json({ error: "Server error", details: error.message });
  }
});

// Update Post
app.put("/api/posts/:id", (req, res) => {
  const postId = req.params.id;
  const { title, author, content } = req.body;

  // Find post index in array
  const postIndex = posts.findIndex((p) => p.id == postId);

  // If post not found
  if (postIndex === -1) {
    return res.status(404).json({
      error: "Post not found",
    });
  }

  // Validation - at least one field required
  if (!title && !author && !content) {
    return res.status(400).json({
      error: "At least one field required to update",
    });
  }

  // Update fields (only if provided)
  if (title) posts[postIndex].title = title;
  if (author) posts[postIndex].author = author;
  if (content) posts[postIndex].content = content;

  // Return updated post
  res.json({
    message: "Post updated successfully",
    post: posts[postIndex],
  });
});

// Delete
app.delete("/api/posts/:id", (req, res) => {
  const postId = req.params.id;

  // Find post index
  const postIndex = posts.findIndex((p) => p.id == postId);

  // If post not found
  if (postIndex === -1) {
    return res.status(404).json({
      error: "Post not found",
    });
  }

  // Remove post from array
  const deletedPost = posts.splice(postIndex, 1);

  // Return success
  res.json({
    message: "Post deleted successfully",
    deletedPost: deletedPost[0],
  });
});

connectDB().then(() => {
  app.listen(process.env.PORT || 3000, () => {
    console.log(
      `Server running on http://localhost:${process.env.PORT || 3000}`
    );
  });
});

// app.listen(3000, () => {
//   console.log("server running on http://localhost:3000");
// });
