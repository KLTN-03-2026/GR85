import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const CartContext = createContext(undefined);
const CART_BUNDLE_STORAGE_PREFIX = "techbuiltai-cart-bundles";

export function CartProvider({ children }) {
  const { token, user, isAuthenticated, isHydrated } = useAuth();
  const [cart, setCart] = useState({ items: [], totalItems: 0, totalPrice: 0 });
  const [bundles, setBundles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const bundleStorageKey = useMemo(() => {
    if (!isHydrated || !isAuthenticated) {
      return null;
    }

    return `${CART_BUNDLE_STORAGE_PREFIX}-${user?.id ?? "guest"}`;
  }, [isAuthenticated, isHydrated, user?.id]);

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

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!bundleStorageKey || typeof window === "undefined") {
      setBundles([]);
      return;
    }

    try {
      const stored = window.localStorage.getItem(bundleStorageKey);
      setBundles(stored ? JSON.parse(stored) : []);
    } catch {
      setBundles([]);
    }
  }, [bundleStorageKey, isHydrated]);

  useEffect(() => {
    if (!isHydrated || !bundleStorageKey || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(bundleStorageKey, JSON.stringify(bundles));
  }, [bundleStorageKey, bundles, isHydrated]);

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

  const addBuildToCart = useCallback(
    async ({ name, components, totalPrice, useUsedPrices }) => {
      if (!isAuthenticated || !token) {
        throw new Error("Vui lòng đăng nhập để thêm combo vào giỏ hàng");
      }

      const selectedComponents = Array.isArray(components)
        ? components.filter(Boolean)
        : [];

      if (selectedComponents.length === 0) {
        throw new Error("Combo không có linh kiện nào");
      }

      for (const component of selectedComponents) {
        await callCartApi("/items", {
          method: "POST",
          body: JSON.stringify({ productId: Number(component.id), quantity: 1 }),
        });
      }

      await refreshCart();

      const bundleRecord = {
        id: crypto.randomUUID(),
        name: String(name ?? "Cấu hình tự ráp").trim() || "Cấu hình tự ráp",
        totalPrice: Number(totalPrice ?? 0),
        useUsedPrices: Boolean(useUsedPrices),
        createdAt: new Date().toISOString(),
        items: selectedComponents.map((component) => ({
          productId: Number(component.id),
          name: String(component.name ?? ""),
          brand: String(component.brand ?? ""),
          category: String(component.category ?? ""),
          price: Number(
            useUsedPrices && component.usedPrice ? component.usedPrice : component.price ?? 0,
          ),
          image: component.image || "/images/component-placeholder.svg",
        })),
      };

      setBundles((prev) => [...prev, bundleRecord]);
      return bundleRecord;
    },
    [callCartApi, isAuthenticated, refreshCart, token],
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
    setBundles([]);
  }, [cart.items, removeFromCart]);

  const clearBundleMetadata = useCallback(() => {
    setBundles([]);
  }, []);

  const removeCartItemsByIds = useCallback(
    async (cartItemIds) => {
      if (!isAuthenticated || !token) {
        return;
      }

      const ids = Array.from(
        new Set(
          (Array.isArray(cartItemIds) ? cartItemIds : [])
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id)),
        ),
      );

      if (ids.length === 0) {
        return;
      }

      const removedProductIds = new Set(
        cart.items
          .filter((item) => ids.includes(Number(item.id)))
          .map((item) => Number(item.component?.id))
          .filter((productId) => Number.isFinite(productId)),
      );

      for (const cartItemId of ids) {
        await callCartApi(`/items/${cartItemId}`, {
          method: "DELETE",
        });
      }

      if (removedProductIds.size > 0) {
        setBundles((prev) =>
          prev.filter((bundle) =>
            !(bundle.items ?? []).some((item) => removedProductIds.has(Number(item.productId))),
          ),
        );
      }

      await refreshCart();
    },
    [callCartApi, cart.items, isAuthenticated, refreshCart, token],
  );

  const removeBundle = useCallback(
    async (bundleId) => {
      const targetBundle = bundles.find((bundle) => String(bundle.id) === String(bundleId));
      if (!targetBundle) {
        return;
      }

      const removeCountByProductId = new Map();
      for (const item of targetBundle.items ?? []) {
        const productId = Number(item.productId);
        if (!Number.isFinite(productId)) {
          continue;
        }

        removeCountByProductId.set(
          productId,
          (removeCountByProductId.get(productId) ?? 0) + 1,
        );
      }

      for (const [productId, removeCount] of removeCountByProductId.entries()) {
        const cartItem = cart.items.find(
          (item) => Number(item.component?.id) === Number(productId),
        );

        if (!cartItem) {
          continue;
        }

        if (cartItem.quantity > removeCount) {
          await callCartApi(`/items/${cartItem.id}`, {
            method: "PATCH",
            body: JSON.stringify({ quantity: cartItem.quantity - removeCount }),
          });
          continue;
        }

        await callCartApi(`/items/${cartItem.id}`, {
          method: "DELETE",
        });
      }

      setBundles((prev) => prev.filter((bundle) => String(bundle.id) !== String(bundleId)));
      await refreshCart();
    },
    [bundles, cart.items, callCartApi, refreshCart],
  );

  const checkout = useCallback(
    async ({
      shippingAddress,
      phoneNumber,
      paymentMethod,
      bankCode,
      addressId,
      couponCode,
      useWalletBalance,
      selectedCartItemIds,
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
          selectedCartItemIds,
        }),
      });

      await refreshCart();
      return result;
    },
    [callCartApi, isAuthenticated, token, refreshCart],
  );

  const confirmMockPayment = useCallback(
    async ({ orderId, paymentCode }) => {
      if (!isAuthenticated || !token) {
        throw new Error("Vui lòng đăng nhập để xác nhận thanh toán");
      }

      const result = await callCartApi("/mock-vnpay/confirm", {
        method: "POST",
        body: JSON.stringify({
          orderId: Number(orderId),
          paymentCode: String(paymentCode ?? "").trim() || undefined,
        }),
      });

      await refreshCart();
      return result;
    },
    [callCartApi, isAuthenticated, refreshCart, token],
  );

  const previewPricing = useCallback(
    async ({ couponCode, selectedCartItemIds }) => {
      if (!isAuthenticated || !token) {
        throw new Error("Vui lòng đăng nhập để xem ưu đãi");
      }

      return callCartApi("/preview-pricing", {
        method: "POST",
        body: JSON.stringify({ couponCode, selectedCartItemIds }),
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
      clearBundleMetadata,
      removeCartItemsByIds,
      removeBundle,
      bundles,
      addBuildToCart,
      checkout,
      confirmMockPayment,
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
      clearBundleMetadata,
      removeCartItemsByIds,
      removeBundle,
      bundles,
      addBuildToCart,
      checkout,
      confirmMockPayment,
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
