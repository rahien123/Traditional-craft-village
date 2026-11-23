# 00. Yêu cầu, Phạm vi & Quy tắc nghiệp vụ

Tài liệu một trang để cả nhóm kiểm tra "đã đủ chức năng chưa" và trả lời nhanh khi vấn đáp.

## 1. Phạm vi

**Có làm:** Triển lãm số (hồ sơ xưởng + sản phẩm), Truy xuất nguồn gốc bằng QR, Bản đồ số làng nghề, Báo giá và điều phối đơn sỉ (chia đơn cho nhiều hộ), Tin tức cộng đồng, quản trị hộ gia đình.

**Không làm:** thanh toán online, vận chuyển, hoá đơn (báo giá dừng ở `DELIVERED`); app mobile native; chat thời gian thực; thông báo đẩy (người dùng xem trạng thái ở trang đơn); nhiều làng nghề cùng lúc (một lần triển khai = một làng nghề).

## 2. Vai trò & quyền

| Vai trò | Có tài khoản bằng cách | Làm được |
| :--- | :--- | :--- |
| **Khách vãng lai** | Không cần | Xem sản phẩm, xưởng, bản đồ, tin tức, trang truy xuất QR |
| **BUYER** | Tự đăng ký (`ACTIVE` ngay) | Mọi thứ của khách + tạo/gửi/huỷ yêu cầu báo giá, chốt phân bổ, theo dõi tiến độ |
| **ARTISAN** | Tự đăng ký (`PENDING`) → Admin duyệt | Quản lý hồ sơ xưởng, sản phẩm, lô + nhật ký + QR, chào giá, cập nhật tiến độ sản xuất |
| **ADMIN** | Tạo bằng `seed.js` | Duyệt/khoá hộ gia đình, đăng/sửa/xoá tin tức, giám sát (và gửi/chốt/huỷ thay) các đơn báo giá |

## 3. Checklist chức năng (đối chiếu đề)

| ID | Chức năng | Trang / API chính | TV | Ưu tiên |
| :--- | :--- | :--- | :---: | :---: |
| F-01 | Đăng ký / đăng nhập / đăng xuất / khôi phục phiên | `/auth/*` | 1 | Bắt buộc |
| F-02 | Admin duyệt / khoá hộ gia đình | `/admin/artisans*` | 1 | Bắt buộc |
| F-03 | Hồ sơ xưởng: lịch sử gia đình, ảnh, chứng nhận, tọa độ, mở cửa đón khách | `/artisans*` | 2 | Bắt buộc |
| F-04 | Danh mục sản phẩm, lọc theo hộ / phân loại, tìm kiếm, phân trang | `/products`, `/categories` | 2 | Bắt buộc |
| F-05 | Hộ đăng / sửa / ẩn sản phẩm (nhiều ảnh), xem cả sản phẩm đã ẩn | `/products`, `/products/me` | 2 | Bắt buộc |
| F-06 | Upload nhiều ảnh, tự nén `.webp` hai kích thước | `/uploads/images` | 1 | Bắt buộc |
| F-07 | Bản đồ số: Pin xưởng, Popup, lọc "đang mở cửa" | `GET /artisans?openOnly` | 2 | Bắt buộc |
| F-08 | Lô sản xuất + nhật ký mốc thời gian + ảnh chứng minh | `/batches*` | 1 | Bắt buộc |
| F-09 | Nhiều sản phẩm cùng lô dùng chung 1 mã QR; tải/in QR | `qrCodeDataUrl` | 1 | Bắt buộc |
| F-10 | Landing truy xuất công khai khi quét QR | `/trace/:batchCode` | 1 | Bắt buộc |
| F-11 | Buyer tạo yêu cầu báo giá (nháp), gửi tới các hộ phù hợp | `/quotes`, `/quotes/:id/send` | 3 | Bắt buộc |
| F-12 | Hộ chào giá (đơn giá, số lượng nhận, ngày hoàn thành) | `/quotes/:id/bids` | 3 | Bắt buộc |
| F-13 | Buyer chốt, **chia đơn cho nhiều hộ** | `/quotes/:id/accept` | 3 | Bắt buộc |
| F-14 | Hộ cập nhật tiến độ; đơn tự đồng bộ; huỷ đơn | `/quotes/:id/bids/:bidId/status`, `/cancel` | 3 | Bắt buộc |
| F-15 | Admin giám sát toàn bộ đơn | `GET /quotes` (Admin) | 3 | Bắt buộc |
| F-16 | Tin tức: giá nguyên liệu, lịch cúp điện, chính sách hỗ trợ | `/news*` | 1 | Bắt buộc |
| F-17 | Sửa / xoá mốc nhật ký, sửa lô | `PUT/DELETE …/logs/:logId`, `PUT /batches/:id` | 1 | Nên có |

## 4. Quy tắc nghiệp vụ (tham chiếu trong code và test)

