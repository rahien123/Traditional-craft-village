import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { assertOwner } from '../../src/common/utils/ownership.util.js';
import { NotFoundError } from '../../src/common/errors/AppError.js';

describe('Unit Test: ownership.util.js', () => {
  it('không ném lỗi khi điều kiện sở hữu thoả mãn (true)', () => {
    assert.doesNotThrow(() => assertOwner(true));
    assert.doesNotThrow(() => assertOwner(1 === 1));
  });

  it('ném NotFoundError (404) khi điều kiện sở hữu vi phạm (false) - chuẩn BR-15', () => {
    assert.throws(() => assertOwner(false), NotFoundError);
    try {
      assertOwner(false);
    } catch (err) {
      assert.strictEqual(err.status, 404);
      assert.strictEqual(err.message, 'Không tìm thấy tài nguyên');
    }
  });
});
