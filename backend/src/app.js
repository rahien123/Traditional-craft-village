import express from 'express';
import path from 'node:path';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import routes from './routes.js';
import { NotFoundError } from './common/errors/AppError.js';
import { errorMiddleware } from './common/middleware/error.middleware.js';

const app = express();

// Bảo mật HTTP headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// Đọc cookie và body JSON
app.use(cookieParser());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Phục vụ ảnh tĩnh tải lên
app.use('/uploads', express.static(path.resolve('uploads')));

// Mount toàn bộ API vào /api/v1
app.use('/api/v1', routes);

// 404 catch-all trong Express 5: tuyệt đối không dùng app.all('*', ...) do path-to-regexp v8
app.use((req, res, next) => next(new NotFoundError()));

// Error handler tập trung
app.use(errorMiddleware);

export default app;
