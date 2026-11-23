# vCraft — Tinh hoa làng nghề, muôn phương lan tỏa

Nền tảng **Triển lãm số**, **Truy xuất nguồn gốc bằng mã QR**, **Bản đồ số làng nghề** và **Điều phối đơn hàng báo giá sỉ (B2B)** dành cho Ban quản lý làng nghề truyền thống (Bài tập lớn môn INT3306 - Phát triển ứng dụng web).

## Mục lục tài liệu dự án

* [00 - Yêu cầu, phạm vi, quy tắc nghiệp vụ & ánh xạ thang điểm](./docs/00-requirements.md)
* [01 - Kiến trúc hệ thống & Giải pháp kỹ thuật](./docs/01-architecture.md)
* [02 - Thiết kế Cơ sở dữ liệu (Prisma Schema & State Machines)](./docs/02-database.md)
* [03 - Đặc tả API (38 Endpoints RESTful)](./docs/03-api-contract.md)
* [04 - Phân chia công việc cho 3 thành viên & Quy trình Git](./docs/04-tasks-and-workflow.md)
* [05 - Giao diện, bộ UI dùng chung & Dữ liệu mẫu](./docs/05-ui-and-seed.md)
* [06 - Lược đồ response, quy tắc validate, hợp đồng hàm dùng chung](./docs/06-api-schemas.md)

## Công nghệ sử dụng

* **Backend:** Node.js 22 LTS, Express 5 (JavaScript, ESM), Prisma 6, PostgreSQL, Zod 3, Multer + Sharp, `qrcode`, JWT trong cookie `httpOnly` + `bcrypt`, `helmet`, `express-rate-limit`.
* **Frontend:** React (Vite, JavaScript), React Router DOM, Axios, Tailwind CSS 3, `react-leaflet`, `react-hook-form` + `@hookform/resolvers` + `zod@3`.
* **Ghim phiên bản bắt buộc:** `prisma@6` và `@prisma/client@6` (không dùng Prisma 7+ vì đổi sang `prisma.config` và bắt buộc driver adapter), `tailwindcss@3` (dùng `tailwind.config.js`), `zod@3`. Luôn commit `package-lock.json`.

## Cài đặt và chạy Local

### Yêu cầu môi trường
* Node.js **22 LTS** (Node 18 đã hết hỗ trợ)
* PostgreSQL >= 14 (dự án chỉ kiểm thử trên PostgreSQL)

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
```

Các gói chính nếu khởi tạo từ đầu:

```bash
npm i express@5 cookie-parser helmet express-rate-limit zod@3 jsonwebtoken bcrypt multer sharp qrcode @prisma/client@6
npm i -D prisma@6 dotenv-cli eslint prettier husky lint-staged
```
*(Nếu `bcrypt` lỗi biên dịch trên Windows, dùng `bcryptjs`, API tương tự.)*

`backend/.env`:

```env
PORT=5000
NODE_ENV=development
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/vcraft?schema=public"
JWT_SECRET="change_this_to_a_strong_secret_key_at_least_32_chars"
SESSION_TTL_HOURS=8
# Đặt "true" khi chạy HTTPS
COOKIE_SECURE="false"

# Địa chỉ mà NGƯỜI QUÉT QR sẽ mở. Khi thi vấn đáp đổi thành IP LAN của máy chạy Vite
# (VD http://192.168.1.10:5173) rồi KHỞI ĐỘNG LẠI backend.
FRONTEND_URL="http://localhost:5173"
```

Chạy migration, tạo dữ liệu mẫu và khởi động:

```bash
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Backend chạy tại `http://localhost:5000/api/v1`.

`backend/package.json` (phần liên quan):

