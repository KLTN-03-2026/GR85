# Changelog

Tài liệu này ghi lại các thay đổi theo từng lần cập nhật.
Mục mới nhất luôn được thêm ở cuối file.

---

## 2026-04-25 — Review Hybrid (mỗi lần mua 1 đánh giá) + Thread/Notification

### Thay đổi đã thực hiện

- **BE/prisma/migrations/20260425174500_review_hybrid_order_item/migration.sql**
  - **Thay đổi gì:**
    - Bổ sung `order_item_id` cho bảng `Reviews`.
    - Backfill `order_item_id` cho dữ liệu review hiện có (map theo đơn đã mua).
    - Bỏ ràng buộc unique theo `(user_id, product_id)` và thay bằng unique theo `order_item_id`.
    - Tạo FK từ `Reviews.order_item_id` → `Order_Items.id`.
    - Có guard/dynamic SQL để tránh lỗi index/FK trên MySQL khi drop index.
  - **Lý do:**
    - Triển khai mô hình **Hybrid**: user có thể review lại nếu mua lại (mỗi order-item chỉ được review 1 lần), đồng thời tránh lỗi migration do MySQL phụ thuộc index cho FK.

- **BE/prisma/schema.prisma**
  - **Thay đổi gì:**
    - Thêm trường/quan hệ để `Review` gắn với `OrderItem` qua `orderItemId`.
    - Thiết lập unique theo `orderItemId` (1 review / 1 order-item).
    - Giữ `ReviewReply` (thread phản hồi) mapping đúng bảng `Review_Replies`.
  - **Lý do:**
    - Đồng bộ Prisma schema với DB theo Hybrid để code BE có thể query/relate chính xác.

- **BE/src/services/product.service.js**
  - **Thay đổi gì:**
    - `getProductReviewEligibilityBySlug`: eligibility theo **order-item DELIVERED + PAID** chưa có review.
    - `createProductReviewBySlug`: tạo review gắn `orderItemId` (chọn order-item eligible đầu tiên), chặn trùng bằng unique `orderItemId`.
    - `listProductReviewsBySlug`:
      - Public chỉ trả **review mới nhất của mỗi user**.
      - Không dùng Prisma `distinct` (vì MySQL không đảm bảo “latest per group”); thay bằng sort `createdAt desc` rồi lọc unique theo `userId` ở JS.
      - `summary.totalReviews`/`averageRating` tính theo danh sách đã lọc (latest per user).
      - Trả `thread` (public) gồm user + staff replies.
  - **Lý do:**
    - Đúng nghiệp vụ Hybrid: mua lại → có thể review lại.
    - Public page tránh spam nhiều review từ cùng một user; vẫn hiển thị thread phản hồi.
    - Đảm bảo kết quả “latest review per user” **deterministic** trên MySQL.

- **BE/src/services/auth.service.js**
  - **Thay đổi gì:**
    - `listMyPendingReviews`: chuyển logic “chưa đánh giá” sang **theo order-item** (DELIVERED + PAID) chưa có review, thay vì theo `(user, product)`.
    - `listMyReviewHistory`: giữ hiển thị lịch sử review theo thời gian (đáp ứng nhu cầu xem lại nhiều lần mua).
  - **Lý do:**
    - Fix case: user đã review lần mua trước nhưng lần mua sau vẫn cần xuất hiện trong “Chưa đánh giá”.

- **FE/src/client/features/catalog/pages/ProductDetailPage.jsx**
  - **Thay đổi gì:**
    - Sau khi submit review, FE gọi lại `/review-eligibility` để cập nhật `canReview` theo Hybrid (nếu user còn order-item eligible thì vẫn được review tiếp).
    - Memoize hàm refresh eligibility bằng `useCallback` để tránh warning `react-hooks/exhaustive-deps`.
  - **Lý do:**
    - Tránh UX sai kiểu “đã review là khóa vĩnh viễn”, trong khi Hybrid cho phép review lại theo lần mua.

### Ghi chú vận hành

- Prisma Client đã được regenerate để nhận thay đổi schema (`npx prisma generate`).
- Nếu gặp lỗi `EPERM` trên Windows khi generate: dừng BE đang chạy rồi generate lại.

---

## 2026-04-25 — Review UX nâng cấp: trạng thái thread, ảnh đánh giá, modal xóa

### Thay đổi đã thực hiện

