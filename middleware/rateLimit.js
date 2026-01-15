const rateLimit = {}; // { IP: { count, resetTime } }

const rateLimitMiddleware = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const limit = 5;
  const windowMs = 60 * 1000;

  // TODO 1 + 2: First time or window expired
  if (!rateLimit[ip] || now > rateLimit[ip].resetTime) {
    rateLimit[ip] = {
      count: 1,
      resetTime: now + windowMs,
    };
    return next();
  }

  // TODO 3: Increment count
  rateLimit[ip].count++;

  // TODO 4: Check limit
  if (rateLimit[ip].count > limit) {
    return res.status(429).json({ message: "Too many requests" });
  }

  // TODO 5: Allow
  next();
};

module.exports = rateLimitMiddleware;
