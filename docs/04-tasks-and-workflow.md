# 04. Phân chia công việc (3 thành viên) & Quy trình Git

## 1. Nguyên tắc chia việc

* **Backend theo module trước, frontend làm cuốn chiếu.** Ai xong module nào (Postman chạy đúng) thì làm trang tương ứng ngay, không chờ cả nhóm xong backend.
* **Thành viên 1 gánh nhiều nhất** (hạ tầng chung, khung giao diện, 19/38 API, nhiều mảng giao diện). **Thành viên 3 khó nhất** (luồng báo giá và khoá đồng thời). **Thành viên 2** nhẹ hơn về backend nhưng phụ trách phần giao diện công khai.
* **Hỗ trợ chéo:** ai xong phần của mình sớm thì nhận bớt việc của Thành viên 1 theo thứ tự: giao diện Tin tức → giao diện Admin → giao diện Lô/QR. *(Nếu muốn cân bằng tải ngay từ đầu mà không cần hỗ trợ chéo, có thể chuyển module `batches` từ TV1 sang TV2.)*
* **Một người giữ bộ giao diện** (Thành viên 1): màu, font, component dùng chung. Mọi người dùng component có sẵn, không tự thêm kiểu mới.

### Khối lượng ước lượng (thô, để cân tải)

| | API | Backend | Frontend | Việc chung | Tỉ trọng |
| :--- | :---: | :--- | :--- | :--- | :---: |
| **TV1** | **19** | Khung dự án, `auth`, `media`, `admin`, `news`, `batches` (+QR, trace), 1 workflow (`register-artisan`) | Khung giao diện + bộ UI, Auth, Admin, Tin tức, Lô/QR/Trace | Hạ tầng, seed, tích hợp, release | **~45%** |
| **TV2** | 10 | `artisans`, `catalog` | Trang công khai (chủ, danh mục, chi tiết, xưởng, bản đồ), dashboard nghệ nhân (hồ sơ, sản phẩm) | Chuẩn bị ảnh seed | ~28% |
| **TV3** | 9 (5 khó) | `quotes`, 2 workflow (`send-quote`, `accept-quote`), State Machine, Presenter | Luồng báo giá cho Buyer / Artisan / Admin | Unit test, test đồng thời | ~27% |

## 2. Lộ trình (5 tuần)

| Giai đoạn | Thành viên 1 | Thành viên 2 | Thành viên 3 |
| :--- | :--- | :--- | :--- |
| **Ngày 1–2: Dựng khung** | Repo, `develop`, khung `backend/` (env, common, `prisma.client.js`, `app.js`, `server.js`, `routes.js`), `schema.prisma` + migration đầu, `seed.js` tối thiểu. Đẩy lên `develop` | Thu thập ảnh gốc cho `seed-assets/`, dựng thử Leaflet với dữ liệu giả, wireframe trang công khai | `quote-state-machine.js` + `quote.presenter.js` + `npm run test:unit` (không cần DB), validators Zod cho `quotes` |
| **Ngày 3–5 (xong tuần 1)** | `auth` (kể cả `auth.middleware.js` kiểm tra `ACTIVE`), `role`/`validate`/`error`/`rate-limit` middleware, `media` (sharp). **Đây là đường găng, ưu tiên cao nhất** | Các API công khai trước: `GET /categories`, `/artisans`, `/artisans/:slug`, `/products`, `/products/:slug` | `send-quote.workflow.js`, `POST/PUT /quotes`, `GET /quotes` (cần `auth` xong cuối tuần 1) |
| **Tuần 2: Hoàn tất backend** | `admin`, `news`, `batches` + QR + trace, `register-artisan.workflow.js`. **Giữa tuần: dựng khung frontend** (Vite, Tailwind 3, theme, router, layouts, `api/client.js`, `ImageUploader`, bộ UI) | `PUT /artisans/me`, `GET/POST/PUT/DELETE /products`, `/products/me` | Bid, `accept-quote.workflow.js`, đổi trạng thái bid, huỷ đơn; **test đồng thời** |
| **Cuối tuần 2: Mốc M1** | Cả nhóm xuất Postman Collection vào `docs/postman/`, test chéo | | |
| **Tuần 3–4: Frontend cuốn chiếu** | Auth, Admin (duyệt/khoá), Tin tức, **Lô + Nhật ký + Modal QR + Landing `/trace`** | **Trang chủ Triển lãm số**, danh mục + tìm kiếm gợi ý, chi tiết sản phẩm, hồ sơ xưởng, **Bản đồ**, dashboard nghệ nhân (hồ sơ + chọn toạ độ trên map, CRUD sản phẩm) | Buyer (tạo đơn, so sánh bid, phân bổ, huỷ, tiến độ), Artisan (đơn được mời, chào giá, cập nhật tiến độ), Admin (giám sát) |
| **Tuần 5: Ghép & đóng băng** | Tích hợp, rà soát bảo mật (checklist `00`), seed "đẹp" | Làm mượt giao diện công khai, responsive | Diễn tập kịch bản báo giá nhiều lần, sửa lỗi `409` |

