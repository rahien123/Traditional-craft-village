# 06. Lược đồ dữ liệu API (Response shapes, Validation, Quy tắc truy vấn)

Bổ sung cho `03-api-contract.md`: file 03 nói **endpoint nào, ai được gọi**; file này nói **gửi gì, nhận gì, kiểm tra gì**. Khi hai file lệch nhau, **file 03 thắng về endpoint/quyền, file 06 thắng về hình dạng dữ liệu**. Mọi response nằm trong khuôn `{ success, data, meta? }` (xem 03).

## 1. Kiểu dùng chung

```text
Image        = { url: string, thumbnailUrl: string }          // "/uploads/full/<uuid>.webp", "/uploads/thumb/<uuid>.webp"
Certificate  = { title: string, issuer: string, imageUrl: string | null }
UserPublic   = { id, email, fullName, phone|null, role, status }  // KHÔNG BAO GIỜ trả passwordHash
Money        = integer VND (Int)
DateTime     = ISO 8601 UTC string (Prisma Date tự serialize)
```

`thumbOf(url)`: đổi `/uploads/full/` → `/uploads/thumb/` (cùng tên file). Cột nào lưu một URL đơn (`ArtisanProfile.coverImage`, `ProductionLog.imageUrl`, `News.imageUrl`, `certificates[].imageUrl`) thì lưu bản **full**, bản thumb suy ra bằng `thumbOf()`. Riêng `ProductionLog` có thêm cột `thumbnailUrl` trong DB nhưng server tự tính `imageUrl ? thumbOf(imageUrl) : null` khi lưu, client chỉ gửi `imageUrl`. Cột `Json` (`galleryImages`, `images`) lưu mảng `Image`.

## 2. Quy tắc validate (Zod 3, mọi schema body `.strict()`)

Thông báo lỗi tiếng Việt, trả qua `errors[{ field, message }]` (đọc từ `err.issues`). `field` là đường dẫn có dấu chấm (`allocations.0.acceptedQuantity`).

