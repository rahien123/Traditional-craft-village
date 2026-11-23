# 03. Đặc tả API Contract (38 Endpoints RESTful)

## Quy ước chung

* **Base URL:** `/api/v1` (frontend gọi đường dẫn tương đối qua proxy Vite, xem `README.md`).
* **Xác thực bằng cookie:** đăng nhập thành công, server set cookie `vcraft_token` (JWT) với `HttpOnly; SameSite=Lax; Path=/; Max-Age=8h` (`SESSION_TTL_HOURS`, thêm `Secure` khi `COOKIE_SECURE="true"`). Trình duyệt tự gửi cookie, frontend **không** tự lưu token và **không** gắn header `Authorization`. `POST /auth/logout` là **Public** và luôn xoá cookie.
* **Mọi API yêu cầu đăng nhập** đều giải mã JWT **và** truy vấn `User` trong DB để kiểm tra `status === 'ACTIVE'`.
* **Quyền sở hữu:** truy cập tài nguyên không thuộc về mình (sản phẩm, lô, đơn, bid của người khác) trả **`404`**, không phải `403`, để không lộ sự tồn tại của tài nguyên. `403` chỉ dùng khi sai vai trò hoặc tài khoản chưa `ACTIVE`.
* **JSON thành công:**
  ```json
  {
    "success": true,
    "data": {},
    "meta": { "page": 1, "limit": 12, "total": 48 }
  }
  ```
* **JSON lỗi:**
  ```json
  {
    "success": false,
    "message": "Thông báo lỗi dễ hiểu bằng tiếng Việt",
    "errors": [{ "field": "unitPrice", "message": "Đơn giá phải lớn hơn 0" }]
  }
  ```
* **Mã HTTP:**

| Mã | Dùng khi |
| :---: | :--- |
| `200` / `201` | Thành công / Tạo mới thành công |
| `400` | Dữ liệu sai (Zod), JSON lỗi cú pháp, tham chiếu không tồn tại (`P2003`) hoặc chuyển trạng thái sai luật State Machine |
| `401` | Chưa đăng nhập, cookie hết hạn |
| `403` | Sai vai trò; tài khoản `PENDING`/`SUSPENDED` |
| `404` | Không tồn tại **hoặc không thuộc quyền của bạn** |
| `409` | Trùng dữ liệu (email, slug, `stepOrder`) hoặc **xung đột đồng thời** (`version` lệch, đơn vừa đổi trạng thái) |
| `413` / `415` | Ảnh quá lớn (> 5MB) / sai định dạng (không phải JPEG, PNG, WebP) |
| `429` | Quá giới hạn tần suất (đăng nhập sai / đăng ký) |

* **Phân trang:** `?page=1&limit=12` (tối đa `limit=50`); `meta` có `page`, `limit`, `total`.
* **Tiền:** số nguyên VND (không có phần lẻ). `price` và `unitPrice` tối đa `2.000.000.000` (`Int`); `targetBudget` tối đa `1.000.000.000.000` (`Float?`).
* **Ảnh:** mảng ảnh là `{ "url": "/uploads/full/<uuid>.webp", "thumbnailUrl": "/uploads/thumb/<uuid>.webp" }`; trường ảnh đơn (`coverImage`, `News.imageUrl`, `ProductionLog.imageUrl`, `certificates[].imageUrl`) lưu bản `/uploads/full/<uuid>.webp` và suy ra bản nhỏ qua `thumbOf()`.

---

## Phần 1: `auth`, `media`, `admin`, `news`, `batches` — Thành viên 1 (19 API)

