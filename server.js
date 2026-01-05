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

const app = express();

// ADD THESE 2 LINES (after app = express())
app.use(express.json()); // Parse JSON data
app.use(express.urlencoded({ extended: true })); // Parse form data

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

      const newPost = await Post.create({ title, author, content });
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
app.get("/api/posts", async (req, res) => {
  try {
    const posts = await Post.find();

    res.json({
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
    const post = await Post.findById(req.params.id);

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
  validatePostUpdate,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { title, author, content } = req.body;

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
app.delete("/api/posts/:id", async (req, res) => {
  try {
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
