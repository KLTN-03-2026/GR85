export const adminSummaryCards = [
  {
    title: 'Tổng người dùng',
    value: '18,420',
    change: '+12.4%',
    description: 'So với 30 ngày trước',
    tone: 'emerald',
  },
  {
    title: 'Đơn hàng',
    value: '2,186',
    change: '+8.1%',
    description: 'Đơn mới trong tháng',
    tone: 'blue',
  },
  {
    title: 'Doanh thu',
    value: '1.42 tỷ',
    change: '+18.9%',
    description: 'GMV đã thanh toán',
    tone: 'amber',
  },
  {
    title: 'Đang xử lý',
    value: '126',
    change: '-4.2%',
    description: 'Đơn chờ đóng gói hoặc giao',
    tone: 'rose',
  },
] as const;

export const revenueTrend = [
  { label: 'T2', revenue: 180, orders: 320 },
  { label: 'T3', revenue: 220, orders: 370 },
  { label: 'T4', revenue: 245, orders: 410 },
  { label: 'T5', revenue: 290, orders: 465 },
  { label: 'T6', revenue: 315, orders: 490 },
  { label: 'T7', revenue: 355, orders: 552 },
  { label: 'T8', revenue: 420, orders: 610 },
] as const;

export const orderStatusData = [
  { name: 'Pending', value: 54, fill: '#f59e0b' },
  { name: 'Processing', value: 38, fill: '#0ea5e9' },
  { name: 'Shipping', value: 21, fill: '#8b5cf6' },
  { name: 'Delivered', value: 71, fill: '#10b981' },
  { name: 'Cancelled', value: 9, fill: '#ef4444' },
] as const;

export const topProducts = [
  { name: 'RTX 4070 Super', sold: 128, stock: 14, revenue: '486 triệu' },
  { name: 'Ryzen 7 7800X3D', sold: 104, stock: 22, revenue: '301 triệu' },
  { name: 'Kingston Fury 32GB', sold: 92, stock: 57, revenue: '118 triệu' },
  { name: 'Samsung 990 Pro 2TB', sold: 85, stock: 19, revenue: '154 triệu' },
] as const;

export const users = [
  { name: 'Nguyễn Văn An', email: 'an@gmail.com', role: 'Admin', status: 'Active', orders: 24, spend: '126 triệu' },
  { name: 'Trần Hải My', email: 'my@gmail.com', role: 'Staff', status: 'Active', orders: 12, spend: '88 triệu' },
  { name: 'Lê Quốc Bình', email: 'binh@gmail.com', role: 'User', status: 'Banned', orders: 2, spend: '4.2 triệu' },
  { name: 'Phạm Thiên Phúc', email: 'phuc@gmail.com', role: 'User', status: 'Active', orders: 7, spend: '18 triệu' },
] as const;

export const products = [
  { sku: 'GPU-4070S', name: 'MSI RTX 4070 Super', category: 'GPU', price: '15.990.000đ', stock: 14, status: 'Active' },
  { sku: 'CPU-7800X3D', name: 'AMD Ryzen 7 7800X3D', category: 'CPU', price: '9.890.000đ', stock: 22, status: 'Active' },
  { sku: 'SSD-990PRO2T', name: 'Samsung 990 Pro 2TB', category: 'Storage', price: '3.790.000đ', stock: 19, status: 'Draft' },
  { sku: 'CASE-H9', name: 'NZXT H9 Flow', category: 'Case', price: '4.190.000đ', stock: 8, status: 'Hidden' },
] as const;

export const categories = [
  { name: 'CPU', slug: 'cpu', products: 86 },
  { name: 'GPU', slug: 'gpu', products: 64 },
  { name: 'Mainboard', slug: 'mainboard', products: 73 },
  { name: 'RAM', slug: 'ram', products: 91 },
] as const;

export const suppliers = [
  { name: 'ASUS Việt Nam', contact: 'sales@asus.vn', phone: '0901 111 222', status: 'Connected' },
  { name: 'AMD Distributor', contact: 'amd@dist.vn', phone: '0908 222 333', status: 'Connected' },
  { name: 'NVIDIA Partner', contact: 'gpu@nvidia.vn', phone: '0907 444 555', status: 'Pending' },
] as const;

