# 🛍️ GR85 - Nền Tảng Thương Mại Điện Tử Toàn Diện

<div align="center">

**Một giải pháp e-commerce hiện đại, mạnh mẽ và đầy đủ tính năng**

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18+-blue.svg)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4+-yellow.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-Latest-purple.svg)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-5.7+-orange.svg)](https://www.mysql.com/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

[Tài liệu](#-công-nghệ-sử-dụng) • [Cài đặt](#-hướng-dẫn-cài-đặt) • [API](#-api-documentation) • [Tính năng](#-tính-năng)

</div>

---

## 📋 Mục lục

- [Giới thiệu Chi Tiết](#-giới-thiệu-chi-tiết)
- [Tính Năng Chính](#-tính-năng-chính)
- [Kiến Trúc Hệ Thống](#-kiến-trúc-hệ-thống)
- [Công Nghệ Sử Dụng](#-công-nghệ-sử-dụng)
- [Cấu Trúc Dự Án](#-cấu-trúc-dự-án)
- [Hướng Dẫn Cài Đặt](#-hướng-dẫn-cài-đặt)
- [Hướng Dẫn Chạy](#-hướng-dẫn-chạy)
- [API Documentation](#-api-documentation)
- [Hướng Dẫn Sử Dụng](#-hướng-dẫn-sử-dụng)
- [Troubleshooting](#-troubleshooting)
- [Đóng Góp](#-đóng-góp)
- [Liên Hệ](#-liên-hệ)

---

## 🎯 Giới Thiệu Chi Tiết

### Tổng Quan Dự Án

**GR85** là một nền tảng thương mại điện tử hiện đại được xây dựng với các công nghệ tiên tiến nhất của ngành. Dự án được thiết kế theo kiến trúc **microservices-ready** với separation of concerns rõ ràng giữa backend và frontend, cho phép dễ dàng mở rộng và bảo trì.

### Đối Tượng Sử Dụng

**GR85** được thiết kế cho ba đối tượng chính:

1. **Khách Hàng (End Users)**
   - Duyệt, tìm kiếm sản phẩm từ hàng ngàn danh mục
   - Mua sắm trực tuyến với trải nghiệm người dùng mượt mà
   - Thanh toán an toàn qua nhiều phương thức
   - Quản lý đơn hàng và lịch sử mua hàng

2. **Quản Trị Viên (Administrators)**
   - Quản lý toàn bộ nội dung kho hàng
   - Xử lý đơn hàng và logistics
   - Phân tích doanh số bán hàng
   - Quản lý nhân viên hỗ trợ

3. **Nhà Phát Triển (Developers)**
   - API RESTful fully documented
   - Codebase sạch sẽ và dễ mở rộng
   - Tự động hóa CI/CD ready
   - Support cho custom integrations

### Mục Tiêu Kinh Doanh

- 💰 **Tối đa hóa doanh số**: Tối ưu hóa user experience để tăng conversion rate
- 📊 **Nâng cao hiệu quả**: Tự động hóa quy trình kinh doanh
- 🎯 **Cá nhân hóa**: Sử dụng AI để đề xuất sản phẩm phù hợp
- 🛡️ **Đảm bảo an toàn**: Bảo mật dữ liệu khách hàng và giao dịch
- 📈 **Dễ dàng mở rộng**: Hỗ trợ tăng trưởng bán hàng
- 👥 **Hỗ trợ khách hàng 24/7**: Chat realtime với AI + nhân viên

---

## ✨ Tính Năng Chính

### 🛒 Tính Năng Cho Người Dùng

#### Duyệt và Tìm Kiếm Sản Phẩm
- ✅ Danh sách sản phẩm với phân trang
- ✅ Tìm kiếm toàn văn bản (Full-text search)
- ✅ Lọc theo danh mục, giá, rating, đánh giá
- ✅ Sắp xếp theo giá, mới nhất, được xem nhiều nhất
- ✅ Xem ảnh chi tiết sản phẩm (zoom, carousel)
- ✅ Xem đánh giá và bình luận từ khách hàng khác

#### Giỏ Hàng và Thanh Toán
- ✅ Thêm/xóa/cập nhật sản phẩm trong giỏ hàng
- ✅ Cập nhật số lượng sản phẩm theo thời gian thực
- ✅ Lưu giỏ hàng (cart persistence)
- ✅ Áp dụng mã giảm giá/voucher
- ✅ Tính toán tự động thuế và phí vận chuyển
- ✅ Hỗ trợ nhiều phương thức thanh toán:
  - VNPay (thẻ tín dụng, ngân hàng)
  - Ví điện tử
  - Thanh toán khi nhận hàng (COD)

#### Quản Lý Tài Khoản
- ✅ Đăng ký tài khoản với xác thực email
- ✅ Đăng nhập an toàn với JWT tokens
- ✅ Quên mật khẩu và đặt lại mật khẩu
- ✅ Cập nhật thông tin cá nhân
- ✅ Quản lý địa chỉ giao hàng (thêm/xóa/chỉnh sửa)
- ✅ Xem lịch sử mua hàng
- ✅ Danh sách yêu thích (wishlist)
- ✅ Xem số dư ví điện tử

#### Quản Lý Đơn Hàng
- ✅ Theo dõi trạng thái đơn hàng theo thời gian thực
- ✅ Xem chi tiết đơn hàng (sản phẩm, giá, địa chỉ)
- ✅ Hủy đơn hàng nếu chưa xử lý
- ✅ Yêu cầu hoàn trả/đổi hàng
- ✅ Cung cấp lý do hoàn trả với hình ảnh
- ✅ Xem các đơn hàng trả hàng đã gửi

#### Gợi Ý Sản Phẩm Thông Minh (AI)
- ✅ Gợi ý dựa trên lịch sử mua hàng
- ✅ Gợi ý dựa trên sản phẩm đang xem
- ✅ "Người dùng khác cũng mua" recommendations
- ✅ Gợi ý sản phẩm mùa này
- ✅ Flash sale recommendations

#### Hỗ Trợ Khách Hàng
- ✅ Chat realtime với tư vấn viên AI
- ✅ Chuyển tiếp sang nhân viên hỗ trợ
- ✅ Lịch sử trò chuyện
- ✅ FAQ tìm kiếm nhanh
- ✅ Ticket hỗ trợ có tracking

### 👨‍💼 Tính Năng Cho Quản Trị Viên

#### Quản Lý Sản Phẩm
- ✅ Tạo/cập nhật/xóa sản phẩm
- ✅ Quản lý kho hàng (stock tracking)
- ✅ Tải ảnh sản phẩm (multiple images)
- ✅ Quản lý biến thể sản phẩm (size, màu, v.v.)
- ✅ Đặt giá và giá khuyến mãi
- ✅ Batch import/export sản phẩm (CSV/Excel)
- ✅ SEO optimization fields

#### Quản Lý Danh Mục
- ✅ Tạo/cập nhật/xóa danh mục
- ✅ Danh mục con (subcategories)
- ✅ Sắp xếp vị trí danh mục
- ✅ Ẩn/hiện danh mục

#### Quản Lý Đơn Hàng
- ✅ Xem danh sách tất cả đơn hàng
- ✅ Lọc theo trạng thái, ngày tháng, khách hàng
- ✅ Cập nhật trạng thái đơn hàng
- ✅ Tạo ghi chú nội bộ cho đơn hàng
- ✅ In đơn hàng/hoá đơn
- ✅ Xuất báo cáo đơn hàng

#### Quản Lý Người Dùng
- ✅ Xem danh sách tất cả người dùng
- ✅ Xem chi tiết tài khoản người dùng
- ✅ Vô hiệu hóa/kích hoạt tài khoản
- ✅ Xem lịch sử giao dịch
- ✅ Gửi thông báo/email cho người dùng

#### Quản Lý Khuyến Mãi
- ✅ Tạo mã giảm giá (coupons)
- ✅ Tạo flash sale
- ✅ Thiết lập giá sốc (deal of the day)
- ✅ Quản lý thời gian khuyến mãi
- ✅ Theo dõi hiệu quả khuyến mãi

#### Thống Kê và Báo Cáo
- ✅ Dashboard với KPI chính:
  - Doanh số hôm nay/tháng/năm
  - Số đơn hàng
  - Số khách hàng mới
  - Tỷ lệ chuyển đổi (conversion rate)
- ✅ Biểu đồ doanh số theo thời gian
- ✅ Sản phẩm bán chạy nhất
- ✅ Sản phẩm bán chậm nhất
- ✅ Phân tích khách hàng (RFM Analysis)
- ✅ Xuất báo cáo (PDF, Excel)

#### Quản Lý Vận Chuyển
- ✅ Tích hợp với các đơn vị vận chuyển
- ✅ Tính phí vận chuyển tự động
- ✅ Theo dõi vận chuyển
- ✅ Quản lý địa chỉ kho hàng

#### Quản Lý Hoàn Trả
- ✅ Xem yêu cầu hoàn trả
- ✅ Phê duyệt/từ chối hoàn trả
- ✅ Xử lý hoàn tiền
- ✅ Theo dõi hàng hoàn trả

### 🔐 Tính Năng Bảo Mật

- ✅ Xác thực JWT token
- ✅ Refresh token mechanism
- ✅ Password hashing (bcrypt)
- ✅ HTTPS/SSL support
- ✅ CORS configuration
- ✅ SQL injection prevention (Prisma ORM)
- ✅ XSS protection
- ✅ Rate limiting
- ✅ Input validation
- ✅ Role-based access control (RBAC)

---

## 🏗️ Kiến Trúc Hệ Thống

### Sơ Đồ Kiến Trúc Tổng Quan

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                   │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐    │
│  │ Components   │  │ Contexts     │  │ Custom Hooks    │    │
│  │ - Pages      │  │ - AuthContext│  │ - useCart       │    │
│  │ - UI         │  │ - CartCtx    │  │ - useProducts   │    │
│  │ - Modals     │  │ - ChatCtx    │  │ - useAuth       │    │
│  └──────────────┘  └──────────────┘  └─────────────────┘    │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Client Layer (Axios HTTP Client)                   │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────┬───────────────────────────────────────┘
                       │ HTTPS REST API
┌──────────────────────┴───────────────────────────────────────┐
│                    BACKEND (Express.js)                      │
│  ┌──────────────────────────────────────────────────────┐    │
│  │ API Routes Layer                                     │    │
│  │ - /auth, /products, /cart, /orders, /admin          │    │
│  └──────┬───────────────────────────────────────────────┘    │
│  ┌──────┴───────────────────────────────────────────────┐    │
│  │ Middleware & Controllers Layer                       │    │
│  │ - Authentication (JWT)                              │    │
│  │ - Authorization (RBAC)                              │    │
│  │ - Error Handling                                    │    │
│  │ - Validation                                        │    │
│  └──────┬───────────────────────────────────────────────┘    │
│  ┌──────┴───────────────────────────────────────────────┐    │
│  │ Services Layer (Business Logic)                      │    │
│  │ - ProductService    - OrderService                  │    │
│  │ - CartService       - AuthService                   │    │
│  │ - PaymentService    - ChatService                   │    │
│  │ - AIAdvisorService  - NotificationService           │    │
│  └──────┬───────────────────────────────────────────────┘    │
│  ┌──────┴───────────────────────────────────────────────┐    │
│  │ Repository/Data Access Layer                        │    │
│  │ - Prisma ORM                                        │    │
│  └──────┬───────────────────────────────────────────────┘    │
└──────────────────────┬───────────────────────────────────────┘
                       │ SQL Queries
┌──────────────────────┴────────────────────┬──────────────────┐
│         DATABASE (MySQL)                  │  External APIs   │
│  ┌──────────────────────────────────┐    │  ┌────────────┐   │
│  │ - Users                          │    │  │ VNPay      │   │
│  │ - Products                       │    │  │ OpenAI     │   │
│  │ - Orders                         │    │  │ SePay      │   │
│  │ - CartItems                      │    │  │ Shipping   │   │
│  │ - Reviews                        │    │  │ Email      │   │
│  │ - Payments                       │    │  └────────────┘   │
│  │ - Chats                          │    │                   │
│  │ - Notifications                  │    │                   │
│  └──────────────────────────────────┘    │                   │
└─────────────────────────────────────────────────────────────┘
```

### Quy Trình Luồng Dữ Liệu

**Ví dụ: Quy Trình Đặt Hàng**

1. **Frontend**: Người dùng nhấn "Thanh toán" trong giỏ hàng
2. **API Request**: Gửi POST request đến `/api/orders` với danh sách sản phẩm
3. **Middleware**: JWT token validation, user authentication
4. **Controller**: Parse request, gọi OrderService
5. **Service**: 
   - Validate dữ liệu đơn hàng
   - Kiểm tra stock sản phẩm
   - Tính toán giá, thuế, phí vận chuyển
   - Tạo ghi chép đơn hàng trong database
   - Gọi PaymentService
6. **Payment Service**: 
   - Gửi request thanh toán đến VNPay
   - Nhận kết quả thanh toán
   - Cập nhật trạng thái thanh toán
7. **Notification Service**: Gửi email xác nhận
8. **Response**: Trả lại thông tin đơn hàng cho frontend
9. **Frontend**: Hiển thị thông báo thành công

---

## 🛠️ Công Nghệ Sử Dụng

### Backend Stack

| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| **Node.js** | v18+ | JavaScript Runtime |
| **Express.js** | v4+ | Web Framework |
| **MySQL** | v5.7+ | Database |
| **Prisma** | Latest | ORM & Database Migration |
| **JWT** | - | Authentication |
| **Bcrypt** | - | Password Hashing |
| **Nodemailer** | - | Email Service |
| **Socket.io** | Latest | Real-time Chat |
| **Axios** | - | HTTP Client |
| **Dotenv** | - | Environment Variables |
| **CORS** | - | Cross-Origin Request |
| **Helmet** | - | Security Headers |
| **Express-validator** | - | Input Validation |

### Frontend Stack

| Công Nghệ | Phiên Bản | Mục Đích |
|-----------|----------|---------|
| **React** | v18+ | UI Framework |
| **Vite** | Latest | Build Tool & Dev Server |
| **Tailwind CSS** | v3+ | Styling |
| **shadcn/ui** | Latest | Component Library |
| **Axios** | - | HTTP Client |
| **Context API** | - | State Management |
| **React Router** | v6+ | Routing |
| **Socket.io-client** | Latest | Real-time Chat Client |
| **Vitest** | Latest | Testing Framework |
| **ESLint** | - | Code Linting |
| **Prettier** | - | Code Formatting |

### External Services

| Dịch Vụ | Mục Đích | Tính Năng |
|--------|---------|---------|
| **VNPay** | Cổng thanh toán | Thanh toán thẻ/ngân hàng |
| **OpenAI** | AI Chatbot | Gợi ý sản phẩm, hỗ trợ khách hàng |
| **SePay** | Thanh toán | API chuyển tiền |
| **Nodemailer** | Email | Gửi email xác nhận đơn hàng |
| **Twilio/SMS** | Thông báo | SMS update trạng thái |
| **Shipping API** | Logistics | Tính phí vận chuyển, tracking |

## 📁 Cấu Trúc Dự Án

```
GR85/                                       # Root folder
├── BE/                                    # Backend (Express.js)
│   ├── src/
│   │   ├── index.js                       # Entry point
│   │   ├── app.js                         # Express app initialization
│   │   ├── api/
│   │   │   ├── routes/                    # API routes
│   │   │   │   ├── auth.routes.js         # Authentication
│   │   │   │   ├── products.routes.js     # Products CRUD
│   │   │   │   ├── cart.routes.js         # Cart management
│   │   │   │   ├── orders.routes.js       # Orders
│   │   │   │   ├── users.routes.js        # User profiles
│   │   │   │   ├── admin.routes.js        # Admin dashboard
│   │   │   │   ├── chat.routes.js         # Chat messages
│   │   │   │   ├── payments.routes.js     # Payment processing
│   │   │   │   ├── reviews.routes.js      # Product reviews
│   │   │   │   └── notifications.routes.js
│   │   │   └── controllers/               # Route handlers
│   │   │       ├── authController.js
│   │   │       ├── productController.js
│   │   │       ├── cartController.js
│   │   │       ├── orderController.js
│   │   │       ├── adminController.js
│   │   │       └── ...
│   │   ├── services/                      # Business logic
│   │   │   ├── auth.service.js            # Auth logic
│   │   │   ├── product.service.js         # Product management
│   │   │   ├── cart.service.js            # Cart operations
│   │   │   ├── order.service.js           # Order processing
│   │   │   ├── payment.service.js         # Payment processing
│   │   │   ├── ai.service.js              # OpenAI integration
│   │   │   ├── ai-advisor.service.js      # AI product advisor
│   │   │   ├── chat.service.js            # Chat logic
│   │   │   ├── email.service.js           # Email sending
│   │   │   ├── notification.service.js    # Notifications
│   │   │   ├── shipping.service.js        # Shipping integration
│   │   │   ├── vnpay.service.js           # VNPay integration
│   │   │   ├── wallet.service.js          # E-wallet
│   │   │   ├── report.service.js          # Reporting & analytics
│   │   │   ├── category-admin.service.js  # Category management
│   │   │   └── ...
│   │   ├── repositories/                  # Data access layer
│   │   │   ├── chat.repository.js
│   │   │   ├── order-sync.repository.js
│   │   │   ├── ai-advisor.repository.js
│   │   │   └── ...
│   │   ├── middleware/                    # Custom middleware
│   │   │   ├── auth.js                    # JWT verification
│   │   │   ├── errorHandler.js            # Error handling
│   │   │   ├── validation.js              # Input validation
│   │   │   ├── rateLimit.js               # Rate limiting
│   │   │   └── ...
│   │   ├── config/                        # Configuration
│   │   │   ├── env.js                     # Environment setup
│   │   │   ├── payos.config.js            # PayOS config
│   │   │   ├── database.config.js         # Database config
│   │   │   └── ...
│   │   ├── db/
│   │   │   └── prisma.js                  # Prisma client
│   │   ├── realtime/
│   │   │   └── chat.socket.js             # Socket.io setup
│   │   ├── utils/                         # Utility functions
│   │   │   ├── serialize.js
│   │   │   ├── validation.js
│   │   │   ├── helpers.js
│   │   │   ├── jwt.js                     # JWT utilities
│   │   │   └── ...
│   │   └── uploads/
│   │       └── reviews/                   # User-uploaded images
│   ├── prisma/
│   │   ├── schema.prisma                  # Database schema
│   │   ├── seed.js                        # Database seeding
│   │   ├── migrations/
│   │   │   ├── migration_lock.toml
│   │   │   ├── 20260426000000_single_merged/
│   │   │   ├── 20260427000000_category_management/
│   │   │   ├── 20260501041100_add_return_request_bank_info/
│   │   │   ├── 20260503075017_add_bank_accounts/
│   │   │   └── 20260504000000_review_image_moderation/
│   │   └── README.md
│   ├── scripts/
│   │   ├── fix-reviews-schema.sql         # SQL scripts
│   │   ├── prisma-smoke.mjs               # Smoke tests
│   │   ├── seed-test-orders.mjs           # Test data generator
│   │   ├── check-images.mjs               # Image validation
│   │   ├── check-product-reviews.mjs      # Review validation
│   │   └── ...
│   ├── package.json
│   ├── .env.example                       # Environment variables template
│   └── .gitignore
│
├── FE/                                    # Frontend (React + Vite)
│   ├── src/
│   │   ├── main.jsx                       # Entry point
│   │   ├── App.jsx                        # Root component
│   │   ├── index.css                      # Global styles
│   │   ├── components/
│   │   │   ├── Navbar.jsx                 # Navigation
│   │   │   ├── ComponentCard.jsx          # Product cards
│   │   │   ├── FloatingChatWidget.jsx     # Chat widget
│   │   │   ├── ReturnRequestModal.jsx     # Return modal
│   │   │   ├── PaymentQRModal.jsx         # Payment QR
│   │   │   ├── ComponentDetailModal.jsx   # Product details
│   │   │   ├── NotificationBell.jsx       # Notifications
│   │   │   ├── HeroSection.jsx            # Hero banner
│   │   │   ├── component-card/            # Sub-component folder
│   │   │   ├── component-detail/
│   │   │   ├── floating-chat/
│   │   │   ├── hero/
│   │   │   ├── navbar/
│   │   │   ├── notification-bell/
│   │   │   └── ui/                        # shadcn/ui components
│   │   │       ├── button/
│   │   │       ├── input/
│   │   │       ├── modal/
│   │   │       └── ...
│   │   ├── contexts/                      # Context providers
│   │   │   ├── AuthContext.jsx            # Authentication state
│   │   │   ├── CartContext.jsx            # Shopping cart state
│   │   │   ├── BuildContext.jsx           # Theme/UI state
│   │   │   ├── NotificationContext.jsx    # Notifications
│   │   │   └── ...
│   │   ├── hooks/                         # Custom React hooks
│   │   │   ├── useAuth.js
│   │   │   ├── useCart.js
│   │   │   ├── useProducts.js
│   │   │   ├── useFetch.js
│   │   │   └── ...
│   │   ├── client/
│   │   │   ├── app/
│   │   │   │   ├── routers.jsx            # Route definitions
│   │   │   │   ├── providers.jsx          # Provider setup
│   │   │   │   └── ...
│   │   │   └── features/                  # Feature modules
│   │   │       ├── auth/                  # Auth pages
│   │   │       │   ├── login/
│   │   │       │   ├── register/
│   │   │       │   └── ...
│   │   │       ├── products/              # Products pages
│   │   │       ├── cart/                  # Cart pages
│   │   │       ├── orders/                # Order pages
│   │   │       ├── admin/                 # Admin dashboard
│   │   │       ├── chat/                  # Chat pages
│   │   │       ├── profile/               # User profile
│   │   │       └── ...
│   │   ├── lib/                           # Utilities
│   │   │   ├── api.js                     # Axios instance
│   │   │   ├── constants.js               # Constants
│   │   │   ├── helpers.js                 # Helper functions
│   │   │   ├── validators.js              # Form validators
│   │   │   └── ...
│   │   ├── assets/                        # Images, fonts, etc.
│   │   │   ├── images/
│   │   │   ├── fonts/
│   │   │   └── ...
│   │   ├── test/                          # Test files
│   │   │   ├── components.test.jsx
│   │   │   ├── hooks.test.js
│   │   │   └── ...
│   │   └── types/                         # TypeScript types (if using)
│   │       └── index.d.ts
│   ├── public/
│   │   ├── robots.txt
│   │   └── images/
│   ├── package.json
│   ├── vite.config.js                    # Vite configuration
│   ├── vitest.config.js                  # Test configuration
│   ├── tailwind.config.js                # Tailwind configuration
│   ├── postcss.config.js                 # PostCSS configuration
│   ├── eslint.config.js                  # ESLint configuration
│   ├── components.json                   # shadcn/ui config
│   ├── .env.example
│   └── .gitignore
│
├── DOCX/                                  # Documentation files
├── package.json                           # Root package.json
├── README.md                              # This file
├── CHANGELOG.md                           # Version history
├── github_commands.txt                    # Git commands reference
└── .gitignore

---

## 🚀 Hướng Dẫn Cài Đặt

### Yêu Cầu Hệ Thống

**Phần cứng tối thiểu:**
- CPU: Quad-core 2.0 GHz
- RAM: 4GB
- Storage: 2GB

**Phần mềm bắt buộc:**
- Node.js v18.0.0 hoặc cao hơn ([Download](https://nodejs.org/))
- npm v9.0.0 hoặc cao hơn (đi kèm với Node.js)
- Git v2.0 ([Download](https://git-scm.com/))
- MySQL Server v5.7+ ([Download](https://dev.mysql.com/downloads/mysql/))
- MySQL Workbench (tùy chọn, để quản lý DB)

**Kiểm tra phiên bản đã cài đặt:**
```bash
node --version      # Should be v18.0.0+
npm --version       # Should be v9.0.0+
git --version
mysql --version
```

### Bước 1: Clone Dự Án

```bash
# Sử dụng HTTPS
git clone https://github.com/yourusername/GR85.git
cd GR85

# Hoặc sử dụng SSH (nếu đã setup SSH key)
git clone git@github.com:yourusername/GR85.git
cd GR85
```

### Bước 2: Cài Đặt Dependencies

#### Backend Dependencies
```bash
cd BE
npm install
# Hoặc sử dụng yarn
yarn install
```

Các package chính sẽ được cài đặt:
- express (Web framework)
- prisma (ORM)
- jsonwebtoken (JWT)
- bcryptjs (Password hashing)
- nodemailer (Email)
- axios (HTTP client)
- socket.io (Real-time chat)
- dotenv (Environment variables)

#### Frontend Dependencies
```bash
cd ../FE
npm install
# Hoặc sử dụng yarn
yarn install
```

Các package chính:
- react, react-dom
- vite (Build tool)
- tailwindcss (Styling)
- @radix-ui/react-slot (UI primitives)
- axios (HTTP client)
- socket.io-client (Chat client)
- vitest (Testing)

### Bước 3: Cấu Hình Biến Môi Trường

#### Backend Configuration (.env)

```bash
cd BE
cp .env.example .env
```

Chỉnh sửa file `.env`:

```env
# ==========================================
# DATABASE CONFIGURATION
# ==========================================
DATABASE_URL="mysql://username:password@localhost:3306/gr85_db"
# Ví dụ:
# DATABASE_URL="mysql://root:password123@localhost:3306/gr85"

# ==========================================
# SERVER CONFIGURATION
# ==========================================
PORT=5000
NODE_ENV=development
# development, production, test

# ==========================================
# JWT CONFIGURATION
# ==========================================
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=your_super_secret_refresh_key_32_chars_long
JWT_REFRESH_EXPIRES_IN=30d

# ==========================================
# EMAIL SERVICE (Gmail)
# ==========================================
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
# Lấy app password: https://myaccount.google.com/apppasswords

EMAIL_FROM_NAME=GR85 Notifications
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

# ==========================================
# PAYMENT GATEWAY - VNPAY
# ==========================================
VNPAY_TMNCODE=your_merchant_code
VNPAY_HASHSECRET=your_hash_secret_key
VNPAY_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
VNPAY_RETURN_URL=http://localhost:3000/payment/callback

# ==========================================
# PAYMENT GATEWAY - SEPAY
# ==========================================
SEPAY_API_KEY=your_sepay_api_key
SEPAY_API_SECRET=your_sepay_secret

# ==========================================
# AI SERVICE - OPENAI
# ==========================================
OPENAI_API_KEY=sk-your_openai_key_here
OPENAI_MODEL=gpt-3.5-turbo
OPENAI_MAX_TOKENS=500

# ==========================================
# EXTERNAL API CONFIGURATIONS
# ==========================================
SHIPPING_API_KEY=your_shipping_provider_key
SHIPPING_API_URL=https://api.shippingprovider.com

# ==========================================
# UPLOAD CONFIGURATION
# ==========================================
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760  # 10MB in bytes
ALLOWED_FORMATS=jpg,jpeg,png,gif

# ==========================================
# LOGGING
# ==========================================
LOG_LEVEL=debug
LOG_FILE=./logs/app.log

# ==========================================
# CORS CONFIGURATION
# ==========================================
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```

#### Frontend Configuration (.env)

```bash
cd ../FE
cp .env.example .env
```

Chỉnh sửa file `.env`:

```env
# ==========================================
# API CONFIGURATION
# ==========================================
VITE_API_BASE_URL=http://localhost:5000
# Production: https://api.gr85.com

# ==========================================
# APP CONFIGURATION
# ==========================================
VITE_APP_NAME=GR85
VITE_APP_DESCRIPTION=Modern E-commerce Platform
VITE_APP_VERSION=1.0.0

# ==========================================
# SOCKET.IO CONFIGURATION
# ==========================================
VITE_SOCKET_URL=http://localhost:5000
# Production: https://api.gr85.com

# ==========================================
# EXTERNAL SERVICES
# ==========================================
VITE_GOOGLE_ANALYTICS_ID=your_ga_id
VITE_SENTRY_DSN=your_sentry_dsn  # Error tracking

# ==========================================
# FEATURE FLAGS
# ==========================================
VITE_ENABLE_AI_ADVISOR=true
VITE_ENABLE_CHAT=true
VITE_ENABLE_LIVE_CHAT=true
```

### Bước 4: Khởi Tạo Database

#### Tạo Database MySQL

```bash
# Đăng nhập MySQL
mysql -u root -p

# Tạo database
CREATE DATABASE gr85_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE gr85_test CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Xem danh sách database
SHOW DATABASES;

# Thoát
EXIT;
```

#### Chạy Prisma Migrations

```bash
cd BE

# Tạo các bảng từ schema.prisma
npx prisma migrate dev --name init

# Xem trạng thái migrations
npx prisma migrate status

# Tạo Prisma Client
npx prisma generate
```

#### Seed Database (Dữ Liệu Test)

```bash
# Chạy seed script để tạo dữ liệu test
npx prisma db seed

# Hoặc chạy seed script cụ thể
node scripts/seed-test-orders.mjs
```

Database bây giờ chứa:
- ✅ Người dùng test
- ✅ Sản phẩm mẫu
- ✅ Danh mục
- ✅ Đơn hàng test

### Bước 5: Kiểm Tra Cài Đặt

```bash
# Kiểm tra kết nối database
cd BE
node scripts/prisma-smoke.mjs

# Kiểm tra danh sách người dùng
node find_user.js

# Kiểm tra sản phẩm
node check-images.mjs
```

---

## 🎮 Hướng Dẫn Chạy

### Chế Độ Development

#### Chạy Backend Riêng Lẻ
```bash
cd BE
npm run dev
```
Backend sẽ chạy tại: **http://localhost:5000**

```
📡 Server đang lắng nghe trên port 5000
✅ Database connected
✅ Socket.io ready for real-time chat
```

#### Chạy Frontend Riêng Lẻ
```bash
cd FE
npm run dev
```
Frontend sẽ chạy tại: **http://localhost:5173**

```
📱 Frontend development server started
✅ Hot module replacement (HMR) enabled
✅ Vite dev server ready
```

#### Chạy Cả Backend và Frontend (Fullstack)

**Option 1: Từ thư mục gốc (nếu có npm task)**
```bash
npm run dev
```

**Option 2: Chạy từng cái trong terminal khác nhau**
```bash
# Terminal 1 - Backend
cd BE
npm run dev

# Terminal 2 - Frontend
cd FE
npm run dev
```

**Option 3: Sử dụng VS Code Tasks**
- Mở Command Palette: `Ctrl+Shift+P`
- Gõ "Run Task"
- Chọn "Run Fullstack"

### Chế Độ Production

#### Build Backend
```bash
cd BE
npm run build
```

#### Build Frontend
```bash
cd FE
npm run build
```

Output sẽ nằm trong `FE/dist/`

#### Chạy Production Build
```bash
# Backend
cd BE
NODE_ENV=production npm start

# Frontend (static server)
cd FE
npm install -g serve
serve -s dist -l 3000
```

### Các Script Hữu Ích

#### Backend Scripts
```bash
cd BE

# Development
npm run dev              # Start dev server with hot reload

# Build & Production
npm run build            # Build project
npm run start            # Start production server
npm run preview          # Preview production build

# Database
npx prisma studio       # Prisma GUI to manage data
npx prisma generate     # Generate Prisma Client
npx prisma migrate dev  # Run migrations
npx prisma db seed      # Seed database

# Testing & Quality
npm run test             # Run tests
npm run lint             # Run ESLint
npm run format           # Format code with Prettier

# Utilities
npm run check-images     # Verify product images
npm run check-reviews    # Verify product reviews
npm run find-user        # Find user by email
npm run list-users       # List all users
```

#### Frontend Scripts
```bash
cd FE

# Development
npm run dev              # Start dev server

# Build & Production
npm run build            # Build for production
npm run preview          # Preview production build

# Testing & Quality
npm run test             # Run tests
npm run test:ui          # Run tests with UI
npm run test:coverage    # Generate coverage report
npm run lint             # Run ESLint
npm run format           # Format code

# Code Analysis
npm run analyze          # Bundle size analysis
```

### Truy Cập Ứng Dụng

#### Tài Khoản Test (Seed Data)
```
🔑 Admin Account:
   Email: admin@gr85.com
   Password: admin123456

👤 Customer Account:
   Email: user@example.com
   Password: user123456
```

#### URLs Quan Trọng

| Dịch vụ | URL | Mô tả |
|--------|-----|-------|
| Frontend | http://localhost:5173 | Trang chủ ứng dụng |
| Backend API | http://localhost:5000 | API endpoints |
| Prisma Studio | http://localhost:5555 | Database GUI |
| Admin Dashboard | http://localhost:5173/admin | Trang quản lý |

### Troubleshooting - Sự Cố Thường Gặp

#### Port Đã Bị Sử Dụng
```bash
# Tìm process đang sử dụng port 5000 (Windows)
netstat -ano | findstr :5000

# Kill process (Windows)
taskkill /PID <PID> /F

# Hoặc thay đổi port trong .env
PORT=5001
```

#### Database Connection Error
```bash
# Kiểm tra MySQL đang chạy
mysql -u root -p

# Hoặc restart MySQL Service (Windows)
net start MySQL80

# Kiểm tra DATABASE_URL trong .env
DATABASE_URL="mysql://root:password@localhost:3306/gr85_db"
```

#### Dependencies Issues
```bash
# Clear npm cache
npm cache clean --force

# Xóa node_modules và cài lại
rm -rf node_modules package-lock.json
npm install
```

#### Port 3000 or 5173 Already in Use
```bash
# Tìm process
lsof -i :5173  # macOS/Linux
netstat -ano | findstr :5173  # Windows

# Kill process
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows
```

---

## 📡 API Documentation

### Base URL
```
Development: http://localhost:5000
Production: https://api.gr85.com
```

### Authentication

Tất cả API endpoints (trừ auth) yêu cầu JWT token trong header:

```bash
Authorization: Bearer <your_jwt_token>
```

### Response Format

Tất cả API responses:
```json
{
  "status": "success",  // or "error"
  "data": { /* response data */ },
  "message": "Optional message",
  "timestamp": "2026-05-09T10:30:00Z"
}
```

### Auth Routes

#### Đăng Ký
```http
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}

Response:
{
  "status": "success",
  "data": {
    "user": {
      "id": "user_123",
      "email": "john@example.com",
      "name": "John Doe"
    },
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi..."
  }
}
```

#### Đăng Nhập
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}

Response:
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOi...",
    "refreshToken": "eyJhbGciOi...",
    "user": { /* user data */ }
  }
}
```

#### Đăng Xuất
```http
POST /api/auth/logout
Authorization: Bearer <token>

Response:
{
  "status": "success",
  "message": "Logged out successfully"
}
```

#### Làm Mới Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "eyJhbGciOi..."
}

Response:
{
  "status": "success",
  "data": {
    "accessToken": "eyJhbGciOi..."
  }
}
```

### Product Routes

#### Lấy Danh Sách Sản Phẩm
```http
GET /api/products?page=1&limit=10&category=electronics&sort=price

Query Parameters:
- page: Trang (default: 1)
- limit: Số items mỗi trang (default: 10)
- category: Lọc theo danh mục
- search: Tìm kiếm theo tên
- minPrice: Giá tối thiểu
- maxPrice: Giá tối đa
- sort: price, newest, popular, rating
- order: asc, desc

Response:
{
  "status": "success",
  "data": {
    "products": [
      {
        "id": "prod_123",
        "name": "Product Name",
        "description": "...",
        "price": 299.99,
        "discountPrice": 249.99,
        "images": ["url1", "url2"],
        "rating": 4.5,
        "reviews": 120,
        "stock": 50,
        "category": "electronics"
      }
    ],
    "total": 500,
    "page": 1,
    "totalPages": 50
  }
}
```

#### Lấy Chi Tiết Sản Phẩm
```http
GET /api/products/:id

Response:
{
  "status": "success",
  "data": {
    "id": "prod_123",
    "name": "Product Name",
    "description": "...",
    "price": 299.99,
    "discountPrice": 249.99,
    "images": ["url1", "url2"],
    "rating": 4.5,
    "reviews": [
      {
        "id": "review_1",
        "userId": "user_123",
        "userName": "John Doe",
        "rating": 5,
        "comment": "Great product!",
        "images": ["review_img1"],
        "createdAt": "2026-05-01T10:00:00Z"
      }
    ],
    "stock": 50,
    "category": "electronics",
    "specifications": {
      "color": ["Red", "Blue", "Black"],
      "size": ["S", "M", "L", "XL"]
    }
  }
}
```

#### Tạo Sản Phẩm (Admin)
```http
POST /api/products
Authorization: Bearer <admin_token>
Content-Type: multipart/form-data

{
  "name": "New Product",
  "description": "...",
  "price": 299.99,
  "discountPrice": 249.99,
  "stock": 100,
  "categoryId": "cat_1",
  "images": [file1, file2],  // Files
  "specifications": {
    "color": ["Red", "Blue"],
    "size": ["S", "M", "L"]
  }
}

Response: { /* created product */ }
```

#### Cập Nhật Sản Phẩm (Admin)
```http
PUT /api/products/:id
Authorization: Bearer <admin_token>

{ /* product data to update */ }
```

#### Xóa Sản Phẩm (Admin)
```http
DELETE /api/products/:id
Authorization: Bearer <admin_token>

Response:
{
  "status": "success",
  "message": "Product deleted successfully"
}
```

### Cart Routes

#### Lấy Giỏ Hàng
```http
GET /api/cart
Authorization: Bearer <token>

Response:
{
  "status": "success",
  "data": {
    "id": "cart_123",
    "items": [
      {
        "id": "item_1",
        "productId": "prod_123",
        "productName": "Product Name",
        "price": 299.99,
        "quantity": 2,
        "image": "product_image_url",
        "total": 599.98
      }
    ],
    "subtotal": 599.98,
    "tax": 59.99,
    "shippingFee": 10.00,
    "total": 669.97
  }
}
```

#### Thêm Vào Giỏ Hàng
```http
POST /api/cart/add
Authorization: Bearer <token>
Content-Type: application/json

{
  "productId": "prod_123",
  "quantity": 2,
  "variant": {
    "size": "M",
    "color": "Red"
  }
}

Response: { /* updated cart */ }
```

#### Cập Nhật Giỏ Hàng
```http
PUT /api/cart/update/:itemId
Authorization: Bearer <token>
Content-Type: application/json

{
  "quantity": 5
}

Response: { /* updated cart */ }
```

#### Xóa Khỏi Giỏ Hàng
```http
DELETE /api/cart/remove/:itemId
Authorization: Bearer <token>

Response: { /* updated cart */ }
```

### Order Routes

#### Lấy Danh Sách Đơn Hàng
```http
GET /api/orders?page=1&status=pending
Authorization: Bearer <token>

Query Parameters:
- page: Trang
- status: pending, confirmed, shipped, delivered, cancelled, returned

Response:
{
  "status": "success",
  "data": {
    "orders": [
      {
        "id": "order_123",
        "orderNumber": "GR85-001001",
        "items": [ /* order items */ ],
        "total": 669.97,
        "status": "pending",
        "createdAt": "2026-05-09T10:00:00Z",
        "updatedAt": "2026-05-09T10:30:00Z"
      }
    ],
    "total": 25,
    "page": 1
  }
}
```

#### Lấy Chi Tiết Đơn Hàng
```http
GET /api/orders/:id
Authorization: Bearer <token>

Response:
{
  "status": "success",
  "data": {
    "id": "order_123",
    "orderNumber": "GR85-001001",
    "customer": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+84912345678"
    },
    "items": [
      {
        "productId": "prod_123",
        "productName": "Product Name",
        "quantity": 2,
        "price": 299.99,
        "total": 599.98
      }
    ],
    "shippingAddress": {
      "address": "123 Main Street",
      "city": "Ho Chi Minh City",
      "postalCode": "700000",
      "country": "Vietnam"
    },
    "paymentMethod": "vnpay",
    "paymentStatus": "completed",
    "subtotal": 599.98,
    "tax": 59.99,
    "shippingFee": 10.00,
    "total": 669.97,
    "status": "pending",
    "trackingNumber": "VNP123456789",
    "estimatedDelivery": "2026-05-15T00:00:00Z",
    "timeline": [
      {
        "status": "created",
        "timestamp": "2026-05-09T10:00:00Z",
        "note": "Order created"
      }
    ],
    "createdAt": "2026-05-09T10:00:00Z"
  }
}
```

#### Tạo Đơn Hàng
```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "shippingAddressId": "addr_123",
  "paymentMethod": "vnpay",  // vnpay, wallet, cod
  "couponCode": "SAVE10"  // optional
}

Response:
{
  "status": "success",
  "data": {
    "orderId": "order_123",
    "paymentUrl": "https://sandbox.vnpayment.vn/paymentv2/..."  // if vnpay
  }
}
```

#### Cập Nhật Trạng Thái Đơn Hàng (Admin)
```http
PUT /api/orders/:id/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "confirmed",  // pending -> confirmed -> shipped -> delivered
  "note": "Order confirmed"
}

Response: { /* updated order */ }
```

### Payment Routes

#### Xác Minh Thanh Toán VNPay
```http
POST /api/payments/vnpay/callback
Content-Type: application/x-www-form-urlencoded

{ /* VNPay callback data */ }

Response:
{
  "RspCode": "00",  // 00 = success
  "Message": "Thành công"
}
```

#### Kiểm Tra Trạng Thái Thanh Toán
```http
GET /api/payments/:orderId/status
Authorization: Bearer <token>

Response:
{
  "status": "success",
  "data": {
    "orderId": "order_123",
    "paymentStatus": "completed",
    "paymentMethod": "vnpay",
    "amount": 669.97,
    "transactionId": "vnp_123456789",
    "completedAt": "2026-05-09T10:05:00Z"
  }
}
```

### Chat Routes

#### Gửi Tin Nhắn
```http
POST /api/chat/messages
Authorization: Bearer <token>
Content-Type: application/json

{
  "message": "How much is shipping?",
  "type": "user"  // user, ai, support
}

Response:
{
  "status": "success",
  "data": {
    "id": "msg_123",
    "message": "How much is shipping?",
    "sender": "user",
    "timestamp": "2026-05-09T10:00:00Z",
    "read": false
  }
}
```

#### Lấy Lịch Sử Chat
```http
GET /api/chat/messages?limit=50
Authorization: Bearer <token>

Response:
{
  "status": "success",
  "data": {
    "messages": [ /* message list */ ],
    "total": 150
  }
}
```

### Admin Routes

#### Dashboard
```http
GET /api/admin/dashboard
Authorization: Bearer <admin_token>

Response:
{
  "status": "success",
  "data": {
    "stats": {
      "totalRevenue": 50000,
      "totalOrders": 250,
      "totalCustomers": 120,
      "totalProducts": 500,
      "conversionRate": 3.5,
      "averageOrderValue": 200
    },
    "recentOrders": [ /* last 10 orders */ ],
    "topProducts": [ /* top 5 products */ ],
    "salesChart": [ /* sales data */ ],
    "customerChart": [ /* customer data */ ]
  }
}
```

#### Danh Sách Người Dùng
```http
GET /api/admin/users?page=1&search=john
Authorization: Bearer <admin_token>

Response:
{
  "status": "success",
  "data": {
    "users": [ /* user list */ ],
    "total": 120,
    "page": 1
  }
}
```

### Error Responses

#### 400 - Bad Request
```json
{
  "status": "error",
  "message": "Invalid input data",
  "errors": {
    "email": "Email is required",
    "password": "Password must be at least 6 characters"
  }
}
```

#### 401 - Unauthorized
```json
{
  "status": "error",
  "message": "Authentication required"
}
```

#### 403 - Forbidden
```json
{
  "status": "error",
  "message": "Access denied"
}
```

#### 404 - Not Found
```json
{
  "status": "error",
  "message": "Resource not found"
}
```

#### 500 - Server Error
```json
{
  "status": "error",
  "message": "Internal server error",
  "error": "Error details (development only)"
}
```

## 🧪 Testing

### Frontend Testing

```bash
cd FE

# Chạy tất cả tests
npm run test

# Chạy tests với UI
npm run test:ui

# Chạy tests trong chế độ watch
npm run test:watch

# Tạo coverage report
npm run test:coverage
```

### Backend Testing

```bash
cd BE

# Chạy tất cả tests
npm run test

# Chạy tests trong chế độ watch
npm run test:watch

# Chạy tests cụ thể
npm run test -- --testNamePattern="Auth"

# Tạo coverage report
npm run test:coverage
```

### Manual Testing

#### API Testing với Postman
1. Download [Postman](https://www.postman.com/downloads/)
2. Import collection từ `BE/postman-collection.json`
3. Set environment variables:
   - `BASE_URL`: http://localhost:5000
   - `TOKEN`: Your JWT token
4. Chạy requests

#### Browser Testing
- Chrome DevTools (F12)
- Network tab: kiểm tra API calls
- Console: kiểm tra errors
- Application: kiểm tra localStorage/sessionStorage

---

## 🔍 Troubleshooting

### Database Issues

**Lỗi: "Access denied for user 'root'@'localhost'**
```bash
# Kiểm tra DATABASE_URL
cat BE/.env | grep DATABASE_URL

# Reset password MySQL
mysql -u root
ALTER USER 'root'@'localhost' IDENTIFIED BY 'your_password';
FLUSH PRIVILEGES;
```

**Lỗi: "Table doesn't exist"**
```bash
# Chạy migrations
cd BE
npx prisma migrate dev
```

**Lỗi: "Cannot find module 'prisma'"**
```bash
# Generate Prisma Client
cd BE
npx prisma generate
```

### API Issues

**CORS Error**
```
Error: Access to XMLHttpRequest from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

Giải pháp:
1. Kiểm tra `CORS_ORIGIN` trong `.env`
2. Thêm frontend URL:
```env
CORS_ORIGIN=http://localhost:5173,http://localhost:3000
```
3. Restart backend

**401 Unauthorized**
- Token đã hết hạn
- Token không hợp lệ
- Giải pháp: Đăng nhập lại

**Port Conflict**
```bash
# Windows
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :5000
kill -9 <PID>
```

### Frontend Issues

**Vite Dev Server Not Starting**
```bash
# Xóa cache
rm -rf .vite
npm run dev

# Hoặc đổi port
vite --port 3000
```

**Module Not Found**
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

**HMR Not Working**
```bash
# Restart Vite
Ctrl+C
npm run dev
```

---

## 📚 Hướng Dẫn Sử Dụng

### Cho Người Dùng Thông Thường

#### 1. Tạo Tài Khoản
1. Truy cập trang chủ
2. Nhấn "Đăng ký"
3. Điền thông tin:
   - Tên đầy đủ
   - Email
   - Mật khẩu (ít nhất 8 ký tự)
4. Xác nhận email qua liên kết gửi về

#### 2. Duyệt Sản Phẩm
1. Chọn danh mục từ menu
2. Sử dụng bộ lọc:
   - Khoảng giá
   - Sao đánh giá
   - Thương hiệu
3. Sắp xếp theo:
   - Giá (thấp đến cao / cao đến thấp)
   - Mới nhất
   - Bán chạy nhất

#### 3. Mua Hàng
1. Xem chi tiết sản phẩm
2. Chọn biến thể (màu, size, v.v.)
3. Nhập số lượng
4. Thêm vào giỏ hàng
5. Xem giỏ hàng
6. Áp dụng mã giảm giá (nếu có)
7. Chọn địa chỉ giao hàng
8. Chọn phương thức thanh toán
9. Xác nhận đơn hàng

#### 4. Theo Dõi Đơn Hàng
1. Vào "Đơn hàng của tôi"
2. Xem chi tiết từng đơn hàng:
   - Trạng thái hiện tại
   - Mã theo dõi vận chuyển
   - Thời gian giao dự kiến
3. Nhấn "Xem chi tiết" để xem sản phẩm

#### 5. Hoàn Trả Sản Phẩm
1. Trong "Đơn hàng của tôi", chọn đơn hàng
2. Nhấn "Yêu cầu hoàn trả"
3. Chọn sản phẩm cần hoàn trả
4. Chọn lý do hoàn trả
5. Tải hình ảnh minh chứng
6. Gửi yêu cầu
7. Theo dõi trạng thái hoàn trả

#### 6. Chat Hỗ Trợ
1. Nhấn biểu tượng chat ở góc phải
2. Gửi tin nhắn đến AI advisor
3. Nếu cần hỗ trợ thêm, chuyển sang nhân viên
4. Nhân viên sẽ trả lời trong vòng 2 giờ

### Cho Quản Trị Viên

#### 1. Truy Cập Admin Panel
1. Đăng nhập bằng tài khoản admin
2. Vào "Admin Dashboard"
3. URL: `http://localhost:5173/admin`

#### 2. Quản Lý Sản Phẩm
```
Bước 1: Vào "Sản phẩm"
Bước 2: Nhấn "Thêm sản phẩm mới"
Bước 3: Điền thông tin:
  - Tên sản phẩm
  - Mô tả
  - Giá gốc
  - Giá khuyến mãi (nếu có)
  - Danh mục
  - Stock
  - Hình ảnh
Bước 4: Thêm biến thể (nếu có)
Bước 5: Nhấn "Lưu"
```

#### 3. Quản Lý Đơn Hàng
```
Bước 1: Vào "Đơn hàng"
Bước 2: Xem danh sách đơn hàng
Bước 3: Nhấn vào từng đơn hàng để xem chi tiết
Bước 4: Cập nhật trạng thái:
  - Pending -> Confirmed
  - Confirmed -> Shipped
  - Shipped -> Delivered
Bước 5: Thêm ghi chú (nếu cần)
Bước 6: Cập nhật
```

#### 4. Xem Báo Cáo
```
Bước 1: Vào "Dashboard"
Bước 2: Xem các KPI chính:
  - Doanh số hôm nay/tháng/năm
  - Số đơn hàng
  - Số khách hàng mới
Bước 3: Xem biểu đồ doanh số
Bước 4: Nhấn "Xuất báo cáo" để tải PDF/Excel
```

#### 5. Quản Lý Khuyến Mãi
```
Bước 1: Vào "Khuyến mãi"
Bước 2: Tạo mã giảm giá:
  - Tên mã
  - Tỷ lệ giảm (%)
  - Số lượng tối đa
  - Ngày hết hạn
Bước 3: Tạo Flash Sale (khuyến mãi giới hạn thời gian)
```

---

## 🤝 Đóng Góp

### Quy Trình Đóng Góp

1. **Fork Repository**
   ```bash
   Click "Fork" on GitHub
   ```

2. **Clone Your Fork**
   ```bash
   git clone https://github.com/YOUR_USERNAME/GR85.git
   cd GR85
   ```

3. **Create Feature Branch**
   ```bash
   git checkout -b feature/amazing-feature
   git checkout -b fix/bug-fix
   ```

4. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: Add amazing feature"
   # Commit message format:
   # feat: Thêm tính năng mới
   # fix: Sửa lỗi
   # docs: Cập nhật tài liệu
   # style: Thay đổi style
   # refactor: Tái cấu trúc code
   # test: Thêm tests
   # chore: Maintenance tasks
   ```

5. **Push to GitHub**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **Create Pull Request**
   - Mô tả rõ ràng những thay đổi
   - Link đến issue nếu có
   - Chụp ảnh/video nếu thay đổi UI

### Code Standards

- Use ESLint (chạy `npm run lint` trước commit)
- Format code với Prettier
- Write meaningful commit messages
- Add tests cho new features
- Update documentation

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>

Example:
feat(auth): Add two-factor authentication

Implement TOTP-based 2FA for user accounts
with backup codes for recovery.

Fixes #123
```

---

## 📞 Liên Hệ

### Support Channels

- **Email**: support@gr85.com
- **Chat**: https://gr85.com/chat
- **GitHub Issues**: [Report Bug](../../issues/new?labels=bug)
- **Discussions**: [Ask Question](../../discussions/new)

### Social Media

- Facebook: [@GR85Official](https://facebook.com/GR85Official)
- Twitter: [@GR85App](https://twitter.com/GR85App)
- LinkedIn: [GR85 Company](https://linkedin.com/company/gr85)

### Business Inquiries

- **Email**: business@gr85.com
- **Phone**: +84 (0)28 1234 5678
- **Office**: 123 Tech Street, Ho Chi Minh City, Vietnam

---

## 📄 License

Dự án này được cấp phép dưới giấy phép **MIT**. Xem file [LICENSE](LICENSE) để biết thêm chi tiết.

### MIT License Summary

✅ Sử dụng thương mại
✅ Sửa đổi
✅ Phân phối
✅ Sử dụng riêng tư

❌ Cần giữ lại thông báo bản quyền
❌ Không có bảo hành
❌ Không chịu trách nhiệm pháp lý

---

## 🙏 Cảm Ơn

Cảm ơn tất cả những người đã đóng góp cho dự án này!

**Contributors:**
- 👨‍💻 Developers
- 🎨 Designers
- 📝 Documentation
- 🐛 Bug Reporters
- 💡 Feature Suggesters

---

## 📚 Tài Nguyên Bổ Sung

- [Tài liệu Express.js](https://expressjs.com/)
- [Tài liệu React](https://react.dev/)
- [Tài liệu Prisma](https://www.prisma.io/docs/)
- [Tài liệu Tailwind CSS](https://tailwindcss.com/docs)
- [Tài liệu Vite](https://vitejs.dev/)
- [Tài liệu MySQL](https://dev.mysql.com/doc/)

---

**Made with ❤️ by the GR85 Team**

Last Updated: May 9, 2026
Version: 1.0.0
