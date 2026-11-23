# 05. Giao diện, Bộ UI dùng chung & Dữ liệu mẫu (Seed)

Giao diện chiếm 20% điểm và tiêu chí "thiết kế, dễ sử dụng" thêm 10%. Tài liệu này giúp 3 người làm ra một sản phẩm trông như của **một** người. **Thành viên 1 giữ bộ UI**; mọi người dùng component có sẵn.

## 1. Sơ đồ trang & URL sạch

Slug sinh bằng `src/common/utils/slug.util.js`: tiếng Việt bỏ dấu, `kebab-case`, trùng thì thêm hậu tố `-2`, `-3`; **cấm slug `me`** (trùng route `/products/me`).

| Nhóm | URL | Trang | TV |
| :--- | :--- | :--- | :---: |
| Công khai | `/` | Trang chủ Triển lãm số (hero, sản phẩm nổi bật, xưởng đang mở cửa, tin mới) | 2 |
| | `/products` | Danh mục: lọc theo xưởng/phân loại, tìm kiếm gợi ý, phân trang | 2 |
| | `/products/:slug` | Chi tiết sản phẩm (gallery, xưởng, link truy xuất nếu có lô) | 2 |
| | `/artisans` | Danh sách xưởng | 2 |
| | `/artisans/:slug` | Hồ sơ xưởng (câu chuyện, ảnh, chứng nhận, sản phẩm) | 2 |
| | `/map` | Bản đồ số làng nghề | 2 |
| | `/news` | Tin tức (mở bài bằng Modal/Accordion, không có URL riêng từng bài) | 1 |
| | `/trace/:batchCode` | **Landing truy xuất QR** (mobile-first) | 1 |
| | `/login`, `/register` | Đăng nhập, Đăng ký (Buyer / Hộ gia đình) | 1 |
| Buyer | `/quotes`, `/quotes/new`, `/quotes/:id` | Danh sách đơn, tạo đơn, chi tiết + so sánh bid + phân bổ + tiến độ | 3 |
| Artisan | `/studio/profile` | Sửa hồ sơ xưởng, chọn toạ độ trên bản đồ | 2 |
| | `/studio/products` | Sản phẩm của tôi (kể cả đã ẩn), thêm/sửa | 2 |
| | `/studio/batches`, `/studio/batches/:id` | Lô sản xuất, nhật ký, Modal QR | 1 |
| | `/studio/quotes`, `/studio/quotes/:id` | Đơn được mời, chào giá, cập nhật tiến độ | 3 |
| Admin | `/admin/artisans` | Duyệt / khoá hộ gia đình | 1 |
| | `/admin/news` | Quản lý tin tức | 1 |
| | `/admin/quotes`, `/admin/quotes/:id` | Giám sát danh sách & chi tiết đơn báo giá (dùng chung component chi tiết đơn) | 3 |

Trang yêu cầu đăng nhập đi qua `ProtectedRoute`; sai vai trò thì chuyển về trang phù hợp kèm thông báo.

## 2. Bản sắc & Design tokens

Cảm hứng: chất liệu gốm, men, giấy dó. Hạn chế màu mặc định của framework. Khai báo trong `frontend/tailwind.config.js` (Tailwind CSS 3).

| Token | Giá trị | Dùng cho |
| :--- | :--- | :--- |
| `clay-500` | `#B4532A` | Màu chủ đạo (đất nung): nút chính, liên kết nhấn. Chữ trắng trên nền này đạt tương phản ≈ 5:1 |
| `clay-100` | `#F3DFD5` | Nền nhấn nhẹ, badge |
| `celadon-700` | `#2F6B5C` | Màu phụ (men ngọc): nút phụ, trạng thái tốt. Chữ trắng đạt ≈ 6:1 |
| `celadon-100` | `#DCEBE6` | Nền thẻ, badge phụ |
| `paper-50` | `#FBF7F0` | Nền trang |
| `paper-100` | `#F6EFE3` | Nền khối (giấy dó) |
| `ink-900` | `#2B2118` | Chữ chính |
| `ink-600` | `#5A4A3C` | Chữ phụ |
| `gold-500` | `#C9A227` | Dấu "Đã xác thực", điểm nhấn nhỏ (không dùng cho chữ nhỏ) |
| `danger-600` / `success-600` | `#B3261E` / `#2E7D32` | Lỗi / thành công |