**Đóng băng 2 ngày trước buổi thi:** chỉ sửa lỗi, không thêm tính năng; gắn tag `v1.0` trên `main`.

### Nếu trễ tiến độ: thứ tự cắt (từ ít đau nhất)

| Thứ tự | Bỏ | API còn lại |
| :---: | :--- | :---: |
| 1 | `PUT` và `DELETE` mốc nhật ký (sai thì tạo lại lô) | 36 |
| 2 | `PUT /batches/:id` | 35 |
| 3 | `PUT /quotes/:id` (Buyer huỷ rồi tạo lại) | 34 |
| 4 | `PUT /news/:id` (Admin xoá rồi đăng lại) | 33 |

**Không cắt:** `auth`, phân quyền, upload ảnh, lô + QR + trace, bản đồ, luồng báo giá, giao diện đẹp.

---

## 3. Bảng phân chia công việc chi tiết

### Thành viên 1: Hạ tầng + `auth`, `media`, `admin`, `news`, `batches` (19 API)

| Mảng | Thư mục / File phụ trách | Chi tiết |
| :--- | :--- | :--- |
| **Backend: khung** | `prisma/*`, `src/config/env.js`, `src/common/*`, `src/infrastructure/database/*`, `src/routes.js`, `src/app.js`, `src/server.js` | Express 5 (ESM), Prisma 6 singleton, Zod 3, `helmet`, `cookie-parser`, middleware (`auth`, `role`, `validate`, `rate-limit`, `error`), ESLint/Prettier chung, `.env.example` |
| **Backend: nghiệp vụ** | `src/modules/{auth,media,admin,news,batches}/*`, `src/infrastructure/{storage,qr}/*`, `src/workflows/register-artisan.workflow.js` | 4 API Auth (cookie + Public logout), 1 API upload, 2 API Admin, 4 API Tin tức, 8 API Lô (`batchCode` ngẫu nhiên, QR động, trace công khai) |
| **Seed** | `prisma/seed.js`, `prisma/seed-assets/` | Dữ liệu mẫu idempotent theo `05-ui-and-seed.md`; ảnh seed đi qua `image.service.js` để sinh `thumb`/`full` |
| **Frontend: khung** | `app/*`, `api/client.js`, `components/ui/*`, `components/shared/*`, `vite.config.js`, `tailwind.config.js` | Vite + Tailwind 3 + theme (tokens ở `05`), router, `AuthProvider`, Axios (không redirect `401` trên `/auth/me`, `/auth/login`), `ImageUploader`, `Pagination`, `ConfirmDialog`, Toast |
| **Frontend: tính năng** | `features/{auth,community,batches}/*`, `api/{auth,admin,news,batches,media}.api.js` | Đăng nhập/đăng ký, Tin tức (Modal/Accordion), Admin Dashboard (duyệt/khoá, CRUD tin), Quản lý Lô + Nhật ký + Modal xem/tải QR, **Landing `/trace/:batchCode`** (tối ưu điện thoại) |
| **Việc chung** | | Đầu mối tích hợp: merge `develop`, rà `routes.js`/router, quản lý schema, tag release |

### Thành viên 2: `artisans`, `catalog` (10 API)