- **BE/prisma/schema.prisma**
  - **Thay đổi gì:**
    - Thêm `ReviewThreadStatus` với các trạng thái `OPEN`, `WAITING_ADMIN`, `WAITING_CUSTOMER`, `RESOLVED`.
    - Thêm metadata xử lý thread cho `Review`: `threadStatus`, `threadResolvedBy`, `threadResolvedAt`.
    - Thêm quan hệ `resolver` để lưu người xử lý thread.
    - Thêm quan hệ `images` cho `Review` để gắn ảnh đánh giá.
  - **Lý do:**
    - Team cần theo dõi rõ vòng đời xử lý review.
    - Review cần lưu ảnh đính kèm để hiển thị đầy đủ trên UI.

- **BE/prisma/migrations/20260425183000_review_thread_status_tracking/migration.sql**
  - **Thay đổi gì:**
    - Tạo cột trạng thái thread, người xử lý, thời điểm xử lý.
    - Backfill trạng thái dựa trên dữ liệu review/reply hiện có.
    - Tạo index và FK cho metadata thread.
  - **Lý do:**
    - Đồng bộ dữ liệu cũ sang mô hình thread mới mà không mất lịch sử.

- **BE/prisma/migrations/20260425190000_review_images/migration.sql**
  - **Thay đổi gì:**
    - Tạo bảng `Review_Images` để lưu ảnh review.
    - Thêm FK và index theo review.
  - **Lý do:**
    - Cho phép khách đính kèm nhiều ảnh cho một đánh giá.

- **BE/src/api/routes/product.routes.js**
  - **Thay đổi gì:**
    - Nhận upload ảnh review qua multipart form-data (`images`).
    - Cho phép tối đa 6 ảnh, lưu vào `uploads/reviews`.
    - Parse `rating` bằng `z.coerce.number()` để hỗ trợ form-data.
  - **Lý do:**
    - FE có thể gửi ảnh đánh giá cùng lúc với text review.

- **BE/src/services/product.service.js**
  - **Thay đổi gì:**
    - Lưu ảnh review vào `ReviewImage` khi tạo review.
    - Trả `images` trong payload review public.
  - **Lý do:**
    - Để trang sản phẩm và lịch sử review hiển thị ảnh đính kèm.

- **BE/src/services/admin.service.js**
  - **Thay đổi gì:**
    - Trả thêm `threadStatus`, `threadResolvedAt`, `resolver`, `images` trong payload review admin.
    - Thêm service `resolveReviewThreadByAdmin` để đánh dấu / mở lại review thread.
    - Khi admin reply, tự chuyển trạng thái sang `WAITING_CUSTOMER`.
  - **Lý do:**
    - Admin có thể xử lý rõ review nào đang chờ khách, đang chờ admin, hoặc đã resolved.

- **BE/src/api/routes/admin.routes.js**
  - **Thay đổi gì:**
    - Thêm endpoint `PATCH /api/admin/reviews/:reviewId/resolve`.
  - **Lý do:**
    - FE có API chính thức để gắn nhãn đã xử lý / mở lại.

- **BE/src/services/auth.service.js**
  - **Thay đổi gì:**
    - Khi khách reply lại review đã resolved, tự chuyển thread sang `WAITING_ADMIN`.
    - Bỏ `threadResolvedBy/threadResolvedAt` khi reopen.
  - **Lý do:**
    - Đúng nghiệp vụ: khách phản hồi lại thì thread phải quay về trạng thái chờ admin.

- **FE/src/client/features/admin/pages/AdminPage.jsx**
  - **Thay đổi gì:**
    - Thêm nút `Đánh dấu đã xử lý` / `Mở lại hội thoại`.
    - Hiển thị trạng thái thread và người xử lý trong detail panel.
    - Hiển thị ảnh review ở panel kiểm duyệt.
    - Thay prompt xóa đánh giá bằng modal UI có textarea nhập lý do.
  - **Lý do:**
    - Tối ưu UX admin, tránh prompt browser và giúp kiểm duyệt đủ ngữ cảnh.

- **FE/src/client/features/catalog/pages/ProductDetailPage.jsx**
  - **Thay đổi gì:**
    - Thêm chọn nhiều ảnh, preview ảnh trước khi gửi review.
    - Submit review bằng `FormData` thay vì JSON thuần.
    - Render ảnh review ở lịch sử đánh giá.
  - **Lý do:**
    - Người dùng có thể chứng minh vấn đề bằng ảnh ngay khi đánh giá.

- **FE/src/client/features/profile/pages/ProfilePage.jsx**
  - **Thay đổi gì:**
    - Render ảnh đánh giá trong phần lịch sử đánh giá cá nhân.
  - **Lý do:**
    - Người dùng xem lại đầy đủ review của mình, gồm cả ảnh đã gửi.

### Ghi chú vận hành

- Đã sync Prisma schema bằng `db push` và regenerate Prisma Client.
- Nếu chạy trên Windows và gặp `EPERM` khi generate, cần dừng tiến trình Node trước rồi generate lại.