| Trường | Quy tắc |
| :--- | :--- |
| `email` | email hợp lệ, chuẩn hoá `trim().toLowerCase()`, ≤ 120 ký tự |
| `password` (register) | 8–72 ký tự (giới hạn bcrypt) |
| `password` (login) | 1–72 ký tự (không chặn mật khẩu cũ nếu chính sách đổi) |
| `role` (register) | `z.discriminatedUnion('role', [buyerSchema, artisanSchema])`: `BUYER` không nhận field xưởng; `ARTISAN` bắt buộc `shopName`, tuỳ chọn `address`, `craftSpecialty` |
| `fullName`, `shopName`, `title`, `name` (Product), `certificates[].issuer` | `trim()`, 2–120 ký tự |
| `phone` | tuỳ chọn, `^(0\|\+84)\d{9,10}$` |
| `address`, `craftSpecialty`, `openingHours`, `stageName` | `trim()`, ≤ 200 ký tự |
| `description`, `story`, `familyHistory`, `note`, `content` | ≤ 5000 ký tự (`content` tin tức ≤ 20000) |
| `latitude` / `longitude` | số, `[-90, 90]` / `[-180, 180]`; phải gửi **cả hai hoặc không gửi cả hai** (khi `PUT /artisans/me` cho phép gửi cả hai là `null` để xoá toạ độ) |
| `price`, `unitPrice` | số nguyên `1 … 2_000_000_000` |
| `totalQuantity`, `offeredQuantity`, `acceptedQuantity` | số nguyên `1 … 1_000_000` |
| `targetBudget` | tuỳ chọn, `z.number().finite().positive().max(1_000_000_000_000)` (`nullable` khi `PUT`) |
| `deliveryDeadline` | `z.coerce.date()`, phải **sau thời điểm hiện tại** khi tạo/sửa/gửi |
| `estimatedCompletionDate` | `z.coerce.date()`, không được trước **đầu ngày hôm nay theo giờ Việt Nam (`UTC+7`)** |
| URL ảnh đơn (`coverImage`, `News.imageUrl`, `ProductionLog.imageUrl`, `certificates[].imageUrl`) | khớp `/^\/uploads\/full\/[0-9a-f-]+\.webp$/` (chặn URL ngoài), cho phép `null` khi `PUT` để gỡ ảnh |
| `images` (Product) / `galleryImages` (Artisan) | mảng `Image` (`1–10` cho Product, `0–20` cho Artisan); mỗi `url` khớp regex `/^\/uploads\/full\/[0-9a-f-]+\.webp$/` và `thumbnailUrl === thumbOf(url)` |
| `certificates` | mảng `Certificate`, `0–10` phần tử |
| `stepOrder` | số nguyên `1 … 100`; trong một lô không trùng (trùng → `409`) |
| `loggedAt`, `startDate`, `completedDate` | `z.coerce.date()`; `completedDate >= startDate` (khi `PUT /batches/:id`, kiểm tra lại với bản ghi cũ trong `batches.service.js` nếu chỉ gửi 1 trong 2 ngày) |
| `page`, `limit` | `z.coerce.number().int()`, `page ≥ 1` (mặc định 1), `1 ≤ limit ≤ 50` (mặc định theo endpoint) |
| id trong path | `z.coerce.number().int().positive()`; `:slug`/`:batchCode` là chuỗi ≤ 120 |
| `status` (admin PATCH / query) | PATCH body: `z.enum(['ACTIVE', 'SUSPENDED'])`; GET query: `PENDING \| ACTIVE \| SUSPENDED` |
| `status` (quotes GET query) | `QuoteStatus` (`DRAFT \| SENT_TO_ARTISANS \| ARTISANS_BIDDING \| BUYER_ACCEPTED \| IN_PRODUCTION \| DELIVERED \| CANCELLED`) |
| `category` (news body / query) | `NewsCategory` (`MATERIAL_PRICE \| POWER_OUTAGE \| SUPPORT_POLICY \| GENERAL`) |
| `status` (bid) | `z.enum(['IN_PRODUCTION', 'DELIVERED'])` |
| `allocations` | mảng `1–50` phần tử `{ bidId, acceptedQuantity }`, **`bidId` không trùng nhau** |
| `version` | số nguyên `≥ 0` |

**Quy tắc chung cho `validate.middleware.js` và `PUT`:**
* Trước khi parse `query`, loại bỏ mọi key có giá trị `""` trên một bản sao nông của `req.query` (tránh `?artisanId=` bị `z.coerce.number()` ép thành `0`). Boolean query chỉ chấp nhận `"true"`/`"false"`.
* Trước khi parse `body`, dùng `req.body ?? {}` (Express 5 để `req.body` là `undefined` khi POST không có body).
* Các trường có dấu `?` trong `schema.prisma` nên dùng `.nullish()` (chấp nhận cả `undefined` và `null`) trên **cả `POST` lẫn `PUT`** (VD `Product.batchId`, `Product.description`, `ProductionLog.description`, `ProductionLog.imageUrl`, `ProductionBatch.story`, `ProductionBatch.completedDate`, `ArtisanProfile.{familyHistory,craftSpecialty,address,latitude,longitude,openingHours,coverImage}`, `News.imageUrl`, `QuoteRequest.{categoryId,targetBudget}`, `QuoteBid.note`). **Tuyệt đối không** cho `null` với các cột bắt buộc trong DB như `QuoteRequest.description`, `ProductionLog.loggedAt`, `ProductionBatch.startDate`. Frontend bỏ qua hoặc chuyển chuỗi rỗng `""` của ô không bắt buộc thành `undefined`/`null` trước khi gửi.
* Mọi endpoint `PUT` (`#10`, `#15`, `#17`, `#22`, `#28`, `#33`) yêu cầu **ít nhất 1 trường** (`.refine((o) => Object.keys(o).length > 0)`).

## 3. Hình dạng response từng endpoint

