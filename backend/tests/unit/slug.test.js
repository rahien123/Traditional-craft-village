import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { toSlug, uniqueSlug } from '../../src/common/utils/slug.util.js';

describe('Unit Test: slug.util.js', () => {
  it('chuyển chuỗi tiếng Việt có dấu và đ sang slug hợp lệ', () => {
    assert.strictEqual(toSlug('Xưởng Gốm Gia Truyền Đình Đô'), 'xuong-gom-gia-truyen-dinh-do');
    assert.strictEqual(toSlug('Ấm chén men ngọc Bát Tràng'), 'am-chen-men-ngoc-bat-trang');
  });

  it('loại bỏ ký tự đặc biệt và dấu gạch thừa', () => {
    assert.strictEqual(toSlug('---Sản phẩm #123! Đẹp tuyệt vời---'), 'san-pham-123-dep-tuyet-voi');
  });

  it('cấm slug "me" và fallback sang "item"', () => {
    assert.strictEqual(toSlug('me'), 'item');
    assert.strictEqual(toSlug('ME'), 'item');
    assert.strictEqual(toSlug('   me   '), 'item');
  });

  it('fallback sang "item" nếu chuỗi rỗng hoặc toàn ký tự đặc biệt', () => {
    assert.strictEqual(toSlug(''), 'item');
    assert.strictEqual(toSlug('   '), 'item');
    assert.strictEqual(toSlug('!!!@@@###'), 'item');
    assert.strictEqual(toSlug(null), 'item');
  });

  it('uniqueSlug sinh hậu tố -2, -3 khi đụng slug đã có', async () => {
    const existing = new Set(['binh-hoa', 'binh-hoa-2']);
    const existsFn = async (slug) => existing.has(slug);

    const slug1 = await uniqueSlug('Bình hoa', existsFn);
    assert.strictEqual(slug1, 'binh-hoa-3');

    const slug2 = await uniqueSlug('me', existsFn);
    assert.strictEqual(slug2, 'item');
  });
});
