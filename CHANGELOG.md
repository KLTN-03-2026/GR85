# Changelog

Tài liệu này ghi lại các thay đổi theo từng lần cập nhật.
Mục mới nhất luôn được thêm ở cuối file.

---

## 2026-05-04 — Sửa lỗi Prisma Schema & Proxy ảnh đánh giá

### Vấn đề gặp phải
- Khách hàng tạo đánh giá với ảnh bị lỗi: `Unknown argument 'isApproved'` từ Prisma
- Ảnh đánh giá không hiển thị được trên product detail và admin panel vì thiếu proxy `/uploads`

### Thay đổi đã thực hiện

- **BE/prisma/migrations/20260504000000_review_image_moderation/**
  - **Thay đổi gì:** Tạo migration để thêm 4 cột vào bảng `Review_Images`:
    - `is_approved` (BOOLEAN DEFAULT FALSE)
    - `moderated_by` (INTEGER NULL)
    - `moderated_at` (DATETIME NULL)
    - `rejection_reason` (TEXT NULL)
  - **Lý do:** Lưu trữ thông tin duyệt ảnh từ admin

- **BE/prisma/schema.prisma**
  - **Thay đổi gì:** Cập nhật model `ReviewImage` thêm 4 trường mới cho moderation
  - **Lý do:** Đồng bộ schema Prisma với database

- **BE/src/services/product.service.js**
  - **Thay đổi gì:**
    - `createProductReviewBySlug`: Tạo review image với `isApproved: false` (chờ duyệt)
    - `listProductReviewsBySlug`: Thêm trường `isApproved` vào response và chỉ hiển thị ảnh đã duyệt (`where: { isApproved: true }`)
  - **Lý do:** Đảm bảo ảnh chỉ hiển thị công khai sau khi admin duyệt

- **BE/src/services/admin.service.js**
  - **Thay đổi gì:**
    - Thêm hàm `moderateReviewImageByAdmin()`: Admin có thể duyệt/từ chối từng ảnh và ghi lý do từ chối
    - Cập nhật `mapAdminReview()`: Include thông tin duyệt ảnh trong response (isApproved, moderatedBy, moderatedAt, rejectionReason)
  - **Lý do:** Cung cấp API cho admin quản lý duyệt ảnh

- **BE/src/api/routes/admin.routes.js**
  - **Thay đổi gì:**
    - Thêm route `PATCH /admin/reviews/:reviewId/images/:imageId/moderate` 
    - Thêm schema validation `moderateReviewImageSchema`
  - **Lý do:** Cung cấp endpoint cho admin moderateImage

- **FE/src/client/features/admin/pages/AdminPage.jsx**
  - **Thay đổi gì:**
    - Thêm hàm `moderateReviewImage()`: Gọi API moderate
    - Thêm image grid trong review detail panel để hiển thị ảnh với nút "Duyệt" và "Từ chối"
    - Hiển thị trạng thái duyệt ảnh và lý do từ chối
  - **Lý do:** Admin có giao diện để duyệt ảnh

- **FE/vite.config.js**
  - **Thay đổi gì:** Thêm proxy rule cho `/uploads`:
    ```javascript
    "/uploads": {
      target: "http://localhost:3001",
      changeOrigin: true,
    }
    ```
  - **Lý do:** Frontend (port 8080) có thể truy cập static files từ backend (port 3001)

### Quy trình khắc phục

1. ✅ `npx prisma generate` - Tái tạo Prisma Client
2. ✅ `npx prisma db push` - Đồng bộ database schema
3. ✅ Khởi động lại FE & BE server

### Kết quả

✅ Ảnh đánh giá hiển thị đúng ở admin panel với nút duyệt/từ chối  
✅ Ảnh được lưu vào database với `isApproved: false` (chờ duyệt)  
✅ Admin có thể duyệt/từ chối từng ảnh riêng lẻ  
✅ Khách hàng thấy ảnh sau khi admin duyệt công khai

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

## 2026-05-04 — Ảnh sản phẩm theo từng record + sửa trắng màn hình hồ sơ

### Thay đổi đã thực hiện

- **BE/prisma/seed.js**
  - **Thay đổi gì:**
    - Khi sinh ảnh seed cho sản phẩm, `buildImageUrls()` ưu tiên `product.imageQuery` riêng của từng sản phẩm thay vì chỉ dùng tag theo category.
    - Các record `Product_Images` vì vậy sẽ bám sát từng sản phẩm cụ thể hơn, không còn dùng chung một bộ ảnh đại diện cho cả nhóm category.
  - **Lý do:**
    - Đảm bảo sản phẩm nào hiển thị đúng ảnh của sản phẩm đó khi seed lại hoặc cập nhật dữ liệu ảnh.

- **FE/src/client/features/profile/pages/ProfilePage.jsx**
  - **Thay đổi gì:**
    - Xóa state khai báo trùng `showPendingOrders`.
  - **Lý do:**
    - Fix lỗi parse khiến màn hình trắng khi FE khởi động.

## 2026-05-04 — Đồng bộ phản hồi review + hiển thị review công khai

### Thay đổi đã thực hiện

- **BE/src/api/routes/admin.routes.js**
  - **Thay đổi gì:**
    - Chuyển luồng phản hồi review admin sang service admin để dùng đúng nghiệp vụ quản trị.
    - Hỗ trợ đồng thời route `POST /reviews/:reviewId/replies` và `PATCH /reviews/:reviewId/reply` để FE cũ/mới đều dùng được.
  - **Lý do:**
    - Tránh lệch contract giữa FE và BE, đảm bảo admin lưu phản hồi thành công.

- **BE/src/services/admin.service.js**
  - **Thay đổi gì:**
    - `replyReviewByAdmin()` nhận cả `reply` và `message` trong payload.
  - **Lý do:**
    - Tương thích với cả FE hiện tại và contract mới đã chuẩn hóa.

- **BE/src/services/product.service.js**
  - **Thay đổi gì:**
    - Bỏ lọc review public theo `ReviewStatus` không còn khớp schema.
    - Trạng thái public được suy ra từ `isHidden` thay vì field trạng thái không tồn tại.
    - Luồng ẩn/xóa review admin chuyển sang dùng `isHidden`/`hiddenReason` và xóa mềm/cứng theo action.
  - **Lý do:**
    - Đảm bảo review khách gửi xong được hiển thị đúng, đồng thời không còn lỗi runtime do tham chiếu trạng thái sai schema.

- **FE/src/client/features/admin/pages/AdminPage.jsx**
  - **Thay đổi gì:**
    - Gửi phản hồi review bằng payload `message` đến route `/reviews/:reviewId/replies`.
  - **Lý do:**
    - Đồng bộ FE với contract admin review đã chuẩn hóa.