> Không dùng chữ trắng trên `celadon-500` (`#5E9C8B`) vì tương phản chỉ ≈ 3:1; dùng `celadon-700` hoặc chữ `ink-900`.

**Chữ (hỗ trợ đủ tiếng Việt):** tiêu đề `Playfair Display` (có chân, 600–700), nội dung `Be Vietnam Pro` (400/500/600). Dùng gói `@fontsource/*` bản có subset `vietnamese` thay vì Google Fonts CDN để **chạy được khi demo không có internet** (VD `@fontsource/be-vietnam-pro/vietnamese-400.css`).

**Khoảng cách, bo góc, bóng:** thang 4px (`4, 8, 12, 16, 24, 32, 48`); bo góc `rounded-lg` (8px) cho thẻ, `rounded-full` cho badge/avatar; bóng nhẹ `shadow-sm`, hover `shadow-md`.

**Dấu ấn thương hiệu:** logo vCraft + khẩu hiệu "Tinh hoa làng nghề, muôn phương lan tỏa" ở Header/Footer; huy hiệu "Đã xác thực" (`gold-500`) cho hộ có `verifiedAt`; hoạ tiết nền dùng tiết chế.

## 3. Quy tắc hình ảnh (ảnh là trung tâm)

* Lưới sản phẩm/xưởng/tin tức/popup bản đồ **chỉ dùng ảnh `thumbnailUrl`** (hoặc `thumbOf(url)` với cột ảnh đơn); trang chi tiết, ảnh bìa, timeline truy xuất dùng `url` (full).
* Mọi ảnh có `aspect-ratio` cố định (thẻ sản phẩm `4/3`, ảnh bìa xưởng `16/9`, gallery `1/1`), `object-cover`, `loading="lazy"` (trừ ảnh đầu trang), có `alt`.
* Component `ImageWithFallback`: hiển thị nền `paper-100` khi đang tải hoặc lỗi.
* Lightbox khi bấm ảnh gallery; trang truy xuất cho phép phóng to ảnh mốc.

## 4. Trạng thái giao diện (mọi danh sách/biểu mẫu đều phải có)

| Trạng thái | Cách hiển thị |
| :--- | :--- |
| Đang tải | Skeleton có kích thước giống nội dung thật (không để trang nhảy) |
| Rỗng | Minh hoạ + câu giải thích + nút hành động ("Chưa có sản phẩm. Thêm sản phẩm đầu tiên") |
| Lỗi mạng/`5xx` | Thông báo thân thiện + nút "Thử lại" |
| `401` | **Bỏ qua** trên `/auth/me` (chỉ đặt `user = null`) và `/auth/login` (hiện thông báo lỗi ngay trên form). Với API khác: xoá state người dùng để `ProtectedRoute` tự chuyển `/login` (không làm hỏng trang công khai/QR) |
| `403` | Thông báo theo lý do (chờ duyệt / bị khoá / sai quyền) |
| `409` | Toast "Đơn vừa được cập nhật ở nơi khác, vui lòng tải lại" + **tự tải lại** dữ liệu (đặc biệt ở trang đơn báo giá) |
| Thành công | Toast ngắn; thao tác nguy hiểm (huỷ đơn, ẩn sản phẩm, khoá hộ) có `ConfirmDialog` |

## 5. Nhập liệu (tiêu chí 6)

* `react-hook-form` + Zod (`zod@3`), **dùng chung quy tắc với backend** (cùng giới hạn độ dài, số nguyên, `price`/`unitPrice` ≤ 2.000.000.000, `targetBudget` ≤ 1.000.000.000.000).
* Báo lỗi ngay dưới từng ô, tiếng Việt; lỗi `errors[].field` từ backend gắn vào đúng ô.
* Định dạng tiền VND có dấu chấm ngăn cách khi hiển thị (`formatCurrency`), lưu số nguyên.
* Số điện thoại Việt Nam: `^(0|\+84)\d{9,10}$`. Ngày dùng bộ chọn ngày, không gõ tay.
* Tìm kiếm sản phẩm có **gợi ý** (`useDebounce` 300ms), kết quả cập nhật không reload trang.
* Hồ sơ xưởng: **click lên bản đồ để điền vĩ độ/kinh độ**, có thể kéo Pin để chỉnh.
* Form tạo đơn: tự điền hạn giao mặc định (+30 ngày), nhắc "ngân sách chỉ là gợi ý".
* Trang phân bổ: thanh tiến độ "đã phân bổ X / yêu cầu Y", tự tính thành tiền `unitPrice × acceptedQuantity`, chặn nhập vượt `offeredQuantity`.