`[]` = mảng, `?` = có thể `null`/vắng. Danh sách có phân trang luôn kèm `meta { page, limit, total }`.

### Phần 1 — TV1

| # | Endpoint | `data` & Body |
| :-: | :--- | :--- |
| 1 | `POST /auth/register` `201` | `{ user: UserPublic }` — **không** set cookie (Buyer vào trang đăng nhập; Artisan thấy thông báo "chờ duyệt"). Body: `discriminatedUnion` theo `role`. |
| 2 | `POST /auth/login` | `{ user: UserPublic }` + `Set-Cookie`. Body: `{ email, password }`. Sai email/mật khẩu → `401` "Email hoặc mật khẩu không đúng"; `PENDING` → `403` "Tài khoản đang chờ Ban quản lý duyệt"; `SUSPENDED` → `403` "Tài khoản đã bị khoá". |
| 3 | `POST /auth/logout` | `{}` (Public, xoá cookie, luôn `200`). |
| 4 | `GET /auth/me` | `{ user: UserPublic & { artisanProfile?: { id, slug, shopName } } }`. |
| 5 | `POST /uploads/images` `201` | `Image[]`. Gửi 0 file → `400`. |
| 6 | `GET /admin/artisans` | `[{ userId, email, fullName, phone?, status, createdAt, verifiedAt?, profile: { id, slug, shopName, address?, craftSpecialty? } }]`, mặc định mọi trạng thái, sắp `[{ createdAt: 'desc' }, { id: 'desc' }]`, `limit` mặc định 10. |
| 7 | `PATCH /admin/artisans/:userId/status` | `{ userId, status, verifiedAt? }`. Body: `{ status }`. `:userId` không phải hộ gia đình → `404`; tự khoá mình → `400`. Chỉ gán `verifiedAt = now()` khi duyệt lần đầu (đang `null`); mở khoá lại không đổi `verifiedAt`. |
| 8 | `GET /news` | `[{ id, title, slug, category, content, imageUrl?, publishedAt, author: { fullName } }]`, sắp `[{ publishedAt: 'desc' }, { id: 'desc' }]`, `limit` mặc định 10. |
| 9 | `POST /news` `201` | `News` đầy đủ như trên. Body: `{ title, category, content, imageUrl? }`. |
| 10 | `PUT /news/:id` | như trên. Body: các trường như POST (tuỳ chọn, ít nhất 1, `imageUrl` nullable). Đổi `title` **không** đổi `slug`. |
| 11 | `DELETE /news/:id` | `{ id }`. |
| 12 | `GET /batches` | `[{ id, batchCode, title, startDate, completedDate?, logCount, productCount, traceUrl, qrCodeDataUrl }]`, sắp `createdAt` giảm dần, **không phân trang** (mỗi hộ ít lô). |
| 13 | `POST /batches` `201` | `{ id, batchCode, title, story?, startDate, completedDate?, traceUrl, qrCodeDataUrl }`. Body: `{ title, story?, startDate, completedDate? }`. |
| 14 | `GET /batches/:id` | `{ id, batchCode, title, story?, startDate, completedDate?, traceUrl, qrCodeDataUrl, logs: LogItem[], products: [{ id, name, slug, thumbnailUrl? }] }`. |
| 15 | `PUT /batches/:id` | `{ id, batchCode, title, story?, startDate, completedDate? }`. Body: các trường của POST (tuỳ chọn, ít nhất 1; `story`, `completedDate` nullable). |
| 16 | `POST /batches/:id/logs` `201` | `LogItem`. Body: `{ stepOrder, stageName, description?, loggedAt?, imageUrl? }` (server tự tính `thumbnailUrl`). |
| 17 | `PUT /batches/:id/logs/:logId` | `LogItem`. Body: các trường của POST (tuỳ chọn, ít nhất 1; `description`, `imageUrl` nullable). |
| 18 | `DELETE /batches/:id/logs/:logId` | `{ id }`. |
| 19 | `GET /trace/:batchCode` | `{ batchCode, title, story?, startDate, completedDate?, artisan: { slug, shopName, address?, craftSpecialty?, verified: boolean }, logs: LogItem[], products: [{ id, name, slug, price, thumbnailUrl? }] }`. |

