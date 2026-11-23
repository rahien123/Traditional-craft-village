import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import {
  validateImageBuffer,
  processImage,
  getSeedAssetOrPlaceholder,
} from '../../src/infrastructure/storage/image.service.js';
import { UnsupportedMediaTypeError } from '../../src/common/errors/AppError.js';

describe('Unit Test: image.service.js', () => {
  it('validateImageBuffer ném UnsupportedMediaTypeError khi buffer không phải ảnh', async () => {
    const fakeBuffer = Buffer.from('this is not an image');
    await assert.rejects(
      async () => validateImageBuffer(fakeBuffer),
      UnsupportedMediaTypeError
    );
  });

  it('validateImageBuffer chấp nhận buffer ảnh hợp lệ (PNG/JPEG/WebP)', async () => {
    const validPng = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 3,
        background: { r: 255, g: 0, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const meta = await validateImageBuffer(validPng);
    assert.strictEqual(meta.format, 'png');
  });

  it('processImage nén ảnh và trả về url, thumbnailUrl đúng định dạng .webp', async () => {
    const validPng = await sharp({
      create: {
        width: 100,
        height: 100,
        channels: 3,
        background: { r: 0, g: 255, b: 0 },
      },
    })
      .png()
      .toBuffer();

    const result = await processImage(validPng);
    assert.ok(result.url.startsWith('/uploads/full/'));
    assert.ok(result.url.endsWith('.webp'));
    assert.ok(result.thumbnailUrl.startsWith('/uploads/thumb/'));
    assert.ok(result.thumbnailUrl.endsWith('.webp'));
  });

  it('getSeedAssetOrPlaceholder tự động sinh ảnh dự phòng khi chưa có file thực tế', async () => {
    const result = await getSeedAssetOrPlaceholder({
      assetPath: 'non-existent-asset.jpg',
      fallbackTitle: 'Ảnh thử nghiệm',
      categoryName: 'Test',
    });

    assert.ok(result.url.startsWith('/uploads/full/'));
    assert.ok(result.url.endsWith('.webp'));
  });
});
