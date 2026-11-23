# CONVENTIONS.md — Quy chuẩn kiến trúc & Quy ước lập trình vCraft

Đọc file này **trước**, rồi đọc `docs/` theo thứ tự ở mục 2. Mọi quyết định đã chốt; **không đổi công nghệ, không thêm endpoint, không đổi tên trường**. Gặp điều tài liệu chưa nói, chọn phương án đơn giản nhất phù hợp quy tắc ở mục 4 và ghi vào `NOTES.md`, đừng tự chế tính năng mới.

## 1. Cố định (không bàn lại)

Node 22 LTS, **JavaScript ESM** (`"type":"module"`, import luôn có đuôi `.js`), Express **5**, Prisma **6** (`prisma@6`, `@prisma/client@6`), PostgreSQL, Zod **3** (`zod@3`), Multer + Sharp, `qrcode`, `bcrypt`, `jsonwebtoken`, cookie `vcraft_token`. Frontend React + Vite (JS), React Router, Axios (`baseURL: '/api/v1'`), Tailwind **3** (`tailwindcss@3`), `react-leaflet`, `react-hook-form` + `zod`. Test bằng `node:test`. **Không** TypeScript, **không** NestJS, **không** Prisma 7, **không** Tailwind 4, **không** Redux, **không** thư viện UI nặng.

## 2. Thứ tự đọc

1. `docs/00-requirements.md` — phạm vi, vai trò, quy tắc nghiệp vụ `BR-xx`.
2. `docs/02-database.md` — chép nguyên `schema.prisma`; hai state machine.
3. `docs/01-architecture.md` — cấu trúc thư mục, phân tầng, mẫu khoá `QuoteRequest`.
4. `docs/03-api-contract.md` — 38 endpoint và quyền. `docs/06-api-schemas.md` — body/response/validate/lỗi/hàm dùng chung.
5. `docs/05-ui-and-seed.md` — trang, design tokens, seed.
6. `docs/04-tasks-and-workflow.md` — chia việc; chỉ làm phần được giao.

Xung đột: `03` thắng về endpoint/quyền; `06` thắng về hình dạng dữ liệu; `02` thắng về schema; `00` thắng về nghiệp vụ.

## 3. Thứ tự dựng backend (mỗi bước chạy được và có test/`curl` kiểm tra)

1. **Khung:** `package.json`, `.env.example`, `src/config/env.js`, `src/app.js` (helmet, cookie-parser, `express.json({ limit: '1mb' })`, static `/uploads`, router `/api/v1`, 404, error handler), `src/routes.js`, `src/server.js`. Tạo các file dùng chung theo đúng đường dẫn trong `01-architecture.md` và hợp đồng hàm trong `06-api-schemas.md` mục 5:
   * `src/common/errors/AppError.js`
   * `src/common/utils/{response,slug,jwt,image,ownership}.util.js`
   * `src/common/constants/{roles,quote-status}.js`
   * `src/common/middleware/{validate,auth,role,rate-limit,error}.middleware.js`