`LogItem = { id, stepOrder, stageName, description?, loggedAt, imageUrl?, thumbnailUrl? }`, luôn sắp `stepOrder` tăng dần.
`traceUrl = FRONTEND_URL + "/trace/" + batchCode`; `qrCodeDataUrl` là PNG base64 của `traceUrl` (`qrcode.toDataURL`, `margin: 2`, `width: 320`), **sinh lúc trả response, không lưu DB**.
Trang truy xuất `#19` chỉ liệt kê sản phẩm `isActive = true`; lô không tồn tại → `404` "Không tìm thấy tài nguyên" (hoặc "Mã truy xuất không hợp lệ"). Hộ `SUSPENDED` thì lô vẫn tra được (dữ liệu lịch sử), `verified` theo `verifiedAt !== null`.

### Phần 2 — TV2

| # | Endpoint | `data` & Body |
| :-: | :--- | :--- |
| 20 | `GET /artisans` | `[{ id, slug, shopName, craftSpecialty?, address?, latitude?, longitude?, isOpenForVisit, openingHours?, coverImage? }]`. `limit` mặc định 50 (bản đồ lấy một lượt), sắp `[{ isOpenForVisit: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]`. `search` khớp `shopName` hoặc `craftSpecialty`, không phân biệt hoa thường. |
| 21 | `GET /artisans/:slug` | `{ id, slug, shopName, familyHistory?, craftSpecialty?, address?, latitude?, longitude?, isOpenForVisit, openingHours?, coverImage?, galleryImages: Image[], certificates: Certificate[], verified: boolean, products: ProductCard[] }` (tối đa 24 sản phẩm `isActive`, sắp `[{ createdAt: 'desc' }, { id: 'desc' }]`). **Xưởng có `user.status !== 'ACTIVE'` → `404`.** |
| 22 | `PUT /artisans/me` | giống #21 (không kèm `products`). Mọi trường tuỳ chọn, ít nhất 1. `shopName` đổi thì **không** đổi `slug`. Không cho sửa `verifiedAt`, `slug`. |
| 23 | `GET /categories` | `[{ id, name, slug, description? }]`, sắp `name` tăng dần (không phân trang). |
| 24 | `GET /products` | `ProductCard[]`, `limit` mặc định 12. |
| 25 | `GET /products/me` | `[{ id, name, slug, price, description?, images: Image[], isUnique, isActive, categoryId, category: { id, name }, batchId?, batch?: { id, batchCode, title }, createdAt }]`, sắp `createdAt` giảm dần rồi `id` giảm dần, có phân trang (`limit` mặc định 12). |
| 26 | `GET /products/:slug` | `{ id, name, slug, price, description?, images: Image[], isUnique, isActive, category: { id, name, slug }, artisan: { id, slug, shopName, address?, coverImage? }, batch?: { batchCode, title } }`. Sản phẩm ẩn hoặc xưởng không `ACTIVE` → `404`. |
| 27 | `POST /products` `201` | như #26. Body: `{ name, categoryId, price, description?, images, isUnique?, batchId? }`. `batchId` không thuộc xưởng mình → `404`; `categoryId` không tồn tại → `400`. |
| 28 | `PUT /products/:id` | như #26. Body: mọi trường của POST + `isActive`, tuỳ chọn, ít nhất 1 (`batchId`, `description` nullable). Đổi `name` **không** đổi `slug`. |
| 29 | `DELETE /products/:id` | `{ id, isActive: false }`. |

`ProductCard = { id, name, slug, price, thumbnailUrl?, isUnique, artisan: { id, slug, shopName } }` với `thumbnailUrl = images[0]?.thumbnailUrl ?? null`.

