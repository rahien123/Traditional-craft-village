import { UnauthorizedError, ForbiddenError } from '../errors/AppError.js';
import { verifyToken } from '../utils/jwt.util.js';
import prisma from '../../infrastructure/database/prisma.client.js';

/**
 * Middleware xác thực phiên đăng nhập qua cookie `vcraft_token`.
 * Giải mã JWT và truy vấn DB kiểm tra trạng thái tài khoản (ACTIVE) trên từng request.
 * Gắn `req.user = { id, role, status, artisanId? }`.
 */
export async function authMiddleware(req, res, next) {
  const token = req.cookies?.vcraft_token;
  if (!token) {
    return next(new UnauthorizedError('Vui lòng đăng nhập'));
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    return next(new UnauthorizedError('Vui lòng đăng nhập'));
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
    select: {
      id: true,
      role: true,
      status: true,
      artisanProfile: {
        select: { id: true },
      },
    },
  });

  if (!user) {
    return next(new UnauthorizedError('Vui lòng đăng nhập'));
  }

  if (user.status === 'PENDING') {
    return next(new ForbiddenError('Tài khoản đang chờ Ban quản lý duyệt'));
  }

  if (user.status === 'SUSPENDED') {
    return next(new ForbiddenError('Tài khoản đã bị khoá'));
  }

  if (user.status !== 'ACTIVE') {
    return next(new ForbiddenError('Tài khoản không hoạt động'));
  }

  req.user = {
    id: user.id,
    role: user.role,
    status: user.status,
    artisanId: user.artisanProfile?.id,
  };

  next();
}
