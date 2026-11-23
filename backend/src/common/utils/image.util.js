/**
 * Chuyển đổi đường dẫn ảnh bản full sang ảnh thumbnail.
 * Thuần chuỗi: /uploads/full/ -> /uploads/thumb/ (cùng tên file).
 * @param {string} url
 * @returns {string}
 */
export function thumbOf(url) {
  if (!url || typeof url !== 'string') {
    return '';
  }
  return url.replace('/uploads/full/', '/uploads/thumb/');
}