| STT | Module | Method | Endpoint | Quyền | Mô tả & Quy tắc |
| :---: | :--- | :---: | :--- | :--- | :--- |
| 1 | `auth` | `POST` | `/auth/register` | Public | Đăng ký `BUYER` (`ACTIVE`) hoặc `ARTISAN` (`PENDING`, chạy `workflows/register-artisan.workflow.js` tạo đồng thời `User` + `ArtisanProfile`). Dùng `z.discriminatedUnion` theo `role` (`BUYER`/`ARTISAN`, `ARTISAN` bắt buộc `shopName`), mật khẩu 8–72 ký tự. Rate limit. |
| 2 | `auth` | `POST` | `/auth/login` | Public | Kiểm tra mật khẩu (`bcrypt`); chỉ cho vào nếu `status = ACTIVE` (`403` kèm thông báo rõ nếu `PENDING` hoặc `SUSPENDED`). Set cookie `vcraft_token`, trả `{ user }`. **Rate limit: 10 lần sai / 15 phút / IP (`skipSuccessfulRequests: true`).** |
| 3 | `auth` | `POST` | `/auth/logout` | Public | Xoá cookie `vcraft_token` (không gắn `authMiddleware` để cookie hết hạn hoặc tài khoản `SUSPENDED` vẫn thoát được). Luôn trả `200 {}`. |
| 4 | `auth` | `GET` | `/auth/me` | Auth | Thông tin người dùng hiện tại (kèm `artisanProfile` nếu là `ARTISAN`). Frontend gọi khi tải trang để khôi phục phiên. |
| 5 | `media` | `POST` | `/uploads/images` | Auth | Field `images` (`multipart/form-data`, 1–10 ảnh, ≤ 5MB/ảnh, `jpeg/png/webp`; 0 file → `400`). Kiểm `sharp` format toàn bộ trước khi ghi đĩa, nén `.webp` 2 bản `thumb`/`full`, trả mảng `{ url, thumbnailUrl }`. |
| 6 | `admin` | `GET` | `/admin/artisans` | Admin | Danh sách hộ gia đình kèm thông tin xưởng để kiểm duyệt. Query: `?status=PENDING\|ACTIVE\|SUSPENDED&page=1&limit=10`. |
| 7 | `admin` | `PATCH` | `/admin/artisans/:userId/status` | Admin | Duyệt (`ACTIVE`, gán `verifiedAt = now()` nếu chưa có) hoặc khoá (`SUSPENDED`) tài khoản hộ gia đình. Cấm Admin tự khoá chính mình. |
| 8 | `news` | `GET` | `/news` | Public | Danh sách tin cộng đồng (trả đủ `content`, giao diện mở bài bằng Modal/Accordion, **không** có trang chi tiết riêng). Query: `?category=MATERIAL_PRICE\|POWER_OUTAGE\|SUPPORT_POLICY\|GENERAL&page=1&limit=10`. |
| 9 | `news` | `POST` | `/news` | Admin | Tạo tin (tự sinh `slug`). |
| 10 | `news` | `PUT` | `/news/:id` | Admin | Cập nhật tin (ít nhất 1 trường). |
| 11 | `news` | `DELETE` | `/news/:id` | Admin | Xoá tin. |
| 12 | `batches` | `GET` | `/batches` | Artisan | Danh sách lô của xưởng mình (kèm số mốc nhật ký, số sản phẩm, `qrCodeDataUrl` sinh động). |
| 13 | `batches` | `POST` | `/batches` | Artisan | Tạo lô, tự sinh `batchCode` duy nhất dạng `VCRAFT-` + 8 ký tự ngẫu nhiên từ bảng 32 ký tự (bỏ `0/O/1/I`, thử lại tối đa 3 lần nếu đụng `P2002`), trả kèm `qrCodeDataUrl` + `traceUrl`. |
| 14 | `batches` | `GET` | `/batches/:id` | Artisan | Chi tiết lô của mình: thông tin lô, toàn bộ mốc nhật ký, sản phẩm thuộc lô, `qrCodeDataUrl`. |
| 15 | `batches` | `PUT` | `/batches/:id` | Artisan | Sửa `title`, `story`, `startDate`, `completedDate` của lô mình (ít nhất 1 trường; kiểm tra `completedDate >= startDate` với bản ghi hiện tại). |
| 16 | `batches` | `POST` | `/batches/:id/logs` | Artisan | Thêm mốc nhật ký (`stepOrder`, `stageName`, `description?`, `loggedAt?`, `imageUrl?`; server tự tính `thumbnailUrl` bằng `thumbOf`). |
| 17 | `batches` | `PUT` | `/batches/:id/logs/:logId` | Artisan | Sửa mốc nhật ký (kiểm tra lô thuộc xưởng mình và mốc thuộc lô; ít nhất 1 trường). |
| 18 | `batches` | `DELETE` | `/batches/:id/logs/:logId` | Artisan | Xoá mốc nhật ký. |
| 19 | `batches` | `GET` | `/trace/:batchCode` | Public | **Landing Page Truy xuất (công khai):** câu chuyện lô, thông tin xưởng, `logs` sắp theo `stepOrder` tăng dần và toàn bộ `products` (`isActive = true`) dùng chung mã QR. |

