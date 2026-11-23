/**
 * Chuẩn hoá phản hồi JSON thành công
 * @param {import('express').Response} res
 * @param {any} data
 * @param {object} [meta]
 * @param {number} [status=200]
 */
export function ok(res, data, meta, status = 200) {
  const payload = {
    success: true,
    data,
  };

  if (meta !== undefined && meta !== null) {
    payload.meta = meta;
  }

  return res.status(status).json(payload);
}
