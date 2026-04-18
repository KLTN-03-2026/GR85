import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import IndexPage from "@/client/features/home/pages/IndexPage";
import AuthPage from "@/client/features/auth/pages/AuthPage";
import ComponentsPage from "@/client/features/catalog/pages/ComponentsPage";
import ProductDetailPage from "@/client/features/catalog/pages/ProductDetailPage";
import BuilderPage from "@/client/features/builder/pages/BuilderPage";
import AIRecommendPage from "@/client/features/recommend/pages/AIRecommendPage";
import CartPage from "@/client/features/cart/pages/CartPage";
import PaymentQrPage from "@/client/features/cart/pages/PaymentQrPage";
import PaymentResultPage from "@/client/features/cart/pages/PaymentResultPage";
import ChatPage from "@/client/features/chat/pages/ChatPage";
import AdminPage from "@/client/features/admin/pages/AdminPage";
import ProfilePage from "@/client/features/profile/pages/ProfilePage";
import NotFoundPage from "@/client/features/shared/pages/NotFoundPage";
import { useAuth } from "@/contexts/AuthContext";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/auth" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/forgot-password" element={<AuthPage />} />
        <Route path="/verify-email" element={<AuthPage />} />
        <Route path="/reset-password" element={<AuthPage />} />
        <Route path="/profile" element={<UserRoute><ProfilePage /></UserRoute>} />
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="/components" element={<UserRoute><ComponentsPage /></UserRoute>} />
        <Route path="/components/:slug" element={<UserRoute><ProductDetailPage /></UserRoute>} />
        <Route path="/builder" element={<UserRoute><BuilderPage /></UserRoute>} />
        <Route path="/ai-recommend" element={<UserRoute><AIRecommendPage /></UserRoute>} />
        <Route path="/cart" element={<UserRoute><CartPage /></UserRoute>} />
        <Route path="/payment-qr" element={<UserRoute><PaymentQrPage /></UserRoute>} />
        <Route path="/payment-result" element={<UserRoute><PaymentResultPage /></UserRoute>} />
        <Route path="/chat" element={<UserRoute><ChatPage /></UserRoute>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

function UserRoute({ children }) {
  const { isHydrated, isAuthenticated, user } = useAuth();

  if (!isHydrated) {
    return null;
  }

  if (isAdminRole(user?.role)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

function HomeRoute() {
  const { isHydrated, isAuthenticated, user } = useAuth();

  if (!isHydrated) {
    return null;
  }

  if (isAuthenticated && isAdminRole(user?.role)) {
    return <Navigate to="/admin" replace />;
  }

  return <IndexPage />;
}

function AdminRoute({ children }) {
  const { isHydrated, isAuthenticated, user } = useAuth();

  if (!isHydrated) {
    return null;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!isAdminRole(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function isAdminRole(role) {
  const normalizedRole = String(role ?? "")
    .trim()
    .toLowerCase();

  return (
    normalizedRole.includes("admin") || normalizedRole.includes("quan tri")
  );
}