Quy tắc `GET /products`: `search` khớp `name` (chứa, không phân biệt hoa thường; Postgres dùng `mode: 'insensitive'`); `isUnique=true` chỉ lọc độc bản, vắng thì không lọc; sắp `[{ createdAt: 'desc' }, { id: 'desc' }]`; `limit` mặc định 12.

### Phần 3 — TV3

Hình dạng dùng chung (dựng duy nhất bởi `src/modules/quotes/quote.presenter.js`):

```text
QuoteListItem = { id, title, status, totalQuantity, deliveryDeadline, version, createdAt,
                  category?: { id, name }, buyer?: { id, fullName },   // buyer chỉ có khi Admin/Artisan xem
                  bidCount: number,                                    // Buyer/Admin: tổng bid; Artisan: 0 hoặc 1 (bid của mình)
                  myBidStatus?: BidStatus }                            // chỉ Artisan
Bid           = { id, artisanId, artisan: { shopName, slug }, unitPrice, offeredQuantity, acceptedQuantity?,
                  estimatedCompletionDate, note?, status, createdAt, updatedAt }
QuoteDetail   = QuoteListItem-trừ-bidCount & {
                  description, targetBudget?,
                  invitedCount?: number,                               // chỉ Buyer/Admin
                  allocatedQuantity?: number,                          // chỉ Buyer/Admin
                  bids: Bid[] }
```

`allocatedQuantity = sum(acceptedQuantity)` của bid ở trạng thái `ACCEPTED`/`IN_PRODUCTION`/`DELIVERED`, tính ở presenter (không lưu). **Chỉ Buyer/Admin nhận `allocatedQuantity` và `invitedCount`**; Artisan không nhận (tránh lộ bid của hộ khác).

| # | Endpoint | `data` & Body |
| :-: | :--- | :--- |
| 30 | `GET /quotes` | `QuoteListItem[]`, sắp `[{ createdAt: 'desc' }, { id: 'desc' }]`, `limit` mặc định 10. Artisan **không** thấy đơn `DRAFT` (chưa mời nên tự nhiên không có). |
| 31 | `GET /quotes/:id` | `QuoteDetail`; Artisan: `bids` chỉ chứa bid của mình. |
| 32 | `POST /quotes` `201` | `QuoteDetail` (`bids: []`, `invitedCount: 0`, `allocatedQuantity: 0`, `version: 0`). Body: `{ title, description, categoryId?, totalQuantity, targetBudget?, deliveryDeadline }`. `categoryId` không tồn tại → `400`. |
| 33 | `PUT /quotes/:id` | `QuoteDetail`. Body như POST (tuỳ chọn, ít nhất 1; `categoryId`, `targetBudget` nullable). Không phải `DRAFT` → `400`; race condition khi sửa song song gửi → `409`. |
| 34 | `POST /quotes/:id/send` | `QuoteDetail` (có sẵn `invitedCount`). Body: `{ artisanIds?: int[] (1–50) }` (có thể gửi body rỗng). |
| 35 | `POST /quotes/:id/bids` `201` (tạo) / `200` (sửa) | `Bid`. Body: `{ unitPrice, offeredQuantity, estimatedCompletionDate, note? }`. |
| 36 | `POST /quotes/:id/accept` | `QuoteDetail` mới (kèm `version` mới). Body: `{ version, allocations: [{ bidId, acceptedQuantity }] }`. |
| 37 | `PATCH /quotes/:id/bids/:bidId/status` | `QuoteDetail` (Artisan chỉ thấy bid của mình). Body: `{ status }`. |
| 38 | `PATCH /quotes/:id/cancel` | `QuoteDetail` (các bid `SUBMITTED`/`ACCEPTED` → `CANCELLED`; bid `REJECTED` giữ nguyên). Body: `{ version }`. |

Chi tiết nghiệp vụ cần ghi rõ để khỏi đoán:

