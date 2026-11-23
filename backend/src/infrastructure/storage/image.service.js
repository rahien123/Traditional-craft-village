import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import sharp from 'sharp';
import { UnsupportedMediaTypeError } from '../../common/errors/AppError.js';

const ALLOWED_FORMATS = ['jpeg', 'png', 'webp'];
const SEED_ASSETS_DIR = path.resolve('prisma/seed-assets');

/**
 * Tìm file ảnh trong prisma/seed-assets/, tự động dò tìm các đuôi mở rộng (.jpg, .jpeg, .png, .webp).
 * @param {string} relativePath
 * @returns {string | null}
 */
function findSeedAssetFile(relativePath) {
  const directPath = path.join(SEED_ASSETS_DIR, relativePath);
  if (fs.existsSync(directPath) && fs.statSync(directPath).isFile()) {
    return directPath;
  }

  // Thử các đuôi mở rộng nếu đường dẫn chưa có đuôi
  const ext = path.extname(relativePath);
  if (!ext) {
    const candidates = ['.jpg', '.jpeg', '.png', '.webp'];
    for (const c of candidates) {
      const candidatePath = `${directPath}${c}`;
      if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
        return candidatePath;
      }
    }
  }

  // Thử tìm ở thư mục gốc seed-assets nếu relativePath có chứa thư mục con
  const basename = path.basename(relativePath);
  const rootPath = path.join(SEED_ASSETS_DIR, basename);
  if (fs.existsSync(rootPath) && fs.statSync(rootPath).isFile()) {
    return rootPath;
  }

  // Thử tìm ở thư mục gốc seed-assets với các đuôi mở rộng
  if (!ext) {
    const candidates = ['.jpg', '.jpeg', '.png', '.webp'];
    for (const c of candidates) {
      const candidatePath = path.join(SEED_ASSETS_DIR, `${basename}${c}`);
      if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
        return candidatePath;
      }
    }
  }

  return null;
}

/**
 * Nạp ảnh từ prisma/seed-assets/ nếu có sẵn, hoặc tự sinh ảnh WebP dự phòng nếu chưa có file thực tế.
 * Đảm bảo seed.js luôn chạy thành công 100% kể cả khi chưa có ảnh trong seed-assets/.
 * @param {{
 *   assetPath: string,
 *   fallbackTitle?: string,
 *   categoryName?: string,
 *   bgColor?: string,
 *   fgColor?: string
 * }} options
 * @returns {Promise<{ url: string, thumbnailUrl: string }>}
 */
export async function getSeedAssetOrPlaceholder({
  assetPath,
  fallbackTitle = 'vCraft',
  categoryName = 'Làng nghề',
  bgColor = '#B4532A',
  fgColor = '#FFFFFF',
}) {
  const matchedPath = findSeedAssetFile(assetPath);
  if (matchedPath) {
    try {
      const buffer = await fs.promises.readFile(matchedPath);
      return await processImage(buffer);
    } catch (err) {
      console.warn(
        `[seed] Không thể xử lý ảnh ${matchedPath}: ${err.message}. Sử dụng ảnh dự phòng.`
      );
    }
  }

  // Nếu chưa có file trong seed-assets, tự động sinh ảnh mẫu Sharp WebP
  return generatePlaceholderWebp({
    title: fallbackTitle,
    categoryName,
    bgColor,
    fgColor,
  });
}

/**
 * Kiểm tra tính hợp lệ của buffer ảnh bằng Sharp metadata.
 * Chặn các file rác, file mã độc hoặc định dạng khác (như SVG/GIF) đổi đuôi.
 * @param {Buffer} buffer
 * @returns {Promise<sharp.Metadata>}
 * @throws {UnsupportedMediaTypeError}
 */
export async function validateImageBuffer(buffer) {
  try {
    const meta = await sharp(buffer).metadata();
    if (!meta.format || !ALLOWED_FORMATS.includes(meta.format)) {
      throw new UnsupportedMediaTypeError('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP');
    }
    return meta;
  } catch (err) {
    if (err instanceof UnsupportedMediaTypeError) {
      throw err;
    }
    throw new UnsupportedMediaTypeError('Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP');
  }
}

/**
 * Xử lý nén ảnh thành hai bản .webp (thumb 400px và full 1200px) và ghi ra đĩa.
 * @param {Buffer} buffer
 * @returns {Promise<{ url: string, thumbnailUrl: string }>}
 */
export async function processImage(buffer) {
  await validateImageBuffer(buffer);

  const id = crypto.randomUUID();
  const filename = `${id}.webp`;

  const fullDir = path.resolve('uploads/full');
  const thumbDir = path.resolve('uploads/thumb');

  if (!fs.existsSync(fullDir)) fs.mkdirSync(fullDir, { recursive: true });
  if (!fs.existsSync(thumbDir)) fs.mkdirSync(thumbDir, { recursive: true });

  const fullPath = path.join(fullDir, filename);
  const thumbPath = path.join(thumbDir, filename);

  // 1. Bản full: tối đa 1200px, quality 82
  await sharp(buffer)
    .resize({ width: 1200, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(fullPath);

  // 2. Bản thumb: tối đa 400px, quality 75
  await sharp(buffer)
    .resize({ width: 400, withoutEnlargement: true })
    .webp({ quality: 75 })
    .toFile(thumbPath);

  return {
    url: `/uploads/full/${filename}`,
    thumbnailUrl: `/uploads/thumb/${filename}`,
  };
}

/**
 * Sinh ảnh mẫu WebP có kích thước chuẩn cho seed khi chưa có ảnh thực tế
 * @param {{ title: string, categoryName?: string, bgColor?: string, fgColor?: string }} options
 * @returns {Promise<{ url: string, thumbnailUrl: string }>}
 */
export async function generatePlaceholderWebp({
  title,
  categoryName = 'vCraft',
  bgColor = '#B4532A',
  fgColor = '#FFFFFF',
}) {
  const svg = `
    <svg width="1200" height="900" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:#2B2118;stop-opacity:0.8" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#grad)" />
      <circle cx="600" cy="450" r="300" fill="none" stroke="${fgColor}" stroke-width="4" stroke-opacity="0.2" />
      <circle cx="600" cy="450" r="260" fill="none" stroke="${fgColor}" stroke-width="2" stroke-opacity="0.3" stroke-dasharray="10,15" />
      <text x="600" y="380" font-family="Arial, sans-serif" font-size="36" fill="${fgColor}" opacity="0.8" text-anchor="middle" font-weight="500">
        ${categoryName.toUpperCase()}
      </text>
      <text x="600" y="460" font-family="Arial, sans-serif" font-size="52" fill="${fgColor}" text-anchor="middle" font-weight="bold">
        ${title}
      </text>
      <text x="600" y="530" font-family="Arial, sans-serif" font-size="28" fill="${fgColor}" opacity="0.7" text-anchor="middle">
        Tinh hoa làng nghề truyền thống vCraft
      </text>
    </svg>
  `;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  return processImage(buffer);
}