2. **Prisma:** chép `prisma/schema.prisma`, chạy `npx prisma migrate dev --name init`, tạo `src/infrastructure/database/prisma.client.js` (singleton).
3. **`auth` + `admin`** (#1–4, #6–7) + `src/workflows/register-artisan.workflow.js` → đăng nhập được, kiểm `status` mỗi request.
4. **`media`** (#5) + `src/infrastructure/storage/image.service.js`.
5. **`prisma/seed.js`** (xem `05` mục 7) — làm sớm để các module khác có dữ liệu.
6. **`artisans`, `catalog`** (#20–29), **`batches` + `trace`** (#12–19, kèm `src/infrastructure/qr/qr.service.js`), **`news`** (#8–11).
7. **`quotes`** (#30–38): `quote-state-machine.js` → `quote.presenter.js` → `workflows/send-quote.workflow.js` → `bids` → `workflows/accept-quote.workflow.js` → `bid status` → `cancel` → test đồng thời.
8. Frontend sau khi backend của feature đó chạy được.

Cấu trúc thư mục đúng như `01-architecture.md`. Mỗi module có bộ khung chuẩn gồm: `<name>.routes.js`, `<name>.controller.js`, `<name>.service.js`, `<name>.validator.js` (số ít). Được phép chủ động tách thêm các file helper, presenter, mapper, state-machine hoặc chia nhỏ validator bên trong thư mục module nếu cần thiết để mã nguồn sạch sẽ, dễ kiểm thử và dễ bảo trì, miễn là giữ đúng vai trò của các file chính. Riêng `media/` chỉ cần `media.routes.js` và `media.controller.js`. Controller mỏng (đọc `req.valid`, gọi service/workflow, gọi `ok()`); service giữ logic và gọi Prisma; `src/workflows/` chỉ dùng cho 3 luồng ghi đa module (`register-artisan`, `send-quote`, `accept-quote`).

## 4. Quy tắc bắt buộc & bẫy thường gặp

**Express 5**
* Handler `async` tự đẩy lỗi vào error handler, **không** bọc `try/catch` hay `asyncHandler`.
* `req.query` là getter chỉ đọc: **không gán** `req.query = ...`. Trong `validate.middleware.js`, tạo bản sao nông của `req.query`, bỏ các key có giá trị `""` rồi parse bằng Zod, ghi kết quả vào `req.valid`.
* Khi client gọi `POST` không gửi body, Express 5 để `req.body` là `undefined`: luôn parse `req.body ?? {}` trong `validate.middleware.js`.
* Không dùng regex trong tham số route (`:id(\d+)`); kiểm id bằng Zod.
* **404 catch-all trong Express 5:** viết `app.use((req, res, next) => next(new NotFoundError()))`, **không** dùng `app.all('*', ...)` (Express 5/`path-to-regexp@8` crash lúc khởi động).
* Khai báo `GET /products/me` **trước** `GET /products/:slug`.
* `res.clearCookie('vcraft_token', { httpOnly: true, sameSite: 'lax', secure: env.COOKIE_SECURE, path: '/' })` — **không** truyền `maxAge` hay `expires`.

**Phản hồi & lỗi**
* Chỉ trả qua `ok(res, data, meta?, status?)`; lỗi ném `AppError` (hoặc lớp con) và để `error.middleware.js` dựng JSON `{ success: false, message, errors? }`. Không gọi `res.json` rải rác.
* `validate.middleware.js` luôn đọc `err.issues` (tương thích cả Zod 3 và 4).
* `error.middleware.js` bắt đủ: `AppError`, `MulterError` (`LIMIT_FILE_SIZE` → `413`, lỗi khác → `400`), `SyntaxError` (JSON sai cú pháp → `400`), Prisma `P2002` (`409`), `P2025` (`404`), `P2003` (`400`).
* Không bao giờ trả `passwordHash`. Dùng `select` rõ ràng, tránh `include` trần trên `User`.
* Tài nguyên không thuộc quyền → **404** (`NotFoundError`), không phải `403`.
* Đăng nhập sai email hay mật khẩu: cùng một thông báo `401`.

**Bảo mật & phiên**
* `POST /auth/register`: dùng `z.discriminatedUnion('role', [buyerSchema, artisanSchema])` — chỉ nhận `BUYER`/`ARTISAN`, `ARTISAN` bắt buộc có `shopName`. `.strict()` mọi schema body.
* `POST /auth/logout` là **Public** (không gắn `authMiddleware`) để cookie hết hạn hoặc tài khoản bị khoá vẫn xoá được cookie.
* `/auth/login` rate limit 10 lần sai / 15 phút / IP với `skipSuccessfulRequests: true`.
* `COOKIE_SECURE` trong `src/config/env.js` parse bằng `z.enum(['true', 'false']).transform((v) => v === 'true')`, **tuyệt đối không** dùng `z.coerce.boolean()`.
* JWT payload chỉ có `sub` (userId) và `role`; **vai trò và `status` thật luôn lấy lại từ DB** mỗi request, không tin `role` trong token.
* Cookie `vcraft_token`: `httpOnly: true`, `sameSite: 'lax'`, `secure: env.COOKIE_SECURE`, `path: '/'`, `maxAge: env.SESSION_TTL_HOURS * 3600 * 1000`. Không lưu token ở `localStorage`.
* Upload ảnh: `req.files` rỗng → `400`. Kiểm tra `sharp(buffer).metadata()` và `['jpeg', 'png', 'webp'].includes(meta.format)` cho **tất cả** buffer trước khi ghi bất kỳ file nào ra đĩa (lỗi → `415`, chặn SVG/GIF đội lốt `.jpg` và tránh ảnh rác). Tên file lưu là `<uuid>.webp`.
* Mật khẩu `bcrypt` cost 10.

**Tiền & số**
* `Product.price` và `QuoteBid.unitPrice` là `Int` VND, Zod chặn `1..2_000_000_000`.
* `QuoteRequest.targetBudget` là `Float?` (tuỳ chọn, không dùng tính toán), Zod chặn `finite().positive().max(1_000_000_000_000)`.
* Không dùng `BigInt`. Không lưu tổng tiền trong DB.

**Quote (phần dễ sai nhất)**
* Mọi thao tác ghi liên quan bid hoặc trạng thái đơn nằm trong `prisma.$transaction(async (tx) => …)` và **bước đầu tiên** là `tx.quoteRequest.updateMany` có điều kiện và `version: { increment: 1 }`; `count === 0` → `ConflictError` `409`. Dùng `tx`, tuyệt đối không dùng `prisma` trần bên trong callback `$transaction`. Mẫu code ở `01-architecture.md` mục 3.
* Kiểm quyền sở hữu (`404`) và State Machine (`400`) **trước** transaction trên bản đọc được; chênh lệch do chạy đua mới trả `409`.
* Bid kín: chỉ `src/modules/quotes/quote.presenter.js` được lọc bid và ẩn `allocatedQuantity`/`invitedCount` theo vai trò; service không tự lọc rải rác.
* Hủy đơn: chỉ chuyển các bid đang `SUBMITTED`/`ACCEPTED` → `CANCELLED` trong cùng transaction (bid đã `REJECTED` giữ nguyên). Đơn `IN_PRODUCTION` không hủy được.
* Không thêm `bidVersion`, không thêm `QuoteBid.version`.

**Slug & mã**
* `uniqueSlug` cấm `me` và fallback sang `item` nếu chuỗi bỏ dấu rỗng (VD `"!!!"`); `batchCode = 'VCRAFT-' + 8 ký tự` chọn bằng `crypto.randomInt` từ bảng 32 ký tự `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (bỏ `0/O/1/I`), thử lại ≤ 3 lần khi gặp `P2002`.

**Truy vấn**
* Danh sách có phân trang luôn dùng `skip/take`, `meta.total` bằng `count` cùng điều kiện `where`, có `orderBy` ổn định (`[{ createdAt: 'desc' }, { id: 'desc' }]`). Tránh N+1: dùng `select`/`include` có chọn lọc hoặc `_count`/`groupBy`.
* Tìm kiếm Postgres: `{ contains, mode: 'insensitive' }`.

**Frontend**
* Gọi API chỉ qua `src/api/*.js` (một file mỗi module dùng chung `src/api/client.js`), không gọi Axios trực tiếp trong component.
* Interceptor `401`: **bỏ qua** `/auth/me` và `/auth/login`; với các request khác chỉ xoá state người dùng (`setUser(null)`), để `<ProtectedRoute>` tự chuyển `/login` (không đá khách vãng lai ở trang công khai/QR). Interceptor `409` ở trang đơn → toast + tải lại.
* Ảnh lưới dùng `thumbnailUrl` (hoặc `thumbOf(url)` cho trường ảnh đơn); ảnh chi tiết dùng `url`. Dùng `ImageWithFallback`.
* Bản đồ `/map`: lọc `latitude != null && longitude != null` trước khi render `<Marker>`, import `'leaflet/dist/leaflet.css'` và cấu hình custom icon tránh lỗi mất icon khi chạy Vite.
* Mọi danh sách/form có đủ 4 trạng thái (tải, rỗng, lỗi, thành công) — `05` mục 4.
* Màu/chữ chỉ dùng token trong `05` mục 2 (khai báo trong `tailwind.config.js`), không viết mã hex rải rác.
* Toàn bộ chữ hiển thị bằng tiếng Việt có dấu.

## 5. Không làm

Không thêm `GET /news/:slug`, đăng nhập mạng xã hội, thanh toán, chat, email/thông báo đẩy, refresh token, CSRF token, Docker, CI, SSR, i18n, phân quyền chi tiết hơn 3 vai trò. Không đổi số lượng endpoint (38).

## 6. Lệnh

```bash
cd backend && npm run dev          # API :5000
cd backend && npm run test:unit    # test unit không cần DB (slug, image, ownership, errors, state machine)
cd backend && npm test             # toàn bộ test (cần .env.test + npm run test:db:prepare)
cd backend && npx prisma migrate dev && npx prisma db seed
cd frontend && npm run dev         # :5173, proxy /api và /uploads
npm run lint                       # ở cả hai thư mục
```

## 7. Định nghĩa "xong" cho một endpoint

Có validator Zod (`.strict()`); đúng `requireRole`; kiểm ownership (`404`); response đúng hình dạng trong `06`; có ít nhất một test (đường thành công + một đường lỗi) cho `auth`, `quotes`, ownership; lint sạch; không `console.log` dư. Với `quotes`: bắt buộc test `quote-concurrency` (hai request chốt song song → đúng một thành công, một `409`) và test bid kín.

## 8. Tự kiểm tra cuối (chạy trước khi báo xong)

1. `grep -R "res.json" backend/src` chỉ còn trong `src/common/utils/response.util.js` và `src/common/middleware/error.middleware.js`.
2. Rà soát toàn bộ `prisma.$transaction(async (tx) => ...)` trong `backend/src/workflows/` và `backend/src/modules/quotes/`: bên trong callback **không** có bất kỳ lời gọi `prisma.` trần nào (chỉ dùng `tx.`).
3. Đếm số route đã đăng ký trong `backend/src/modules/*/*.routes.js` = 38.
4. Đăng nhập từng tài khoản seed (`12345678`), thử thao tác chéo quyền (hộ A xem lô hộ B → `404`; Buyer 2 xem đơn Buyer 1 → `404`).
5. Quét QR giả lập: `GET /api/v1/trace/<batchCode>` của một lô seed trả đủ 5 mốc và danh sách sản phẩm cùng lô.
