import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';

/**
 * Ký JWT token với secret và thời hạn cấu hình
 * @param {{ sub: number, role: string }} payload
 * @returns {string}
 */
export function signToken(payload) {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: `${env.SESSION_TTL_HOURS}h`,
  });
}

/**
 * Giải mã và xác thực JWT token
 * @param {string} token
 * @returns {{ sub: number, role: string, iat: number, exp: number }}
 */
export function verifyToken(token) {
  return jwt.verify(token, env.JWT_SECRET);
}
