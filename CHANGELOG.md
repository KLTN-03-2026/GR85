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

## 2026-05-04 — Cải thiện form đăng ký mật khẩu

### Thay đổi đã thực hiện

- **FE/src/client/features/auth/pages/AuthPage.jsx**
  - **Thay đổi gì:**
    - Thêm nút hiện/ẩn mật khẩu cho ô mật khẩu và ô xác nhận mật khẩu.
    - Hiển thị trạng thái khớp/không khớp ngay khi người dùng nhập mật khẩu đăng ký.
    - Áp dụng cùng hành vi cho luồng đổi mật khẩu ở màn hình đặt lại mật khẩu.
  - **Lý do:**
    - Giúp người dùng nhập mật khẩu dễ hơn và biết ngay khi hai ô mật khẩu chưa khớp.

## 2026-05-04 — Thêm thời gian chờ gửi lại OTP

### Thay đổi đã thực hiện

- **FE/src/client/features/auth/pages/AuthPage.jsx**
  - **Thay đổi gì:**
    - Thêm cooldown 90 giây cho các thao tác gửi OTP ở đăng ký, quên mật khẩu và gửi lại mã xác minh.
    - Hiển thị đếm ngược trực tiếp trên nút gửi lại mã để người dùng biết khi nào được gửi tiếp.
    - Lưu trạng thái cooldown theo email để tránh refresh trang là bỏ qua thời gian chờ.
  - **Lý do:**
    - Giảm spam gửi OTP, hạn chế gọi API liên tục và cải thiện trải nghiệm người dùng.

## 2026-05-04 — Chặn spam OTP ở backend

### Thay đổi đã thực hiện

- **BE/src/services/auth.service.js**
  - **Thay đổi gì:**
    - Thêm cooldown 90 giây theo email và IP cho các luồng gửi OTP: đăng ký, gửi lại email xác minh, quên mật khẩu.
    - Khi gọi lại quá sớm, backend trả lỗi `429` với thông báo `Vui lòng chờ X giây trước khi gửi lại mã OTP`.
    - Giữ cooldown trong bộ nhớ tiến trình để chặn các request lặp lại ngay cả khi người dùng đổi trang hoặc gọi API liên tiếp.
  - **Lý do:**
    - Chặn spam ở phía server, không chỉ dựa vào UI.

- **BE/src/api/routes/auth.routes.js**
  - **Thay đổi gì:**
    - Truyền `req.ip` vào các endpoint OTP để rate limit theo cả email và IP.
    - Ưu tiên trả về `statusCode` từ lỗi service, đồng thời đính kèm `Retry-After` cho lỗi giới hạn tần suất.
  - **Lý do:**
    - Đảm bảo response HTTP đúng chuẩn và frontend nhận được thông báo chờ rõ ràng.