### Payload mẫu phần 1

**`POST /auth/register` (Hộ gia đình):**
```json
{
  "email": "gom.thanhha@vcraft.vn",
  "password": "StrongPassword123",
  "fullName": "Nguyễn Văn An",
  "phone": "0912345678",
  "role": "ARTISAN",
  "shopName": "Xưởng Gốm Gia Truyền Thanh Hà",
  "address": "Xóm 3, Bát Tràng, Gia Lâm, Hà Nội",
  "craftSpecialty": "Gốm men lam vẽ tay"
}
```

**`POST /auth/login` (Response, kèm header `Set-Cookie: vcraft_token=...; HttpOnly; SameSite=Lax; Path=/`):**
```json
{
  "success": true,
  "data": { "user": { "id": 3, "email": "gom.minhlong@vcraft.vn", "fullName": "Trần Minh Long", "phone": "0912000001", "role": "ARTISAN", "status": "ACTIVE" } }
}
```

**`POST /uploads/images` (Response):**
```json
{
  "success": true,
  "data": [
    {
      "url": "/uploads/full/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d.webp",
      "thumbnailUrl": "/uploads/thumb/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d.webp"
    }
  ]
}
```

**`POST /batches` (Response):**
```json
{
  "success": true,
  "data": {
    "id": 5,
    "batchCode": "VCRAFT-K7Q2M9XB",
    "title": "Lô ấm chén men ngọc tháng 11/2026",
    "story": "Đất sét trắng khai thác đầu thu, nung lò ga 1280 độ C trong 18 giờ.",
    "startDate": "2026-11-01T00:00:00.000Z",
    "completedDate": null,
    "traceUrl": "http://192.168.1.10:5173/trace/VCRAFT-K7Q2M9XB",
    "qrCodeDataUrl": "data:image/png;base64,..."
  }
}
```

---

## Phần 2: `artisans`, `catalog` — Thành viên 2 (10 API)

| STT | Module | Method | Endpoint | Quyền | Mô tả & Quy tắc |
| :---: | :--- | :---: | :--- | :--- | :--- |
| 20 | `artisans` | `GET` | `/artisans` | Public | Danh sách xưởng đã duyệt (`user.status = ACTIVE`) cho cả danh sách lẫn **Bản đồ số**. Dùng Prisma `select` trả bản **rút gọn** (`id, slug, shopName, craftSpecialty, address, latitude, longitude, isOpenForVisit, openingHours, coverImage`); **không** trả `familyHistory`, `galleryImages`, `certificates`. Query: `?openOnly=true&search=...&page=1&limit=50`. |
| 21 | `artisans` | `GET` | `/artisans/:slug` | Public | Chi tiết hồ sơ xưởng đầy đủ (lịch sử gia đình, ảnh xưởng, chứng nhận, tọa độ, tối đa 24 sản phẩm `isActive`). **Chỉ trả xưởng có `user.status = ACTIVE`** (`PENDING`/`SUSPENDED` → `404`). |
| 22 | `artisans` | `PUT` | `/artisans/me` | Artisan | Cập nhật hồ sơ xưởng của chính mình (`shopName`, `familyHistory`, `craftSpecialty`, `address`, `latitude`, `longitude`, `isOpenForVisit`, `openingHours`, `coverImage`, `galleryImages`, `certificates`; ít nhất 1 trường). |
| 23 | `catalog` | `GET` | `/categories` | Public | Danh sách phân loại (tạo qua `seed.js`). |
| 24 | `catalog` | `GET` | `/products` | Public | Danh sách sản phẩm (`isActive = true`, thuộc xưởng `ACTIVE`). Query: `?artisanId=&categoryId=&search=&isUnique=true&page=1&limit=12`. |
| 25 | `catalog` | `GET` | `/products/me` | Artisan | Danh sách **mọi** sản phẩm của xưởng mình (kể cả đã ẩn), trả **đầy đủ trường chỉnh sửa** (`description`, `images`, `categoryId`, `batchId`) để mở modal sửa trực tiếp. **Khai báo route này trước `/products/:slug`** trong Express; slug `me` bị cấm khi sinh slug. |
| 26 | `catalog` | `GET` | `/products/:slug` | Public | Chi tiết sản phẩm kèm thông tin xưởng và `batch.batchCode` (nếu có) để nhảy sang trang truy xuất. Ẩn hoặc xưởng không `ACTIVE` → `404`. |
| 27 | `catalog` | `POST` | `/products` | Artisan | Đăng sản phẩm (nếu truyền `batchId`, kiểm tra lô thuộc xưởng mình, sai → `404`; `categoryId` không tồn tại → `400`). |
| 28 | `catalog` | `PUT` | `/products/:id` | Artisan | Cập nhật sản phẩm (kiểm tra ownership, ít nhất 1 trường); dùng cả để hiện lại sản phẩm đã ẩn (`isActive: true`) hoặc gỡ lô (`batchId: null`). |
| 29 | `catalog` | `DELETE` | `/products/:id` | Artisan | **Ẩn** sản phẩm (`isActive = false`), không xoá cứng (kiểm tra ownership). |

