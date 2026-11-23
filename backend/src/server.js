import app from './app.js';
import { env } from './config/env.js';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 vCraft API server đang chạy tại: http://localhost:${env.PORT}/api/v1`);
  console.log(`🌱 Chế độ môi trường: ${env.NODE_ENV}`);
});

export default server;