```json
{
  "type": "module",
  "scripts": {
    "dev": "node --watch --env-file=.env src/server.js",
    "start": "node --env-file=.env src/server.js",
    "lint": "eslint .",
    "format": "prettier --write .",
    "seed": "prisma db seed",
    "seed:reset": "node -e \"import('node:fs').then(fs => fs.rmSync('uploads', { recursive: true, force: true }))\" && prisma migrate reset --force",
    "test:unit": "node --test \"tests/unit/*.test.js\"",
    "test:integration": "node --env-file=.env --test \"tests/integration/*.test.js\"",
    "test": "node --env-file=.env.test --test \"tests/**/*.test.js\"",
    "test:db:prepare": "dotenv -e .env.test -- prisma migrate deploy"
  },
  "prisma": { "seed": "node --env-file=.env prisma/seed.js" }
}
```

### 2. Kiểm thử (Test)

Chạy toàn bộ unit test (thuần logic, không cần DB):

```bash
npm run test:unit
```
*(Hoặc chạy riêng từng file test: `node --test tests/unit/slug.test.js`)*

Chạy integration test kiểm tra khung Express app (404, bảo mật):

```bash
npm run test:integration
```

Chạy toàn bộ test (kể cả `quote-concurrency.test.js` trên DB thật — **không** dùng DB dev): tạo DB `vcraft_test`, tạo `backend/.env.test` (giống `.env` nhưng `DATABASE_URL` trỏ `vcraft_test`), rồi chạy:

```bash
npm run test:db:prepare
npm test
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Các gói chính nếu khởi tạo từ đầu:

```bash
npm i react-router-dom axios react-hook-form @hookform/resolvers zod@3 leaflet react-leaflet@5 @fontsource/playfair-display @fontsource/be-vietnam-pro
# (Nếu Vite tạo dự án React 18 thì dùng react-leaflet@4; với React 19 dùng react-leaflet@5)
npm i -D tailwindcss@3 postcss autoprefixer eslint prettier
```

Frontend gọi API và ảnh bằng **đường dẫn tương đối** (`/api/v1`, `/uploads`), nên **không cần file `.env`** và không vướng CORS. Cấu hình `frontend/vite.config.js`:

```js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // lắng nghe trên mạng LAN để điện thoại truy cập được
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
});
```

Axios: `axios.create({ baseURL: '/api/v1' })`. Trình duyệt tự gửi cookie đăng nhập (cùng origin), frontend không tự lưu token.

Frontend chạy tại `http://localhost:5173`.

### 4. Demo bằng điện thoại (QR)

1. Máy chạy dự án và điện thoại cùng Wi-Fi; lấy IP LAN của máy (VD `192.168.1.10`).
2. Đặt `FRONTEND_URL="http://192.168.1.10:5173"` trong `backend/.env`, khởi động lại backend.
3. Cho phép cổng 5173 qua tường lửa.
4. Mở QR của lô trên máy tính, quét bằng điện thoại; trang `/trace/...` mở được cùng ảnh nhờ proxy.

## Tài khoản mẫu (tạo sẵn trong `backend/prisma/seed.js`)

| Vai trò | Email | Mật khẩu | Ghi chú |
| :--- | :--- | :--- | :--- |
| **Admin (BQL làng nghề)** | `admin@vcraft.vn` | `12345678` | Duyệt hộ gia đình, quản lý tin tức, giám sát báo giá |
| **Artisan 1 (Đã duyệt)** | `gom.minhlong@vcraft.vn` | `12345678` | Có sẵn hồ sơ xưởng, toạ độ, lô QR và sản phẩm |
| **Artisan 2 (Đã duyệt)** | `gom.huonggiang@vcraft.vn` | `12345678` | Dùng để test chia đơn sỉ cho nhiều hộ |
| **Artisan 3–8 (Đã duyệt)** | `gom.xuong3@vcraft.vn` … `gom.xuong8@vcraft.vn` | `12345678` | Làm đầy danh sách và bản đồ |
| **Artisan chờ duyệt** | `gom.moi@vcraft.vn` | `12345678` | `PENDING` để demo Admin kiểm duyệt |
| **Buyer 1** | `buyer@uet.vnu.edu.vn` | `12345678` | Tạo yêu cầu báo giá và chốt đơn |
| **Buyer 2** | `buyer2@uet.vnu.edu.vn` | `12345678` | Chứng minh không xem được đơn của Buyer 1 |

Mật khẩu mẫu chỉ dùng ở môi trường dev.
