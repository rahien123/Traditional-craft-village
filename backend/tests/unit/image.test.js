import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { thumbOf } from '../../src/common/utils/image.util.js';

describe('Unit Test: image.util.js', () => {
  it('chuyển URL ảnh full sang thumb chính xác', () => {
    const fullUrl = '/uploads/full/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d.webp';
    const expectedThumb = '/uploads/thumb/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d.webp';
    assert.strictEqual(thumbOf(fullUrl), expectedThumb);
  });

  it('trả về chuỗi rỗng nếu url không hợp lệ hoặc rỗng', () => {
    assert.strictEqual(thumbOf(null), '');
    assert.strictEqual(thumbOf(''), '');
    assert.strictEqual(thumbOf(undefined), '');
  });
});
