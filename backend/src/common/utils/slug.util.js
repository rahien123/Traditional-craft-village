/**
 * Chuyển đổi chuỗi tiếng Việt thành slug kebab-case.
 * Bỏ dấu tiếng Việt (đ->d), cấm slug 'me' và chuỗi rỗng (fallback sang 'item').
 * @param {string} text
 * @returns {string}
 */
export function toSlug(text) {
  if (!text || typeof text !== 'string') {
    return 'item';
  }

  let slug = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

  if (!slug || slug === 'me') {
    return 'item';
  }

  return slug;
}

/**
 * Sinh slug duy nhất, tự động thêm hậu tố -2, -3 nếu đã tồn tại.
 * @param {string} text
 * @param {(slug: string) => Promise<boolean>} existsFn Hàm kiểm tra slug đã tồn tại trong DB chưa
 * @returns {Promise<string>}
 */
export async function uniqueSlug(text, existsFn) {
  const base = toSlug(text);

  const exists = await existsFn(base);
  if (!exists) {
    return base;
  }

  let counter = 2;
  while (true) {
    const candidate = `${base}-${counter}`;
    const candidateExists = await existsFn(candidate);
    if (!candidateExists) {
      return candidate;
    }
    counter += 1;
  }
}
