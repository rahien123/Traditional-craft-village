import { ForbiddenError, UnauthorizedError } from '../errors/AppError.js';

/**
 * Middleware phân quyền theo vai trò (Role-Based Access Control).
 * Yêu cầu đặt sau authMiddleware.
 * @param  {...string} roles Danh sách vai trò được phép truy cập
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Vui lòng đăng nhập'));
    }

    if (!roles.includes(req.user.role)) {
      return next(new ForbiddenError('Bạn không có quyền thực hiện thao tác này'));
    }

    next();
  };
}
