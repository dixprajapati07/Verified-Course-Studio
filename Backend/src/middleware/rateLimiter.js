import rateLimit from 'express-rate-limit';

export const executionRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // Limit each IP to 30 runs per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Execution rate limit exceeded. Please wait a moment before running more code.'
  }
});

export const generationRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 20 generation calls per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Generation rate limit reached. Please wait a few seconds before generating more materials.'
  }
});
