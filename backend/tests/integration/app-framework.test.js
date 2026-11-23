import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import app from '../../src/app.js';

describe('Integration Test: Backend Skeleton App', () => {
  let server;
  let baseUrl;

  before(async () => {
    await new Promise((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://127.0.0.1:${port}`;
        resolve();
      });
    });
  });

  after(async () => {
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });

  it('trả về 404 khi gọi route không tồn tại (catch-all Express 5)', async () => {
    const res = await fetch(`${baseUrl}/api/v1/non-existent-route`);
    assert.strictEqual(res.status, 404);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.message, 'Không tìm thấy tài nguyên');
  });

  it('xử lý lỗi cú pháp JSON (SyntaxError) trả về 400', async () => {
    const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'invalid-json{',
    });
    assert.strictEqual(res.status, 400);
    const data = await res.json();
    assert.strictEqual(data.success, false);
    assert.strictEqual(data.message, 'JSON không hợp lệ');
  });

  it('có các header bảo mật từ helmet', async () => {
    const res = await fetch(`${baseUrl}/api/v1/non-existent-route`);
    assert.ok(res.headers.get('x-content-type-options'), 'Có x-content-type-options');
  });
});
