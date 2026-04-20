import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ShieldCheck,
  Cpu,
  LogOut,
  Menu,
  MessageCircle,
  Search,
  ShoppingCart,
  User,
  X,
  Sparkles,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";

const ADMIN_NAV_ITEMS = [
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
  // PC Components
  { id: "cpu", label: "CPU" },
  { id: "gpu", label: "Card đồ họa" },
  { id: "ram", label: "RAM" },
  { id: "motherboard", label: "Mainboard" },
  { id: "storage", label: "SSD" },
  { id: "hdd", label: "HDD" },
  { id: "psu", label: "Nguồn" },
  { id: "case", label: "Vỏ máy" },
  { id: "cooling", label: "Tản nhiệt" },
  // Peripherals
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

const ADMIN_TAB_PERMISSION_MAP = {
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

const SUPER_ADMIN_EMAIL = "admin@gmail.com";

export function Navbar() {
  const { totalItems } = useCart();
  const { isAuthenticated, user, logout, isHydrated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [featureSearchKeyword, setFeatureSearchKeyword] = useState("");
  const isAdmin = isAdminRole(user?.role);
  const permissionSet = useMemo(
    () =>
      new Set(
        (Array.isArray(user?.permissions) ? user.permissions : [])
          .map((item) => String(item ?? "").trim().toLowerCase())
          .filter(Boolean),
      ),
    [user?.permissions],
  );
  const hasAdminPermission = useMemo(
    () => Array.from(permissionSet).some((item) => item.startsWith("admin_")),
    [permissionSet],
  );
  const isSuperAdmin =
    String(user?.email ?? "").trim().toLowerCase() === SUPER_ADMIN_EMAIL;
  const canAccessAdmin = isAdmin || isSuperAdmin || hasAdminPermission;
  const isAdminPage = location.pathname.startsWith("/admin");

  const filteredAdminItems = useMemo(() => {
    if (!featureSearchKeyword.trim()) {
      return [];
    }

    const currentPermissions = new Set(Array.from(permissionSet));
    const keyword = featureSearchKeyword.toLowerCase().trim();
    return ADMIN_NAV_ITEMS.filter((item) => {
      if (!item.label.toLowerCase().includes(keyword)) {
        return false;
      }

      if (item.id === "roles" && isAdmin) {
        return true;
      }

      const requiredPermission = ADMIN_TAB_PERMISSION_MAP[item.id];
      if (!requiredPermission) {
        return true;
      }

      if (isSuperAdmin) {
        return true;
      }

      return currentPermissions.has(String(requiredPermission ?? "").toLowerCase());
    });
  }, [featureSearchKeyword, isAdmin, isSuperAdmin, permissionSet]);

  const navLinks = [
    { href: "/", label: "Trang chủ" },
    { href: "/builder", label: "Tự ráp PC" },
    { href: "/components", label: "Linh kiện" },
    { href: "/ai-recommend", label: "AI tư vấn", icon: Sparkles },
  ];

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border/70 bg-white shadow-sm">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <Link to="/" className="group flex items-center gap-2 shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
                <Cpu className="h-6 w-6 text-primary-foreground" />
              </div>
              <span className="font-display text-xl font-bold text-gradient-primary">
                TechBuiltAI
              </span>
            </Link>

            {isHydrated && isAuthenticated && canAccessAdmin && (
              <div className="hidden items-center gap-2 lg:flex flex-1 max-w-sm">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Tìm kiếm chức năng..."
                    className="w-full rounded-lg border border-border/50 bg-white pl-9 pr-3 py-2 text-xs placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    value={featureSearchKeyword}
                    onChange={(e) => setFeatureSearchKeyword(e.target.value)}
                  />
                </div>
                {featureSearchKeyword.trim() && filteredAdminItems.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-full bg-white border border-border/50 rounded-lg shadow-lg z-40 max-h-64 overflow-y-auto">
                    <div className="p-2 space-y-1">
                      {filteredAdminItems.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            setFeatureSearchKeyword("");
                            const element = document.getElementById(item.id);
                            if (element) {
                              element.scrollIntoView({ behavior: "smooth" });
                            }
                          }}
                          className="w-full text-left px-3 py-2 text-xs rounded-md hover:bg-primary/10 transition"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="hidden items-center gap-1 overflow-x-auto md:flex md:max-w-[44vw] lg:max-w-none">
            {(!isAdminPage || !canAccessAdmin) && navLinks.map((link) => (
              <Link key={link.href} to={link.href}>
                <Button
                  variant={
                    location.pathname === link.href ? "default" : "ghost"
                  }
                  size="sm"
                  className="shrink-0 gap-2"
                >
                  {link.icon && <link.icon className="h-4 w-4" />}
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {isHydrated && isAuthenticated && canAccessAdmin ? (
              <Link to="/admin">
                <Button
                  variant={
                    location.pathname.startsWith("/admin")
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  className="hidden gap-2 md:flex"
                >
                  <ShieldCheck className="h-4 w-4" />
                  Trang quản trị
                </Button>
              </Link>
            ) : null}

            {(!isAdminPage || !canAccessAdmin) && (
              <Link to="/chat">
                <Button variant="ghost" size="icon" className="relative">
                  <MessageCircle className="h-5 w-5" />
                </Button>
              </Link>
            )}

            {(!isAdminPage || !canAccessAdmin) && (
              <Link to="/cart">
                <Button variant="ghost" size="icon" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {totalItems > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-xs font-bold text-accent-foreground">
                      {totalItems}
                    </span>
                  )}
                </Button>
              </Link>
            )}

            {isHydrated && isAuthenticated && (!isAdminPage || !canAccessAdmin) && (
              <NotificationBell />
            )}

            {isHydrated && isAuthenticated && canAccessAdmin ? (
              <div className="hidden items-center gap-3 sm:flex">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                    navigate("/");
                  }}
                  className="gap-2"
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </Button>
              </div>
            ) : isHydrated && isAuthenticated ? (
              <div className="hidden items-center gap-3 rounded-full border border-border/70 bg-white/80 px-3 py-1.5 sm:flex">
                <button
                  onClick={() => navigate("/profile")}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary hover:bg-primary/20 transition-colors"
                >
                  {getInitials(user?.fullName ?? user?.email ?? "U")}
                </button>
                <button
                  onClick={() => navigate("/profile")}
                  className="leading-tight cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className="text-sm font-semibold">
                    {user?.fullName ?? user?.email}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {user?.role ?? "Người dùng"}
                  </div>
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                    navigate("/");
                  }}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <Link to="/login">
                <Button
                  variant="outline"
                  size="sm"
                  className="hidden gap-2 sm:flex"
                >
                  <User className="h-4 w-4" />
                  Đăng nhập
                </Button>
              </Link>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setMobileMenuOpen((open) => !open)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5" />
              ) : (
                <Menu className="h-5 w-5" />
              )}
            </Button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="border-t border-border/50 py-4 md:hidden">
            <div className="flex flex-col gap-2">
              {(!isAdminPage || !canAccessAdmin) && navLinks.map((link) => (
                <Link
                  key={link.href}
                  to={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button
                    variant={
                      location.pathname === link.href ? "default" : "ghost"
                    }
                    className="w-full justify-start gap-2"
                  >
                    {link.icon && <link.icon className="h-4 w-4" />}
                    {link.label}
                  </Button>
                </Link>
              ))}

              {isHydrated && isAuthenticated && canAccessAdmin ? (
                <Link to="/admin" onClick={() => setMobileMenuOpen(false)}>
                  <Button
                    variant={
                      location.pathname.startsWith("/admin")
                        ? "default"
                        : "ghost"
                    }
                    className="w-full justify-start gap-2"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Admin
                  </Button>
                </Link>
              ) : null}

              {isHydrated && isAuthenticated ? (
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                    navigate("/");
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  Đăng xuất
                </Button>
              ) : (
                <Link to="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full gap-2">
                    <User className="h-4 w-4" />
                    Đăng nhập
                  </Button>
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}

function getInitials(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function isAdminRole(role) {
  return String(role ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .includes("admin");
}