* **#34 chọn hộ để mời:** pre-check ownership (`404`), `quote.status === 'DRAFT'` (`400`) và `quote.deliveryDeadline > new Date()` (`400`). Mở `prisma.$transaction(async (tx) => ...)`: bước 1 khoá bằng `tx.quoteRequest.updateMany({ where: { id, status: 'DRAFT' }, data: { status: 'SENT_TO_ARTISANS', version: { increment: 1 } } })` (`count === 0` → `409`); bước 2 truy vấn danh sách hộ `ACTIVE` phù hợp bằng `tx` (có `artisanIds` → lọc trùng rồi lấy các id `ACTIVE`, id không hợp lệ bị bỏ qua; không có `artisanIds` → hộ `ACTIVE` có ≥ 1 sản phẩm `isActive` thuộc `categoryId`, nếu rỗng hoặc không có `categoryId` thì lấy toàn bộ hộ `ACTIVE`; nếu vẫn 0 hộ → ném `BadRequestError` `400` "Không có hộ phù hợp để mời" để rollback); bước 3 chạy `tx.quoteInvitation.createMany({ data, skipDuplicates: true })`.
* **#35 bid đầu tiên:** pre-check được mời (`404`) và trạng thái đơn cho phép chào giá (`400`). Trong transaction: `updateMany` khoá gốc với `status ∈ {SENT_TO_ARTISANS, ARTISANS_BIDDING}` tăng `version` (`count === 0` → `409`); upsert bid; sau đó chạy `updateMany({ where: { id, status: 'SENT_TO_ARTISANS' }, data: { status: 'ARTISANS_BIDDING' } })`. Sửa bid không đổi `status` (vẫn `SUBMITTED`).
* **#36 accept** do Buyer (chủ đơn) hoặc Admin gọi, luôn cần `version` đúng. Hộ không có trong `allocations` mà bid còn `SUBMITTED` → `REJECTED`. Bid không thuộc đơn này hoặc không ở `SUBMITTED` → `400`.
* **#37** tìm bid theo đủ 3 khoá `{ id: bidId, quoteRequestId: quoteId, artisanId: req.user.artisanId }` (`404` nếu không khớp). Artisan chỉ được `ACCEPTED → IN_PRODUCTION`, `IN_PRODUCTION → DELIVERED`; sai → `400`. Đơn đã `CANCELLED`/`DELIVERED` ở pre-check → `400`; đổi đột ngột lúc ghi (`updateMany` `count === 0`) → `409`.
* **Điều kiện `updateMany` ở #35/#37:** đơn ở trạng thái cho phép; `version` **không** nằm trong điều kiện (chỉ tăng) vì client không gửi `version`. Chỉ #36 và #38 nhận `version` từ client.
* **Sync đơn cha ở #37:** trong cùng transaction, sau khi cập nhật bid: nếu có bid `IN_PRODUCTION` mà đơn đang `BUYER_ACCEPTED` → đơn `IN_PRODUCTION`; nếu tập bid đã chọn (`status ∈ {ACCEPTED, IN_PRODUCTION, DELIVERED}`) đều là `DELIVERED` → đơn `DELIVERED`.

## 4. Thông báo lỗi chuẩn (tiếng Việt)