| Mảng | Thư mục / File phụ trách | Chi tiết |
| :--- | :--- | :--- |
| **Backend** | `src/modules/artisans/*`, `src/modules/catalog/*` | 3 API Hồ sơ xưởng & Bản đồ (`GET /artisans` rút gọn bằng `select`, `?openOnly=true`; `GET /artisans/:slug` chặn xưởng không `ACTIVE`), 7 API Danh mục & Sản phẩm (`GET /products/me` khai báo trước `/:slug` và trả đủ trường sửa, ownership, liên kết `batchId`, ẩn thay vì xoá) |
| **Frontend** | `features/{artisans,catalog}/*`, `api/{artisans,catalog}.api.js` | **Trang chủ Triển lãm số** (ưu tiên hình ảnh, dùng ảnh `thumb`), danh mục (lọc + tìm kiếm gợi ý `useDebounce`), chi tiết sản phẩm (kèm link truy xuất), hồ sơ xưởng công khai, **Bản đồ** (`react-leaflet`: lọc toạ độ non-null + Pin + Popup + lọc đang mở cửa), dashboard nghệ nhân (sửa hồ sơ, chọn toạ độ trực tiếp trên map, CRUD sản phẩm, hiện lại sản phẩm đã ẩn) |
| **Việc chung** | `prisma/seed-assets/` | Sưu tầm ảnh làng nghề cho seed (xem `05`) |

### Thành viên 3: `quotes` & Quotation Workflows (9 API)

| Mảng | Thư mục / File phụ trách | Chi tiết |
| :--- | :--- | :--- |
| **Backend** | `src/common/constants/quote-status.js`, `src/modules/quotes/*` (gồm `quote-state-machine.js` & `quote.presenter.js`), `src/workflows/send-quote.workflow.js`, `src/workflows/accept-quote.workflow.js` | State Machine tách `QuoteStatus`/`BidStatus`; Presenter lọc bid kín; `send` (kiểm `deliveryDeadline`, lọc hộ `ACTIVE`, tạo `QuoteInvitation`); `bids` (mẫu khoá gốc, bid kín); `accept` (khoá trước, validate sau, chốt một hoặc nhiều hộ); đổi trạng thái bid và đồng bộ đơn cha; `cancel` (tự chuyển bid `SUBMITTED`/`ACCEPTED` sang `CANCELLED`) |
| **Test** | `tests/*` | `tests/unit/*` (slug, image, ownership, errors, quote-state-machine) (`npm run test:unit`), `tests/integration/*` (`npm run test:integration`), `quote-concurrency.test.js` (`Promise.all` trên DB thật) |
| **Frontend** | `features/quotes/*`, `api/quotes.api.js` | **Buyer:** form tạo đơn, gửi, bảng so sánh bid (giá, số lượng chào, ngày hoàn thành), ô nhập `acceptedQuantity` kèm thanh "đã phân bổ X / yêu cầu Y", nút huỷ, xử lý `409` (tải lại + thông báo). **Artisan:** đơn được mời, form gửi/sửa bid, cập nhật tiến độ "Bắt đầu sản xuất → Đã giao" kèm số lượng được giao. **Admin:** bảng giám sát và xem chi tiết các đơn sỉ |

---

## 4. Quy tắc Git & Phối hợp

1. **Nhánh:** `main` (chỉ bản ổn định để demo), `develop` (tích hợp), nhánh tính năng `feat/be-<module>`, `feat/fe-<feature>`, `fix/<mô-tả>`.
2. **Pull Request:** mọi thay đổi vào `develop` qua PR, **ít nhất 1 người khác xem**. Không push thẳng `develop`/`main`.
3. **Commit:** `feat(quotes): accept bids with version lock`, `fix(media): reject non-image`, `docs(api): ...`.
4. **File chung cần chú ý khi merge:** `backend/src/routes.js`, `frontend/src/app/router/index.jsx`. Luôn `git pull origin develop` (hoặc rebase) trước khi tạo PR.
5. **Thay đổi Database:** không tự sửa `schema.prisma` mà không báo nhóm. Người sửa chạy `npx prisma migrate dev --name <mô-tả>`, **commit cả thư mục `prisma/migrations/`**, merge vào `develop` sớm; hai người còn lại pull rồi chạy `npx prisma migrate dev`. Nếu hai người cùng tạo migration, người sau xoá migration cục bộ của mình, rebase rồi tạo lại.
6. **Upload ảnh dùng chung:** không tự cấu hình `multer` ở module khác; luôn dùng `POST /uploads/images` (hoặc `<ImageUploader />`) rồi lưu `{ url, thumbnailUrl }` hoặc `url` vào API nghiệp vụ.
7. **Định dạng code:** chạy `npm run lint` và `npm run format` trước khi commit (đã gắn `lint-staged`). Không commit thay đổi chỉ về định dạng ở file người khác phụ trách.
8. **Cập nhật tài liệu:** đổi API/DB/nghiệp vụ thì sửa `docs/` trong cùng PR; cập nhật Postman Collection.

