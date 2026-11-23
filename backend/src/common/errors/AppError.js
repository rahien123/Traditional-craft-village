export class AppError extends Error {
  constructor(status, message, errors = undefined) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    this.errors = errors;
    this.isAppError = true;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Dữ liệu không hợp lệ', errors = undefined) {
    super(400, message, errors);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Vui lòng đăng nhập', errors = undefined) {
    super(401, message, errors);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Bạn không có quyền thực hiện thao tác này', errors = undefined) {
    super(403, message, errors);
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Không tìm thấy tài nguyên', errors = undefined) {
    super(404, message, errors);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Dữ liệu đã tồn tại', errors = undefined) {
    super(409, message, errors);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Ảnh vượt quá 5MB', errors = undefined) {
    super(413, message, errors);
  }
}

export class UnsupportedMediaTypeError extends AppError {
  constructor(message = 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP', errors = undefined) {
    super(415, message, errors);
  }
}