## 6. Responsive & khả năng tiếp cận

* Thiết kế **mobile-first**, kiểm tra ở 360px, 768px, 1280px. Trang `/trace/:batchCode` và `/map` ưu tiên điện thoại.
* Menu thu gọn trên mobile; bảng dữ liệu cuộn ngang hoặc đổi thành thẻ.
* Vùng bấm tối thiểu 44×44px; có `focus` rõ; tương phản chữ ≥ 4.5:1; hiệu ứng chuyển động nhẹ, tôn trọng `prefers-reduced-motion`.
* **Bản đồ:** import `'leaflet/dist/leaflet.css'`, lọc bỏ xưởng chưa có toạ độ (`latitude == null || longitude == null`), và cấu hình custom marker icon để không lỗi ảnh icon khi build bằng Vite. Chuẩn bị mạng dự phòng (điện thoại phát Wi-Fi) để tải tile OpenStreetMap khi thi.

---

## 7. Kế hoạch dữ liệu mẫu (`backend/prisma/seed.js`)

Mục tiêu: có đủ dữ liệu để demo mượt và thấy rõ phân trang, bản đồ, truy xuất, báo giá.

| Dữ liệu | Số lượng | Ghi chú |
| :--- | :---: | :--- |
| Admin | 1 | `admin@vcraft.vn` |
| Hộ `ACTIVE` | 8 | `gom.minhlong@vcraft.vn`, `gom.huonggiang@vcraft.vn`, và `gom.xuong3` … `gom.xuong8@vcraft.vn`; mỗi hộ có toạ độ quanh làng nghề, 3 hộ `isOpenForVisit = true` |
| Hộ `PENDING` | 1 | `gom.moi@vcraft.vn` để demo Admin duyệt |
| Buyer | 2 | `buyer@uet.vnu.edu.vn`, `buyer2@uet.vnu.edu.vn` (để chứng minh Buyer này không xem được đơn Buyer kia) |
| Phân loại | 6 | Bình – lọ, Ấm chén trà, Bát đĩa, Đồ trang trí, Quà tặng, Đồ thờ |
| Sản phẩm | 48 | 6 sản phẩm/hộ → thấy 4 trang ở `limit=12`; 12 sản phẩm độc bản; 4 sản phẩm đã ẩn |
| Lô sản xuất | 10 | 3 lô "đầy đủ" (5 mốc có ảnh, 2–3 sản phẩm chung lô) dùng để quét QR; các lô còn lại 1–2 mốc |
| Yêu cầu báo giá | 4 | 1 `DRAFT`; 1 `ARTISANS_BIDDING` có bid của 2 hộ (dự phòng cho demo chốt đơn); 1 `IN_PRODUCTION` đã chia cho 2 hộ; 1 `CANCELLED` |
| Tin tức | 6 | Đủ 4 loại `NewsCategory` |

Mật khẩu mẫu `12345678` (8 ký tự, khớp luôn quy tắc đăng ký và chỉ dành cho môi trường dev).

### Ảnh mẫu
* Khoảng **40–60 ảnh** đặt trong `backend/prisma/seed-assets/` (được commit): ảnh sản phẩm, ảnh xưởng, ảnh các bước (nhào đất, vuốt, nung, thành phẩm).
* `seed.js` chỉ gọi `image.service.js` (sharp) để sinh `uploads/thumb` và `uploads/full` khi bản ghi chưa tồn tại trong DB (tránh tạo ảnh rác mỗi lần chạy lại seed). Vì `uploads/` không nằm trong git nên **mỗi máy tự sinh khi seed**.
* Dùng ảnh tự chụp hoặc ảnh miễn phí bản quyền; ghi nguồn trong `seed-assets/CREDITS.md`. Tránh ảnh có người nhận diện được nếu không có sự đồng ý.

### Chạy lại an toàn (Idempotent)
* `npx prisma db seed` dùng `upsert` theo `email`/`slug`/`batchCode` cố định; riêng `QuoteRequest` (không có cột `@unique`) kiểm tra theo `title` trước khi tạo mới (hoặc bỏ qua toàn bộ phần báo giá nếu `prisma.quoteRequest.count() > 0`) để chạy lặp không nhân đôi dữ liệu.
* `npm run seed:reset` xoá thư mục `uploads/`, chạy `prisma migrate reset --force` để làm sạch hoàn toàn trước mỗi buổi demo.

