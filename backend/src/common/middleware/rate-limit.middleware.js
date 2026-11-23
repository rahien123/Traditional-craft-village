import rateLimit from 'express-rate-limit';
import { AppError } from '../errors/AppError.js';

/**
 * Giới hạn tần suất đăng nhập sai: 10 lần sai / 15 phút / IP
 */
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError(429, 'Quá nhiều lần thử, vui lòng thử lại sau'));
  },
});

/**
 * Giới hạn tần suất đăng ký: 10 lần / 1 giờ / IP
 */
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new AppError(429, 'Quá nhiều lần thử, vui lòng thử lại sau'));
  },
});
