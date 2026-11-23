import { NotFoundError } from '../errors/AppError.js';

/**
 * Kiểm tra quyền sở hữu tài nguyên.
 * Nếu không thoả mãn điều kiện, ném NotFoundError (404) để không làm lộ sự tồn tại của tài nguyên.
 * @param {boolean} condition
 * @throws {NotFoundError}
 */
export function assertOwner(condition) {
  if (!condition) {
    throw new NotFoundError();
  }
}