export const coupons = [
  { code: 'BUILDPC10', type: 'Percentage', value: '10%', used: '84 / 300', schedule: '01/04 - 30/04', status: 'Active' },
  { code: 'FREESHIP', type: 'Amount', value: '50.000đ', used: '192 / 500', schedule: '01/04 - 15/04', status: 'Active' },
  { code: 'APRILVIP', type: 'Amount', value: '300.000đ', used: '12 / 50', schedule: '05/04 - 09/04', status: 'Paused' },
] as const;

export const orders = [
  { code: '#ORD-2401', customer: 'Nguyễn Văn An', total: '24.890.000đ', payment: 'Paid', status: 'Shipping' },
  { code: '#ORD-2402', customer: 'Trần Hải My', total: '11.490.000đ', payment: 'Pending', status: 'Processing' },
  { code: '#ORD-2403', customer: 'Lê Quốc Bình', total: '56.200.000đ', payment: 'Refunded', status: 'Cancelled' },
  { code: '#ORD-2404', customer: 'Phạm Thiên Phúc', total: '8.390.000đ', payment: 'Paid', status: 'Delivered' },
] as const;

export const payments = [
  { method: 'VNPay', paid: 748, failed: 18, refunded: 12 },
  { method: 'COD', paid: 296, failed: 31, refunded: 4 },
  { method: 'Momo', paid: 214, failed: 9, refunded: 3 },
] as const;

export const warehouses = [
  { name: 'Kho HCM', batch: 'BATCH-HCM-041', available: 1240, sold: 426, warranty: 17 },
  { name: 'Kho Hà Nội', batch: 'BATCH-HN-028', available: 980, sold: 371, warranty: 11 },
  { name: 'Kho Đà Nẵng', batch: 'BATCH-DN-010', available: 512, sold: 103, warranty: 6 },
] as const;

export const reviews = [
  { product: 'RTX 4070 Super', rating: 5, author: 'Khách hàng #221', excerpt: 'Hiệu năng rất ổn, nhiệt độ mát.', status: 'Published' },
  { product: 'Ryzen 7 7800X3D', rating: 2, author: 'Khách hàng #034', excerpt: 'Đóng gói chưa kỹ, hộp móp.', status: 'Need review' },
  { product: 'Samsung 990 Pro 2TB', rating: 4, author: 'Khách hàng #512', excerpt: 'Tốc độ đúng như mô tả.', status: 'Published' },
] as const;

export const chats = [
  { room: 'ROOM-0932', customer: 'Khánh Linh', lastMessage: 'Mình cần build máy stream 35 triệu', agent: 'AI + Staff', status: 'Open' },
  { room: 'ROOM-0933', customer: 'Gia Huy', lastMessage: 'Đơn hàng mình đang tới đâu?', agent: 'Staff', status: 'Pending' },
  { room: 'ROOM-0934', customer: 'Minh Anh', lastMessage: 'Tư vấn PSU cho RTX 4080', agent: 'AI', status: 'Closed' },
] as const;

export const aiBuilds = [
  { build: 'Gaming 30 triệu', owner: 'Thành Đạt', total: '29.700.000đ', items: 7, trend: 'Popular' },
  { build: 'Streaming 45 triệu', owner: 'Nhật Minh', total: '44.200.000đ', items: 8, trend: 'Stable' },
  { build: 'Văn phòng 15 triệu', owner: 'Hoàng Nam', total: '14.890.000đ', items: 6, trend: 'Rising' },
] as const;

export const emailVerifications = [
  { email: 'customer1@gmail.com', otp: '842913', requestedAt: '08:15', expiresAt: '08:20', status: 'Waiting' },
  { email: 'customer2@gmail.com', otp: '102488', requestedAt: '08:02', expiresAt: '08:07', status: 'Verified' },
  { email: 'customer3@gmail.com', otp: '664311', requestedAt: '07:54', expiresAt: '07:59', status: 'Expired' },
] as const;

export const roles = [
  { role: 'Admin', permissions: ['manage_user', 'manage_product', 'manage_order', 'manage_coupon', 'manage_role'] },
  { role: 'Staff', permissions: ['manage_product', 'manage_order', 'manage_review', 'manage_chat'] },
  { role: 'User', permissions: ['place_order', 'save_build', 'send_review'] },
] as const;
