# 🛍️ GR85 - E-commerce Platform

Một nền tảng thương mại điện tử hiện đại, đầy đủ tính năng, được xây dựng với công nghệ web tiên tiến nhất.

## 📋 Mục lục

- [Giới thiệu](#giới-thiệu)
- [Tính năng](#tính-năng)
- [Công nghệ sử dụng](#công-nghệ-sử-dụng)
- [Cấu trúc dự án](#cấu-trúc-dự-án)
- [Hướng dẫn cài đặt](#hướng-dẫn-cài-đặt)
- [Hướng dẫn chạy](#hướng-dẫn-chạy)
- [API Documentation](#api-documentation)
- [Đóng góp](#đóng-góp)

## 🎯 Giới thiệu

**GR85** là một nền tảng thương mại điện tử toàn diện cung cấp các tính năng:
- Quản lý sản phẩm và danh mục
- Giỏ hàng và thanh toán
- Xác thực và quản lý tài khoản người dùng
- Hệ thống đơn hàng
- Quản lý admin
- Tích hợp AI cho gợi ý sản phẩm
- Hỗ trợ khách hàng qua chat

Dự án này được thiết kế để cung cấp trải nghiệm mua sắm mượt mà và hiệu quả cho cả người dùng và quản trị viên.

## ✨ Tính năng

### Cho người dùng
- ✅ Duyệt và tìm kiếm sản phẩm
- ✅ Quản lý giỏ hàng
- ✅ Thanh toán qua VNPay
- ✅ Tạo và quản lý đơn hàng
- ✅ Quản lý địa chỉ giao hàng
- ✅ Ví điện tử
- ✅ Gợi ý sản phẩm dựa trên AI
- ✅ Danh sách yêu thích
- ✅ Chat hỗ trợ khách hàng
- ✅ Xem lịch sử đơn hàng

### Cho quản trị viên
- ✅ Quản lý sản phẩm (tạo, cập nhật, xóa)
- ✅ Quản lý danh mục
- ✅ Quản lý đơn hàng
- ✅ Quản lý người dùng
- ✅ Quản lý khuyến mãi và flash sale
- ✅ Thống kê và báo cáo
- ✅ Quản lý vận chuyển

## 🛠️ Công nghệ sử dụng

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MySQL
- **ORM**: Prisma
- **Authentication**: JWT
- **Email Service**: Nodemailer
- **Payment Gateway**: VNPay
- **AI Integration**: OpenAI/AI services

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **State Management**: Context API
- **Component Library**: shadcn/ui
- **Testing**: Vitest
- **HTTP Client**: Axios/Fetch

## 📁 Cấu trúc dự án

```
GR85/
├── BE/                          # Backend
│   ├── src/
│   │   ├── api/
│   │   │   └── routes/          # API routes (auth, products, orders, etc.)
│   │   ├── services/            # Business logic
│   │   ├── middleware/          # Custom middleware
│   │   ├── config/              # Configuration files
│   │   ├── db/                  # Database setup
│   │   └── utils/               # Utilities
│   ├── prisma/
│   │   ├── schema.prisma        # Database schema
│   │   ├── migrations/          # Database migrations
│   │   └── seed.js              # Database seeding
│   ├── uploads/                 # Product images
│   └── package.json
│
├── FE/                          # Frontend
│   ├── src/
│   │   ├── components/          # React components
│   │   ├── contexts/            # Context providers
│   │   ├── hooks/               # Custom hooks
│   │   ├── lib/                 # Utilities
│   │   ├── client/
│   │   │   ├── app/             # App providers & router
│   │   │   └── features/        # Feature modules (auth, cart, etc.)
│   │   ├── assets/              # Static assets
│   │   ├── test/                # Test files
│   │   └── main.jsx
│   ├── public/                  # Public files
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
└── package.json                 # Root package.json
```

## 🚀 Hướng dẫn cài đặt

### Yêu cầu
- Node.js v16 hoặc cao hơn
- npm hoặc yarn
- MySQL 5.7 hoặc cao hơn

### Bước 1: Clone dự án
```bash
git clone <repository-url>
cd GR85
```

### Bước 2: Cài đặt dependencies

#### Backend
```bash
cd BE
npm install
```

#### Frontend
```bash
cd FE
npm install
```

### Bước 3: Cấu hình môi trường

#### Backend (.env)
```env
# Database
DATABASE_URL="mysql://user:password@localhost:3306/gr85"

# JWT
JWT_SECRET=your_jwt_secret_key

# Email Service
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

# Payment Gateway
VNPAY_TMNCODE=your_tmncode
VNPAY_HASHSECRET=your_hash_secret

# AI Service
OPENAI_API_KEY=your_openai_key

# Server
PORT=5000
NODE_ENV=development
```

#### Frontend (.env)
```env
VITE_API_BASE_URL=http://localhost:5000
VITE_APP_NAME=GR85
```

### Bước 4: Khởi tạo database
```bash
cd BE
npx prisma migrate dev
npx prisma db seed
```

## 🎮 Hướng dẫn chạy

### Chạy cả Backend và Frontend
```bash
npm run dev
```

### Chạy riêng Backend
```bash
cd BE
npm run dev
```

Backend sẽ chạy tại: `http://localhost:5000`

### Chạy riêng Frontend
```bash
cd FE
npm run dev
```

Frontend sẽ chạy tại: `http://localhost:5173`

### Build cho production
```bash
# Backend
cd BE
npm run build

# Frontend
cd FE
npm run build
```

## 📡 API Documentation

### Authentication Routes
- `POST /api/auth/register` - Đăng ký
- `POST /api/auth/login` - Đăng nhập
- `POST /api/auth/logout` - Đăng xuất
- `POST /api/auth/refresh` - Làm mới token

### Product Routes
- `GET /api/products` - Lấy danh sách sản phẩm
- `GET /api/products/:id` - Lấy chi tiết sản phẩm
- `POST /api/products` - Tạo sản phẩm (Admin)
- `PUT /api/products/:id` - Cập nhật sản phẩm (Admin)
- `DELETE /api/products/:id` - Xóa sản phẩm (Admin)

### Cart Routes
- `GET /api/cart` - Lấy giỏ hàng
- `POST /api/cart/add` - Thêm vào giỏ hàng
- `PUT /api/cart/update` - Cập nhật giỏ hàng
- `DELETE /api/cart/remove` - Xóa khỏi giỏ hàng

### Order Routes
- `GET /api/orders` - Lấy danh sách đơn hàng
- `POST /api/orders` - Tạo đơn hàng
- `GET /api/orders/:id` - Lấy chi tiết đơn hàng
- `PUT /api/orders/:id/status` - Cập nhật trạng thái đơn hàng

### Admin Routes
- `GET /api/admin/dashboard` - Dashboard thống kê
- `GET /api/admin/users` - Quản lý người dùng
- `GET /api/admin/orders` - Quản lý đơn hàng

## 🧪 Testing

### Chạy test Frontend
```bash
cd FE
npm run test
```

### Chạy test Backend
```bash
cd BE
npm run test
```

## 📝 Linting

```bash
# Frontend
cd FE
npm run lint

# Backend
cd BE
npm run lint
```

## 🤝 Đóng góp

Chúng tôi rất hoan nghênh các đóng góp từ cộng đồng. Vui lòng:

1. Fork dự án
2. Tạo branch cho feature của bạn (`git checkout -b feature/amazing-feature`)
3. Commit thay đổi (`git commit -m 'Add some amazing feature'`)
4. Push đến branch (`git push origin feature/amazing-feature`)
5. Mở Pull Request

## 📄 License

Dự án này được cấp phép dưới giấy phép MIT. Xem file LICENSE để biết thêm chi tiết.

## 📧 Liên hệ

Nếu bạn có bất kỳ câu hỏi hoặc gợi ý, vui lòng liên hệ với chúng tôi qua email hoặc mở issue trên GitHub.

---

**Made with ❤️ by the GR85 Team**
