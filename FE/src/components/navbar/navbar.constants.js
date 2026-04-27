import { Sparkles } from "lucide-react";

export const PUBLIC_NAV_LINKS = [
  { href: "/", label: "Trang chủ" },
  { href: "/builder", label: "Tự ráp PC" },
  { href: "/components", label: "Linh kiện" },
  { href: "/ai-recommend", label: "AI tư vấn", icon: Sparkles },
];

export const ADMIN_NAV_ITEMS = [
  { id: "dashboard", label: "Tổng quan" },
  { id: "users", label: "Người dùng" },
  { id: "products", label: "Sản phẩm" },
  { id: "orders", label: "Đơn hàng" },
  { id: "catalog", label: "Danh mục & NCC" },
  { id: "vouchers", label: "Mã giảm giá" },
  { id: "warehouse", label: "Kho" },
  { id: "reviews", label: "Đánh giá" },
  { id: "chat", label: "Chat" },
  { id: "ai-build", label: "Cấu hình AI" },
  { id: "verification", label: "Email OTP" },
  { id: "roles", label: "Phân quyền" },
  { id: "cpu", label: "CPU" },
  { id: "gpu", label: "Card đồ họa" },
  { id: "ram", label: "RAM" },
  { id: "motherboard", label: "Mainboard" },
  { id: "storage", label: "SSD" },
  { id: "hdd", label: "HDD" },
  { id: "psu", label: "Nguồn" },
  { id: "case", label: "Vỏ máy" },
  { id: "cooling", label: "Tản nhiệt" },
  { id: "monitor", label: "Màn hình" },
  { id: "mouse", label: "Chuột" },
  { id: "keyboard", label: "Bàn phím" },
  { id: "headset", label: "Tai nghe" },
  { id: "speaker", label: "Loa" },
  { id: "webcam", label: "Webcam" },
  { id: "microphone", label: "Microphone" },
  { id: "cable", label: "Cáp" },
  { id: "hub", label: "Hub" },
  { id: "stand", label: "Giá đỡ" },
  { id: "pad", label: "Lót chuột" },
];

export const ADMIN_TAB_PERMISSION_MAP = {
  dashboard: "admin_dashboard_view",
  users: "admin_users_manage",
  products: "admin_products_manage",
  orders: "admin_orders_manage",
  catalog: "admin_catalog_manage",
  vouchers: "admin_vouchers_manage",
  warehouse: "admin_warehouse_manage",
  reviews: "admin_reviews_manage",
  chat: "admin_chat_manage",
  "ai-build": "admin_ai_build_manage",
  verification: "admin_verification_view",
  roles: "admin_roles_manage",
};

export const SUPER_ADMIN_EMAIL = "admin@gmail.com";