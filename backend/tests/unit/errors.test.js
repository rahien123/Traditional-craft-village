import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  AppError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  PayloadTooLargeError,
  UnsupportedMediaTypeError,
} from '../../src/common/errors/AppError.js';

describe('Unit Test: AppError classes', () => {
  it('AppError cơ sở khởi tạo đúng status, message và errors', () => {
    const err = new AppError(418, "I'm a teapot", [{ field: 'tea', message: 'No coffee' }]);
    assert.strictEqual(err.status, 418);
    assert.strictEqual(err.message, "I'm a teapot");
    assert.deepStrictEqual(err.errors, [{ field: 'tea', message: 'No coffee' }]);
    assert.strictEqual(err.isAppError, true);
  });

  it('các lớp con có mã HTTP và thông báo mặc định bằng tiếng Việt chính xác', () => {
    const badReq = new BadRequestError();
    assert.strictEqual(badReq.status, 400);
    assert.strictEqual(badReq.message, 'Dữ liệu không hợp lệ');

    const unauth = new UnauthorizedError();
    assert.strictEqual(unauth.status, 401);
    assert.strictEqual(unauth.message, 'Vui lòng đăng nhập');

    const forbid = new ForbiddenError();
    assert.strictEqual(forbid.status, 403);
    assert.strictEqual(forbid.message, 'Bạn không có quyền thực hiện thao tác này');

    const notFound = new NotFoundError();
    assert.strictEqual(notFound.status, 404);
    assert.strictEqual(notFound.message, 'Không tìm thấy tài nguyên');

    const conflict = new ConflictError();
    assert.strictEqual(conflict.status, 409);
    assert.strictEqual(conflict.message, 'Dữ liệu đã tồn tại');

    const tooLarge = new PayloadTooLargeError();
    assert.strictEqual(tooLarge.status, 413);
    assert.strictEqual(tooLarge.message, 'Ảnh vượt quá 5MB');

    const unsupported = new UnsupportedMediaTypeError();
    assert.strictEqual(unsupported.status, 415);
    assert.strictEqual(unsupported.message, 'Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP');
  });
});
