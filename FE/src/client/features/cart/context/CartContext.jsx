import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const CartContext = createContext(undefined);

export function CartProvider({ children }) {
  const { token, isAuthenticated, isHydrated } = useAuth();
  const [cart, setCart] = useState({ items: [], totalItems: 0, totalPrice: 0 });
  const [isLoading, setIsLoading] = useState(false);

  const callCartApi = useCallback(
    async (path, options = {}) => {
      const response = await fetch(`/api/cart${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(options.headers ?? {}),
        },
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Cart request failed");
      }

      return payload;
    },
    [token],
  );

  const refreshCart = useCallback(async () => {
    if (!isAuthenticated || !token) {
      setCart({ items: [], totalItems: 0, totalPrice: 0 });
      return;
    }

    setIsLoading(true);
    try {
      const data = await callCartApi("/me", { method: "GET" });
      setCart(normalizeCartPayload(data));
    } finally {
      setIsLoading(false);
    }
  }, [callCartApi, isAuthenticated, token]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    refreshCart().catch(() => {
      setCart({ items: [], totalItems: 0, totalPrice: 0 });
    });
  }, [isHydrated, refreshCart]);

  const addToCart = useCallback(
    async (component) => {
      if (!isAuthenticated || !token) {
        throw new Error("Vui lòng đăng nhập để thêm vào giỏ hàng");
      }

      const payload = await callCartApi("/items", {
        method: "POST",
        body: JSON.stringify({ productId: Number(component.id), quantity: 1 }),
      });
      setCart(normalizeCartPayload(payload));
    },
    [callCartApi, isAuthenticated, token],
  );

  const removeFromCart = useCallback(
    async (cartItemId) => {
      if (!isAuthenticated || !token) {
        return;
      }

      const payload = await callCartApi(`/items/${cartItemId}`, {
        method: "DELETE",
      });
      setCart(normalizeCartPayload(payload));
    },
    [callCartApi, isAuthenticated, token],
  );

  const updateQuantity = useCallback(
    async (cartItemId, quantity) => {
      if (!isAuthenticated || !token) {
        return;
      }

      const payload = await callCartApi(`/items/${cartItemId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      });
      setCart(normalizeCartPayload(payload));
    },
    [callCartApi, isAuthenticated, token],
  );

  const clearCart = useCallback(async () => {
    const ids = cart.items.map((item) => item.id);
    for (const id of ids) {
      await removeFromCart(id);
    }
  }, [cart.items, removeFromCart]);

  const checkout = useCallback(
    async ({
      shippingAddress,
      phoneNumber,
      paymentMethod,
      bankCode,
      addressId,
      couponCode,
      useWalletBalance,
    }) => {
      if (!isAuthenticated || !token) {
        throw new Error("Vui lòng đăng nhập để thanh toán");
      }

      const result = await callCartApi("/checkout", {
        method: "POST",
        body: JSON.stringify({
          shippingAddress,
          phoneNumber,
          paymentMethod,
          bankCode,
          addressId,
          couponCode,
          useWalletBalance,
        }),
      });

      await refreshCart();
      return result;
    },
    [callCartApi, isAuthenticated, token, refreshCart],
  );

  const previewPricing = useCallback(
    async ({ couponCode }) => {
      if (!isAuthenticated || !token) {
        throw new Error("Vui lòng đăng nhập để xem ưu đãi");
      }

      return callCartApi("/preview-pricing", {
        method: "POST",
        body: JSON.stringify({ couponCode }),
      });
    },
    [callCartApi, isAuthenticated, token],
  );

  const value = useMemo(
    () => ({
      items: cart.items,
      totalItems: cart.totalItems,
      totalPrice: cart.totalPrice,
      isLoading,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      checkout,
      previewPricing,
      refreshCart,
    }),
    [
      cart.items,
      cart.totalItems,
      cart.totalPrice,
      isLoading,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      checkout,
      previewPricing,
      refreshCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}

function normalizeCartPayload(payload) {
  const items = Array.isArray(payload.items)
    ? payload.items.map((item) => ({
        id: item.id,
        quantity: item.quantity,
        component: {
          id: item.product.id,
          slug: item.product.slug,
          name: item.product.name,
          brand: item.product?.specifications?.brand || "PC Perfect",
          image: item.product.imageUrl || "/images/component-placeholder.svg",
          price: Number(item.product.price ?? 0),
          stock: Number(item.product.stockQuantity ?? 0),
        },
      }))
    : [];

  return {
    items,
    totalItems: Number(payload.totalItems ?? 0),
    totalPrice: Number(payload.totalPrice ?? 0),
  };
}
