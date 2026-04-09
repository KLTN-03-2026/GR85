import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import IndexPage from "@/client/features/home/pages/IndexPage";
import AuthPage from "@/client/features/auth/pages/AuthPage";
import ComponentsPage from "@/client/features/catalog/pages/ComponentsPage";
import ProductDetailPage from "@/client/features/catalog/pages/ProductDetailPage";
import BuilderPage from "@/client/features/builder/pages/BuilderPage";
import AIRecommendPage from "@/client/features/recommend/pages/AIRecommendPage";
import CartPage from "@/client/features/cart/pages/CartPage";
import ChatPage from "@/client/features/chat/pages/ChatPage";
import AdminPage from "@/client/features/admin/pages/AdminPage";
import ProfilePage from "@/client/features/profile/pages/ProfilePage";
import NotFoundPage from "@/client/features/shared/pages/NotFoundPage";
import { useAuth } from "@/contexts/AuthContext";

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<IndexPage />} />
        <Route path="/auth" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<AuthPage />} />
        <Route path="/register" element={<AuthPage />} />
        <Route path="/forgot-password" element={<AuthPage />} />
        <Route path="/verify-email" element={<AuthPage />} />
        <Route path="/reset-password" element={<AuthPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/admin" element={<AdminRoute><AdminPage /></AdminRoute>} />
        <Route path="/components" element={<ComponentsPage />} />
        <Route path="/components/:slug" element={<ProductDetailPage />} />
        <Route path="/builder" element={<BuilderPage />} />
        <Route path="/ai-recommend" element={<AIRecommendPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
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
  return String(role ?? "")
    .trim()
    .toLowerCase()
    .includes("admin");
}
