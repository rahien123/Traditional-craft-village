import multer from 'multer';
import { AppError } from '../errors/AppError.js';
import { env } from '../../config/env.js';

/**
 * Middleware xử lý lỗi tập trung.
 * Bắt đủ: AppError, MulterError, SyntaxError (JSON), Prisma (P2002, P2025, P2003).
 * Dựng response chuẩn dạng: { success: false, message: string, errors?: array }
 */
export function errorMiddleware(err, req, res, next) {
  let status = 500;
  let message = 'Đã có lỗi hệ thống';
  let errors = undefined;

  // 1. Lỗi nghiệp vụ do ứng dụng chủ động ném ra
  if (err instanceof AppError || err.isAppError) {
    status = err.status;
    message = err.message;
    errors = err.errors;
  }
  // 2. Lỗi upload ảnh từ Multer
  else if (err instanceof multer.MulterError || err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      status = 413;
      message = 'Ảnh vượt quá 5MB';
    } else {
      status = 400;
      message = err.message || 'Lỗi tải lên tệp tin';
    }
  }
  // 3. Lỗi JSON body sai cú pháp
  else if (
    (err instanceof SyntaxError || err.name === 'SyntaxError') &&
    (err.status === 400 || err.statusCode === 400 || err.type === 'entity.parse.failed')
  ) {
    status = 400;
    message = 'JSON không hợp lệ';
  }
  // 4. Lỗi từ Prisma Client
  else if (err.code) {
    switch (err.code) {
      case 'P2002': {
        status = 409;
        const target = Array.isArray(err.meta?.target)
          ? err.meta.target.join(',')
          : String(err.meta?.target || '');
        if (target.includes('stepOrder')) {
          message = 'Thứ tự bước sản xuất đã tồn tại';
        } else if (target.includes('email')) {
          message = 'Email đã được đăng ký';
        } else {
          message = 'Dữ liệu đã tồn tại';
        }
        break;
      }
      case 'P2025': {
        status = 404;
        message = 'Không tìm thấy tài nguyên';
        break;
      }
      case 'P2003': {
        status = 400;
        message = 'Dữ liệu tham chiếu không tồn tại';
        break;
      }
      default: {
        status = 500;
        message = 'Đã có lỗi hệ thống';
      }
    }
  }

  if (status === 500 && env.NODE_ENV !== 'production') {
    console.error('Unhandled Server Error:', err);
  }

  const response = {
    success: false,
    message,
  };

  if (errors !== undefined) {
    response.errors = errors;
  }

  return res.status(status).json(response);
}