### Payload mẫu phần 2

**`GET /artisans?openOnly=true` (một phần tử, dùng cho Pin bản đồ):**
```json
{
  "id": 2, "slug": "gom-minh-long", "shopName": "Gốm Minh Long", "craftSpecialty": "Gốm men lam",
  "address": "Xóm 3, Bát Tràng", "latitude": 20.9738, "longitude": 105.9115,
  "isOpenForVisit": true, "openingHours": "08:00 - 17:30", "coverImage": "/uploads/full/ab12.webp"
}
```
Ảnh nhỏ cho popup suy ra từ `coverImage` bằng hàm `thumbOf(url)` (đổi `/uploads/full/` thành `/uploads/thumb/`, hai bản cùng tên file).

---

## Phần 3: `quotes` — Thành viên 3 (9 API)

| STT | Module | Method | Endpoint | Quyền | Mô tả & Quy tắc |
| :---: | :--- | :---: | :--- | :--- | :--- |
| 30 | `quotes` | `GET` | `/quotes` | Auth | Phân dữ liệu theo vai trò: **Buyer** xem đơn mình tạo; **Artisan** xem đơn được mời (`QuoteInvitation`); **Admin** xem toàn bộ. Query: `?status=&page=1&limit=10`. |
| 31 | `quotes` | `GET` | `/quotes/:id` | Auth | Chi tiết yêu cầu kèm `version`, `invitedCount` (Buyer/Admin) và `bids`. Buyer chỉ xem đơn của mình (thấy mọi bid); Artisan chỉ xem đơn được mời và **chỉ thấy bid của chính mình**; Admin xem toàn bộ. Không thuộc quyền → `404`. |
| 32 | `quotes` | `POST` | `/quotes` | Buyer | Tạo yêu cầu ở trạng thái `DRAFT` (`categoryId` nếu truyền phải tồn tại → `400`). |
| 33 | `quotes` | `PUT` | `/quotes/:id` | Buyer | Sửa yêu cầu (ít nhất 1 trường; chỉ khi `DRAFT` và là chủ đơn). Dùng `updateMany` kèm `status: 'DRAFT'` + tăng `version` để chống ghi đè đơn vừa gửi. |
| 34 | `quotes` | `POST` | `/quotes/:id/send` | Buyer / Admin | `workflows/send-quote.workflow.js`: kiểm `DRAFT` (`400`) và `deliveryDeadline > now` (`400`); trong `$transaction` khoá bằng `updateMany` (`DRAFT` → `SENT_TO_ARTISANS`, tăng `version`, `count === 0` → `409`) và tạo `QuoteInvitation` (`skipDuplicates: true`). Có `artisanIds` thì mời các hộ `ACTIVE` đó; không có thì tự tìm hộ `ACTIVE` có sản phẩm thuộc `categoryId` (dự phòng: toàn bộ hộ `ACTIVE`). |
| 35 | `quotes` | `POST` | `/quotes/:id/bids` | Artisan | Gửi hoặc sửa chào giá (`unitPrice`, `offeredQuantity`, `estimatedCompletionDate`, `note`). Pre-check được mời (`404`) và đơn còn nhận chào giá (`400`). Mở đầu transaction bằng `updateMany` tăng `version` đơn cha (`count === 0` → `409`). Bid đầu tiên đưa đơn sang `ARTISANS_BIDDING`. |
| 36 | `quotes` | `POST` | `/quotes/:id/accept` | Buyer / Admin | `workflows/accept-quote.workflow.js`: nhận `version` và `allocations: [{ bidId, acceptedQuantity }]`. Trong `$transaction`: **khoá trước** bằng `updateMany` (`id`, `version`, `status = ARTISANS_BIDDING` → `BUYER_ACCEPTED`, tăng `version`), **sau đó** đọc bid và kiểm tra hộ còn `ACTIVE`, `1 ≤ acceptedQuantity ≤ offeredQuantity`, `sum ≤ totalQuantity`. Gán `ACCEPTED` + `acceptedQuantity` cho bid chọn, bid `SUBMITTED` còn lại → `REJECTED`. Sai điều kiện → ném lỗi, transaction rollback. |
| 37 | `quotes` | `PATCH` | `/quotes/:id/bids/:bidId/status` | Artisan | Chủ bid cập nhật `ACCEPTED` → `IN_PRODUCTION` → `DELIVERED` theo `quote-state-machine.js`. Kiểm tra đủ 3 khoá `{ id: bidId, quoteRequestId: quoteId, artisanId }` (`404`). Mở đầu bằng `updateMany` tăng `version` đơn cha (điều kiện `BUYER_ACCEPTED`/`IN_PRODUCTION`). Đồng bộ đơn cha: có ≥ 1 bid `IN_PRODUCTION` → `IN_PRODUCTION`; mọi bid được chọn `DELIVERED` → `DELIVERED`. |
| 38 | `quotes` | `PATCH` | `/quotes/:id/cancel` | Buyer / Admin | Huỷ đơn (nhận `version`), chỉ ở `DRAFT`, `SENT_TO_ARTISANS`, `ARTISANS_BIDDING`, `BUYER_ACCEPTED`. `updateMany` có điều kiện (`version` + trạng thái) → `CANCELLED`, đồng thời chuyển mọi bid `SUBMITTED`/`ACCEPTED` → `CANCELLED` (bid `REJECTED` giữ nguyên) trong cùng transaction. |

