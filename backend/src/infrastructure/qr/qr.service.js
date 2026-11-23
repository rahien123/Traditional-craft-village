import qrcode from 'qrcode';
import { env } from '../../config/env.js';

/**
 * Tạo URL trang truy xuất nguồn gốc công khai
 * @param {string} batchCode
 * @returns {string}
 */
export function buildTraceUrl(batchCode) {
  return `${env.FRONTEND_URL}/trace/${batchCode}`;
}

/**
 * Sinh mã QR động dạng DataURL (PNG Base64) từ batchCode.
 * Không lưu ảnh QR vào Database.
 * @param {string} batchCode
 * @returns {Promise<{ traceUrl: string, qrCodeDataUrl: string }>}
 */
export async function generateBatchQr(batchCode) {
  const traceUrl = buildTraceUrl(batchCode);
  const qrCodeDataUrl = await qrcode.toDataURL(traceUrl, {
    margin: 2,
    width: 320,
    color: {
      dark: '#2B2118',
      light: '#FFFFFF',
    },
  });

  return {
    traceUrl,
    qrCodeDataUrl,
  };
}
