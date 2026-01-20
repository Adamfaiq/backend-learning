// utils/logger.js
const winston = require("winston");

const logger = winston.createLogger({
  level: "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level}] ${message}`;
    }),
  ),
  transports: [
    // Console log (development)
    new winston.transports.Console(),

    // File log (production / persistent)
    new winston.transports.File({
      filename: "logs/combined.log",
    }),
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error", // ← Level filter kat SINI je
    }),
  ],
});

module.exports = logger;