### Kết quả đồng thời: nên trả mã nào?

| Tình huống | Mã |
| :--- | :---: |
| Chuyển trạng thái **không có trong bảng State Machine** (kiểm tra trên bản đọc được, trước khi mở transaction) | `400` |
| `updateMany` trả `count === 0` (version lệch, đơn vừa bị đổi/huỷ ở nơi khác) | `409` kèm "Đơn vừa được cập nhật ở nơi khác, vui lòng tải lại" |
| Hộ không được mời, bid không thuộc đơn/mình, đơn của người khác | `404` |

### Payload mẫu phần 3

**`POST /quotes` (Buyer tạo đơn):**
```json
{
  "title": "Đặt 5.000 cốc in logo Trường ĐH Công nghệ",
  "description": "Cốc sứ trắng 300ml, in logo một mặt, hộp giấy riêng từng cặp",
  "categoryId": 2,
  "totalQuantity": 5000,
  "targetBudget": 250000000,
  "deliveryDeadline": "2027-01-15T00:00:00.000Z"
}
```

**`POST /quotes/:id/bids` (Nghệ nhân chào giá):**
```json
{
  "unitPrice": 42000,
  "offeredQuantity": 3000,
  "estimatedCompletionDate": "2026-12-20T00:00:00.000Z",
  "note": "Bao gồm hộp giấy và in logo men bền màu"
}
```

**`POST /quotes/:id/accept` (chốt và phân bổ 5.000 cốc cho 2 xưởng):**
```json
{
  "version": 3,
  "allocations": [
    { "bidId": 12, "acceptedQuantity": 3000 },
    { "bidId": 15, "acceptedQuantity": 2000 }
  ]
}
```

**`PATCH /quotes/:id/bids/:bidId/status`:**
```json
{ "status": "IN_PRODUCTION" }
```

**`PATCH /quotes/:id/cancel`:**
```json
{ "version": 4 }
```

---

## Checklist cho mỗi endpoint mới

- [ ] Có Zod validator cho `params`/`query`/`body` (`.strict()` để từ chối trường lạ).
- [ ] Gắn `authMiddleware` + `requireRole` đúng cột **Quyền**.
- [ ] Ownership check trong service/workflow, sai thì `404`.
- [ ] Phản hồi đúng khuôn `{ success, data, meta? }` / `{ success: false, message, errors? }`.
- [ ] Cập nhật bảng này và file Postman Collection.
