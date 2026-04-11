import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Cpu,
  LogOut,
  Menu,
  MessageCircle,
  ShoppingCart,
  User,
  X,
  Sparkles,
} from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export function Navbar() {
  const { totalItems } = useCart();
  const { isAuthenticated, user, logout, isHydrated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { href: "/", label: "Trang chủ" },
    { href: "/builder", label: "Tự ráp PC" },
    { href: "/components", label: "Linh kiện" },
    { href: "/ai-recommend", label: "AI tư vấn", icon: Sparkles },
  ];

  return (
    <nav className="fixed left-0 right-0 top-0 z-50 border-b border-border/50 glass">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="group flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg gradient-primary shadow-[0_0_20px_hsl(var(--primary)/0.4)]">
              <Cpu className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-gradient-primary">
              TechBuiltAI
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => (
              <Link key={link.href} to={link.href}>
                <Button
                  variant={
                    location.pathname === link.href ? "default" : "ghost"
                  }
                  size="sm"
                  className="gap-2"
                >
                  {link.icon && <link.icon className="h-4 w-4" />}
                  {link.label}
                </Button>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link to="/chat">
              <Button variant="ghost" size="icon" className="relative">
                <MessageCircle className="h-5 w-5" />
              </Button>
            </Link>

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

            {isHydrated && isAuthenticated ? (
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
              {navLinks.map((link) => (
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

