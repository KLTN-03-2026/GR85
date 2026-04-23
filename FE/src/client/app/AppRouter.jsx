import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import IndexPage from "@/client/features/home/pages/IndexPage";
import AuthPage from "@/client/features/auth/pages/AuthPage";
import ComponentsPage from "@/client/features/catalog/pages/ComponentsPage";
import ProductDetailPage from "@/client/features/catalog/pages/ProductDetailPage";
import BuilderPage from "@/client/features/builder/pages/BuilderPage";
import AIRecommendPage from "@/client/features/recommend/pages/AIRecommendPage";
import AIAdvisorChatPage from "@/client/features/recommend/pages/AIAdvisorChatPage";
import CartPage from "@/client/features/cart/pages/CartPage";
import PayOSCheckoutPage from "@/client/features/cart/pages/PayOSCheckoutPage";
import PaymentQrPage from "@/client/features/cart/pages/PaymentQrPage";
import PaymentResultPage from "@/client/features/cart/pages/PaymentResultPage";
import PayOSReturnPage from "@/client/features/cart/pages/PayOSReturnPage";
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
        <Route path="/ai-chat" element={<UserRoute><AIAdvisorChatPage /></UserRoute>} />
        <Route path="/cart" element={<UserRoute><CartPage /></UserRoute>} />
        <Route path="/payment-payos" element={<UserRoute><PayOSCheckoutPage /></UserRoute>} />
        <Route path="/payment-qr" element={<UserRoute><PaymentQrPage /></UserRoute>} />
        <Route path="/payment/success" element={<UserRoute><PayOSReturnPage /></UserRoute>} />
        <Route path="/payment/cancel" element={<UserRoute><PayOSReturnPage /></UserRoute>} />
        <Route path="/payment-result" element={<UserRoute><PaymentResultPage /></UserRoute>} />
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

  if (isAuthenticated && canAccessAdmin(user)) {
    return <Navigate to="/admin" replace />;
  }

  return children;
}

function HomeRoute() {
  const { isHydrated, isAuthenticated, user } = useAuth();

  if (!isHydrated) {
    return null;
  }

  if (isAuthenticated && canAccessAdmin(user)) {
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

  if (!canAccessAdmin(user)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function canAccessAdmin(user) {
  const normalizedRole = String(user?.role ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

  if (normalizedRole.includes("admin") || normalizedRole.includes("quan tri")) {
    return true;
  }

  return (Array.isArray(user?.permissions) ? user.permissions : []).some((item) =>
    String(item ?? "").toLowerCase().startsWith("admin_"),
  );
}

