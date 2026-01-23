const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");
const User = require("../models/User");
const jwt = require("jsonwebtoken");

let authToken;

// Connect DB before all tests
beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);

  // Create test user
  const testUser = await User.create({
    username: "testuser",
    email: "test@example.com",
    password: "password123",
  });

  // Generate token
  authToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET, {
    expiresIn: "1h",
  });
});

// Cleanup & disconnect after all tests
afterAll(async () => {
  await User.deleteMany({ email: "test@example.com" });
  await mongoose.connection.close();
});

afterEach(async () => {
  // Clean up test posts after each test
  const Post = require("../models/Post");
  await Post.deleteMany({ author: "Ahmad" });
  await Post.deleteMany({ author: "Test" });
});

describe("POST /api/posts", () => {
  describe("POST /api/posts", () => {
    // TEST #1 - ADD THIS!
    test("should create new post with valid data", async () => {
      const newPost = {
        title: "Test Post",
        author: "Ahmad",
        content: "Testing integration",
      };

      const response = await request(app)
        .post("/api/posts")
        .set("Authorization", `Bearer ${authToken}`)
        .send(newPost);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.post).toHaveProperty("_id");
    });

    test("should return 400 when content is missing", async () => {
      // existing...
    });

    // ... rest of tests
  });
  test("should return 400 when content is missing", async () => {
    const invalidPost = {
      title: "Test Post",
      author: "Ahmad",
      // content missing!
    };

    const response = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${authToken}`)
      .send(invalidPost);

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
  });
  test("should return 401 when token expired", async () => {
    // Generate expired token (expires in 1 second)
    const expiredToken = jwt.sign(
      { userId: "someId" },
      process.env.JWT_SECRET,
      { expiresIn: "1ms" }, // Expire immediately
    );

    // Wait to ensure it's expired
    await new Promise((resolve) => setTimeout(resolve, 10));

    const response = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${expiredToken}`)
      .send({
        title: "Test",
        author: "Test",
        content: "Test content here",
      });

    expect(response.status).toBe(401);
  });
  test("should get single post by ID", async () => {
    // First create a post
    const newPost = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        title: "Get Test",
        author: "Ahmad",
        content: "Testing GET endpoint",
      });

    const postId = newPost.body.post._id;

    // Then GET it
    const response = await request(app).get(`/api/posts/${postId}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.post.title).toBe("Get Test");
  });
  test("should delete own post", async () => {
    // Create post first
    const newPost = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        title: "Delete Test",
        author: "Ahmad",
        content: "Will be deleted",
      });

    const postId = newPost.body.post._id;

    // Delete it
    const response = await request(app)
      .delete(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.message).toContain("deleted");
  });
  test("should update own post", async () => {
    // Create post first
    const newPost = await request(app)
      .post("/api/posts")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        title: "Original Title",
        author: "Ahmad",
        content: "Original content",
      });

    const postId = newPost.body.post._id;

    // Update it
    const response = await request(app)
      .put(`/api/posts/${postId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        title: "Updated Title",
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.post.title).toBe("Updated Title");
  });
});
