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
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { NotificationBell } from "@/components/NotificationBell";
import { FloatingChatWidget } from "@/components/FloatingChatWidget";
import {
  ADMIN_NAV_ITEMS,
  ADMIN_TAB_PERMISSION_MAP,
  PUBLIC_NAV_LINKS,
  SUPER_ADMIN_EMAIL,
} from "@/components/navbar/navbar.constants.js";
import {
  buildPermissionSet,
  canAccessAdminTab,
  getInitials,
  isAdminRole,
} from "@/components/navbar/navbar.utils.js";

export function Navbar() {
  const { totalItems } = useCart();
  const { isAuthenticated, user, logout, isHydrated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [featureSearchKeyword, setFeatureSearchKeyword] = useState("");
  const isAdmin = isAdminRole(user?.role);
  const permissionSet = useMemo(() => buildPermissionSet(user?.permissions), [user?.permissions]);
  const hasAdminPermission = useMemo(
    () => Array.from(permissionSet).some((item) => item.startsWith("admin_")),
    [permissionSet],
  );
  const isSuperAdmin = String(user?.email ?? "").trim().toLowerCase() === SUPER_ADMIN_EMAIL;
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

      const requiredPermission = ADMIN_TAB_PERMISSION_MAP[item.id];
      return canAccessAdminTab(requiredPermission, currentPermissions, isSuperAdmin);
    });
  }, [featureSearchKeyword, isAdmin, isSuperAdmin, permissionSet]);
  const navLinks = PUBLIC_NAV_LINKS;

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
              <div className="hidden flex-1 max-w-sm items-center gap-2 lg:flex">
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
              <Button
                variant="ghost"
                size="icon"
                className="relative"
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate("/login");
                    return;
                  }

                  setChatOpen((open) => !open);
                }}
              >
                <MessageCircle className="h-5 w-5" />
              </Button>
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
      <FloatingChatWidget isOpen={chatOpen && (!isAdminPage || !canAccessAdmin)} onClose={() => setChatOpen(false)} />
    </nav>
  );
}