| Tình huống | HTTP | `message` |
| :--- | :-: | :--- |
| Zod sai | 400 | "Dữ liệu không hợp lệ" + `errors[]` |
| JSON body lỗi cú pháp (`SyntaxError`) | 400 | "JSON không hợp lệ" |
| Tham chiếu khoá ngoại sai (`P2003`) | 400 | "Dữ liệu tham chiếu không tồn tại" |
| Email đã tồn tại | 409 | "Email đã được đăng ký" |
| Trùng dữ liệu UNIQUE chung (`P2002`) | 409 | "Dữ liệu đã tồn tại" (riêng `stepOrder` trùng: "Thứ tự bước sản xuất đã tồn tại") |
| Chưa đăng nhập / cookie hỏng | 401 | "Vui lòng đăng nhập" |
| Sai vai trò | 403 | "Bạn không có quyền thực hiện thao tác này" |
| Không tồn tại / không thuộc quyền | 404 | "Không tìm thấy tài nguyên" (cùng một câu cho cả hai, dùng `NotFoundError`) |
| Sai State Machine | 400 | "Không thể chuyển từ <A> sang <B>" |
| Xung đột đồng thời | 409 | "Đơn vừa được cập nhật ở nơi khác, vui lòng tải lại" |
| Phân bổ sai / hộ ngừng hoạt động | 400 | "Tổng số lượng phân bổ vượt quá số lượng yêu cầu" / "Số lượng nhận của <shopName> vượt quá số lượng chào" / "Hộ <shopName> hiện không còn hoạt động" |
| Upload 0 file / quá số file | 400 | "Vui lòng chọn từ 1 đến 10 ảnh" |
| Upload sai loại | 415 | "Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP" |
| Upload quá lớn (`LIMIT_FILE_SIZE`) | 413 | "Ảnh vượt quá 5MB" |
| Rate limit | 429 | "Quá nhiều lần thử, vui lòng thử lại sau" |
| Lỗi không lường trước | 500 | "Đã có lỗi hệ thống" (không lộ stack trong production) |

`error.middleware.js` bắt chuẩn: `AppError`, `MulterError` (`LIMIT_FILE_SIZE` → `413`, mã khác → `400`), `SyntaxError` (`status === 400` → `400`), Prisma `P2002` (`409`), `P2025` (`404`), `P2003` (`400`).

## 5. Hợp đồng các hàm dùng chung (đường dẫn chuẩn theo `01-architecture.md`)

| File | Chữ ký | Ghi chú |
| :--- | :--- | :--- |
| `src/common/utils/slug.util.js` | `toSlug(text) → string`; `uniqueSlug(text, existsFn) → Promise<string>` | bỏ dấu tiếng Việt (`đ→d`), `kebab-case`, cấm `me` và chuỗi rỗng (fallback `item`), thêm `-2`, `-3` |
| `src/common/utils/image.util.js` | `thumbOf(url) → string` | thuần chuỗi: `/uploads/full/` → `/uploads/thumb/` |
| `src/common/utils/ownership.util.js` | `assertOwner(condition)` | sai điều kiện thì ném `new NotFoundError()` |
| `src/common/utils/response.util.js` | `ok(res, data, meta?, status=200)` | duy nhất nơi dựng khuôn thành công |
| `src/common/errors/AppError.js` | `AppError(status, message, errors?)`, `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`, `ConflictError` | error handler chuyển thành JSON lỗi |
| `src/common/middleware/validate.middleware.js` | `validate({ params?, query?, body? })` | lọc key `""` trên bản sao `req.query`, dùng `req.body ?? {}`, đọc `err.issues`, ghi `req.valid = { params, query, body }` |
| `src/common/middleware/auth.middleware.js` | gắn `req.user = { id, role, status, artisanId? }` | đọc `User` + `artisanProfile.id` mỗi request, chặn `status !== 'ACTIVE'` |
| `src/common/middleware/role.middleware.js` | `requireRole(...roles)` | trả `403` nếu sai vai trò |
| `src/infrastructure/storage/image.service.js` | `processImage(buffer) → Promise<Image>`, `validateImageBuffer(buffer)` | kiểm `format ∈ {'jpeg','png','webp'}`, dùng chung cho upload và seed |
| `src/infrastructure/qr/qr.service.js` | `buildTraceUrl(batchCode)`, `generateBatchQr(batchCode) → Promise<{ traceUrl, qrCodeDataUrl }>` | sinh QR động từ `env.FRONTEND_URL` |
| `src/modules/quotes/quote-state-machine.js` | `assertQuoteTransition(from, to)`, `assertBidTransition(from, to)` | ném `BadRequestError` (`400`) |
| `src/modules/quotes/quote.presenter.js` | `toQuoteListItem(quote, viewer)`, `toQuoteDetail(quote, viewer)` | **nơi duy nhất** lọc bid kín theo vai trò và tính `allocatedQuantity` / `invitedCount` |
