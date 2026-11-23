import { BadRequestError } from '../errors/AppError.js';

/**
 * Middleware kiểm tra và chuẩn hoá dữ liệu đầu vào bằng Zod.
 * Kết quả hợp lệ được gán vào `req.valid = { params, query, body }`.
 *
 * @param {{
 *   params?: import('zod').ZodSchema,
 *   query?: import('zod').ZodSchema,
 *   body?: import('zod').ZodSchema
 * }} schemas
 */
export function validate(schemas) {
  return (req, res, next) => {
    const valid = {
      params: req.params,
      query: req.query,
      body: req.body,
    };
    const errors = [];

    // 1. Kiểm tra params nếu có schema
    if (schemas.params) {
      const result = schemas.params.safeParse(req.params);
      if (!result.success) {
        errors.push(
          ...result.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          }))
        );
      } else {
        valid.params = result.data;
      }
    }

    // 2. Kiểm tra query nếu có schema:
    // req.query là getter chỉ đọc trong Express 5, tạo bản sao nông và loại bỏ các key có giá trị rỗng ""
    if (schemas.query) {
      const cleanQuery = {};
      for (const [key, val] of Object.entries(req.query || {})) {
        if (val !== '') {
          cleanQuery[key] = val;
        }
      }

      const result = schemas.query.safeParse(cleanQuery);
      if (!result.success) {
        errors.push(
          ...result.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          }))
        );
      } else {
        valid.query = result.data;
      }
    }

    // 3. Kiểm tra body nếu có schema:
    // Express 5 để req.body là undefined nếu request POST không gửi body
    if (schemas.body) {
      const rawBody = req.body ?? {};
      const result = schemas.body.safeParse(rawBody);
      if (!result.success) {
        errors.push(
          ...result.error.issues.map((i) => ({
            field: i.path.join('.'),
            message: i.message,
          }))
        );
      } else {
        valid.body = result.data;
      }
    }

    if (errors.length > 0) {
      return next(new BadRequestError('Dữ liệu không hợp lệ', errors));
    }

    req.valid = valid;
    next();
  };
}