### Definition of Done cho một tính năng
- [ ] Đúng chức năng ở `00-requirements.md` và quy tắc nghiệp vụ liên quan.
- [ ] Zod validate đầu vào; kiểm quyền vai trò **và** sở hữu (sai thì `404`).
- [ ] Giao diện có trạng thái đang tải / lỗi / danh sách rỗng, responsive từ 360px.
- [ ] Đã chạy thử bằng Postman (backend) hoặc trên trình duyệt (frontend), kể cả trường hợp lỗi.
- [ ] Lint sạch, đã được 1 người xem PR, docs/Postman cập nhật.

---

## 5. Checklist 

* [ ] `npm run seed:reset` để có dữ liệu sạch và đủ (đúng kịch bản bên dưới).
* [ ] **Demo trên điện thoại:** chạy Vite với `server.host = true`; đặt `FRONTEND_URL` trong `backend/.env` thành `http://<IP-LAN>:5173` rồi **khởi động lại backend**; cho phép cổng 5173 qua tường lửa; điện thoại cùng Wi-Fi quét QR và mở được `/trace/:batchCode` hiển thị nhiều sản phẩm cùng lô (không bị đá về `/login`). Kiểm tra ảnh trên điện thoại cũng tải được (nhờ proxy `/uploads`).
* [ ] Luồng đầy đủ 3 vai trò: Hộ mới đăng ký → Admin duyệt → Hộ tạo Lô + Nhật ký + 2 sản phẩm cùng lô → Buyer xem Bản đồ → Buyer tạo đơn 5.000 sản phẩm → 2 hộ chào giá (mỗi hộ 3.000) → Buyer phân bổ 3.000 + 2.000 và chốt → 2 hộ lần lượt `IN_PRODUCTION` → `DELIVERED`.
* [ ] Trường hợp biên: huỷ đơn ở `BUYER_ACCEPTED` (bid `ACCEPTED` thành `CANCELLED`, bid `REJECTED` giữ nguyên); Admin khoá hộ (`SUSPENDED`) và cookie cũ bị chặn `403`, vẫn bấm đăng xuất được; chốt đơn với `version` cũ trả `409`; hộ A gọi bid/lô của hộ B nhận `404`; đăng nhập sai quá 10 lần bị `429`.
* [ ] Chạy `npm run test:unit` và `npm test` (kể cả `quote-concurrency.test.js`) và sẵn sàng giải thích mẫu "khoá gốc trước, đọc sau".
* [ ] DevTools → Network: ảnh danh sách tải `/uploads/thumb/*.webp` nhẹ; thao tác lọc/phân trang/chào giá dùng JSON, **không reload trang**; thử mở trang trên màn hình 360px.
* [ ] Sao lưu: ảnh chụp/video quay sẵn kịch bản chính phòng khi mất mạng hoặc lỗi DB lúc thi.

## 6. Quy trình triển khai & Kiểm tra chất lượng (Quality Assurance)

* Triển khai **từng module** một theo đúng thứ tự ở mục 3 của `CONVENTIONS.md`; đối chiếu chặt chẽ với `docs/00`, `01`, `02`, `03`, `06`.
* Thành viên 1 hoàn thành **khung chung** (bước 1–2) trước và merge vào `develop`, rồi hai người còn lại mới bắt đầu để cùng dùng chung `AppError`, `response.util.js`, `validate.middleware.js`.
* Sau mỗi module: chạy test tự động, review code kỹ càng, đối chiếu `06` (đúng hình dạng response) và các quy tắc tại mục 4 của `CONVENTIONS.md`. Mọi dòng code phải được đọc hiểu sâu sắc .
