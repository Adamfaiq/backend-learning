const mongoose = require("mongoose");
const logger = require("./logger");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info("MongoDB connected successfully! ✅");
  } catch (error) {
    logger.error("MongoDB connection failed", error.message);
    process.exit(1);
  }
};

module.exports = connectDB;