### Thứ tự seed và dữ liệu báo giá nhất quán

Seed **không** gọi API; ghi thẳng bằng Prisma theo đúng thứ tự khoá ngoại:
`Category` → `User` (+ `ArtisanProfile`) → ảnh (qua `image.service.js`) → **`ProductionBatch` + `ProductionLog`** → **`Product`** (gắn `batchId` cho 2–3 sản phẩm vào mỗi lô đầy đủ) → `News` → `QuoteRequest` → `QuoteInvitation` → `QuoteBid`.

Dữ liệu báo giá phải **khớp state machine** (vì demo sẽ thao tác tiếp trên đó):

| Đơn | `status` | `version` | Bid |
| :--- | :--- | :---: | :--- |
| Nháp | `DRAFT` | 0 | không |
| Đang chào giá | `ARTISANS_BIDDING` | **3** | `gom.minhlong` (offered 3000, `SUBMITTED`), `gom.huonggiang` (offered 2500, `SUBMITTED`); `totalQuantity = 5000`; mời cả 8 hộ `ACTIVE` *(1 lần send + 2 lần bid = version 3)* |
| Đang sản xuất | `IN_PRODUCTION` | 5 | hai bid: `IN_PRODUCTION` (`acceptedQuantity: 3000`) và `ACCEPTED` (`acceptedQuantity: 2000`), tổng = `totalQuantity` |
| Đã huỷ | `CANCELLED` | 3 | một bid `CANCELLED` |

Đơn "Đang chào giá" và "Nháp" thuộc `buyer@uet.vnu.edu.vn`; các đơn còn lại thuộc `buyer2@uet.vnu.edu.vn`. Mỗi lô "đầy đủ" có `stepOrder` 1–5 liên tục.

## 8. Bảng trang ↔ API (frontend lấy dữ liệu từ đâu)

| Trang | API gọi khi tải | API gọi khi thao tác |
| :--- | :--- | :--- |
| Header / App | `GET /auth/me` (khôi phục phiên) | `POST /auth/logout` |
| `/` | `GET /products?limit=8`, `GET /artisans?openOnly=true&limit=6`, `GET /news?limit=3` | — |
| `/products` | `GET /categories`, `GET /artisans?limit=50`, `GET /products` | đổi bộ lọc → gọi lại `GET /products` |
| `/products/:slug` | `GET /products/:slug` | — (nút "Xem nguồn gốc" → `/trace/:batchCode`) |
| `/artisans`, `/artisans/:slug`, `/map` | `GET /artisans`, `GET /artisans/:slug` | — |
| `/news` | `GET /news` | — |
| `/trace/:batchCode` | `GET /trace/:batchCode` | — |
| `/login`, `/register` | — | `POST /auth/login`, `POST /auth/register` |
| `/studio/profile` | `GET /auth/me` → `GET /artisans/:slug` | `POST /uploads/images`, `PUT /artisans/me` |
| `/studio/products` | `GET /products/me`, `GET /categories`, `GET /batches` | `POST/PUT/DELETE /products`, `POST /uploads/images` |
| `/studio/batches` (+ `/:id`) | `GET /batches`, `GET /batches/:id` | `POST/PUT /batches`, `POST /batches/:id/logs`, `PUT /batches/:id/logs/:logId`, `DELETE /batches/:id/logs/:logId`, `POST /uploads/images` |
| `/studio/quotes` (+ `/:id`) | `GET /quotes`, `GET /quotes/:id` | `POST /quotes/:id/bids`, `PATCH /quotes/:id/bids/:bidId/status` |
| `/quotes`, `/quotes/new`, `/quotes/:id` | `GET /quotes`, `GET /quotes/:id`, `GET /categories`, `GET /artisans` | `POST/PUT /quotes`, `POST /quotes/:id/send`, `POST /quotes/:id/accept`, `PATCH /quotes/:id/cancel` |
| `/admin/artisans` | `GET /admin/artisans?status=PENDING` | `PATCH /admin/artisans/:userId/status` |
| `/admin/news` | `GET /news` | `POST/PUT/DELETE /news` |
| `/admin/quotes` (+ `/:id`) | `GET /quotes`, `GET /quotes/:id` | `POST /quotes/:id/send`, `POST /quotes/:id/accept`, `PATCH /quotes/:id/cancel` |

`/map` và danh sách xưởng cùng dùng `GET /artisans` (bản rút gọn); Pin popup dùng `thumbOf(coverImage)`.