| Mã | Quy tắc |
| :--- | :--- |
| BR-01 | Tài khoản `PENDING` hoặc `SUSPENDED` không đăng nhập được; thông báo nêu rõ lý do |
| BR-02 | Chỉ hộ `ACTIVE` xuất hiện ở danh sách công khai, trang hồ sơ `/artisans/:slug`, bản đồ, và được mời báo giá |
| BR-03 | Admin khoá hộ thì cookie đang có cũng bị chặn ngay ở request kế tiếp (kiểm `status` mỗi request) |
| BR-04 | Sản phẩm thuộc đúng một hộ; gắn lô chỉ khi lô thuộc cùng hộ (sai trả `404`) |
| BR-05 | "Xoá" sản phẩm là **ẩn** (`isActive = false`), hiện lại bằng `PUT` |
| BR-06 | Trang truy xuất công khai, tra theo `batchCode` ngẫu nhiên khó đoán |
| BR-07 | Mỗi hộ có tối đa một chào giá cho mỗi đơn; chỉ sửa khi còn `SUBMITTED` và đơn còn nhận chào giá |
| BR-08 | **Chào giá kín:** hộ chỉ thấy bid của mình; Buyer và Admin thấy tất cả |
| BR-09 | Khi chốt: `1 ≤ acceptedQuantity ≤ offeredQuantity` từng hộ và `sum ≤ totalQuantity`; mọi hộ được chọn phải còn `ACTIVE` |
| BR-10 | Chốt một phần là chủ ý: đơn `DELIVERED` khi mọi bid **đã chọn** giao xong |
| BR-11 | Mọi chuyển trạng thái đi qua `quote-state-machine.js`; sai luật trả `400` |
| BR-12 | Huỷ đơn trước `IN_PRODUCTION` tự chuyển các bid `SUBMITTED`/`ACCEPTED` thành `CANCELLED` (bid `REJECTED` giữ nguyên) |
| BR-13 | Đơn đã `IN_PRODUCTION` không được huỷ |
| BR-14 | Đụng độ đồng thời (`version` lệch, đơn vừa đổi) trả `409`; người dùng tải lại dữ liệu |
| BR-15 | Truy cập tài nguyên của người khác trả `404`, không phải `403` |
| BR-16 | Đơn giá là số nguyên VND (`Int`, tối đa `2.000.000.000`); ngân sách gợi ý `targetBudget` là `Float?` (tối đa `1.000.000.000.000`) |

## 5. Ánh xạ thang điểm → cách đáp ứng

| # | Tiêu chí | Hệ số | Cách đáp ứng | Xem |
| :---: | :--- | :---: | :--- | :--- |
| 1 | Chức năng đã cài đặt | **0.35** | Đủ 3 vai trò + 4 yêu cầu kỹ thuật (mục 3) | `00`, `03` |
| 2 | Thiết kế logic, dễ sử dụng | 0.10 | Luồng rõ theo vai trò, trạng thái đơn trực quan, thông báo lỗi tiếng Việt dễ hiểu, việc chính ≤ 3 click | `05` |
| 3 | Giao diện: responsive, đẹp, có bản sắc | **0.20** | Bộ giao diện chung (màu đất nung/men ngọc), ảnh là trung tâm, mobile-first, một người giữ bộ UI | `05` |
| 4 | Hiệu năng: AJAX, tải từng phần, JSON | 0.10 | SPA + API JSON, không reload; ảnh `thumb` WebP + lazy; `select` rút gọn cho bản đồ | `01` mục 4.3–4.4 |
| 5 | Phong cách lập trình | 0.05 | Modular + Workflow + State Machine + Singleton; ESLint/Prettier; comment tiếng Việt giải thích "vì sao" | `01` mục 1 |
| 6 | Xử lý nhập liệu | 0.05 | Zod (`.strict()`) ở backend; `react-hook-form` + Zod ở frontend; tìm kiếm gợi ý (`useDebounce`); click bản đồ lấy toạ độ; tự sinh slug | `01`, `05` |
| 7 | An ninh | 0.05 | bcrypt, cookie `httpOnly` + `SameSite=Lax`, kiểm `status` mỗi request, phân quyền + ownership, rate limit, helmet | `01` mục 2 |
| 8 | Viết lại / định tuyến URL | 0.05 | `/products/:slug`, `/artisans/:slug`, `/trace/:batchCode`; slug tiếng Việt không dấu | `05` mục 1 |
| 9 | CSDL hướng đối tượng, độc lập CSDL | 0.05 | Prisma (Data Mapper), mọi truy cập qua Prisma Client (không viết SQL thô), schema khai báo bằng mô hình Prisma | `02` |

## 6. Checklist bảo mật & nhập liệu trước khi demo

- [ ] `role` đăng ký chỉ nhận `BUYER`/`ARTISAN`; thử gửi `ADMIN` bị từ chối `400`.
- [ ] Mọi route ghi (trừ `register`, `login`, `logout`) có `authMiddleware` + `requireRole` + Zod validator.
- [ ] Hộ A không xem/sửa được sản phẩm, lô, bid của hộ B (nhận `404`).
- [ ] Buyer B không xem được đơn của Buyer A; hộ chỉ thấy bid của mình.
- [ ] `/auth/login` bị `429` sau 10 lần đăng nhập sai (`skipSuccessfulRequests: true`).
- [ ] Upload file không phải ảnh (kể cả `.svg` đổi đuôi `.jpg`) bị từ chối `415`; gửi 0 file bị `400`; ảnh > 5MB bị `413`.
- [ ] Không log mật khẩu/cookie; `.env` không nằm trong git; lỗi production không lộ stack trace.
- [ ] `npm audit --omit=dev` không có lỗ hổng mức cao.
