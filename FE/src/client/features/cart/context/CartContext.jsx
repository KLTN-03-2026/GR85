import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const CartContext = createContext(undefined);
const CART_BUNDLE_STORAGE_PREFIX = "techbuiltai-cart-bundles";
const GUEST_CART_STORAGE_KEY = "techbuiltai-cart-guest-items";

export function CartProvider({ children }) {
  const { token, user, isAuthenticated, isHydrated } = useAuth();
  const [cart, setCart] = useState({ items: [], totalItems: 0, totalPrice: 0 });
  const [bundles, setBundles] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const bundleStorageKey = useMemo(() => {
    if (!isHydrated) {
      return null;
    }

    return `${CART_BUNDLE_STORAGE_PREFIX}-${user?.id ?? "guest"}`;
  }, [isHydrated, user?.id]);

  const callCartApi = useCallback(
    async (path, options = {}) => {
      const response = await fetch(`/api/cart${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

  const readGuestCart = useCallback(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const raw = window.localStorage.getItem(GUEST_CART_STORAGE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, []);

  const writeGuestCart = useCallback((items) => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(GUEST_CART_STORAGE_KEY, JSON.stringify(Array.isArray(items) ? items : []));
  }, []);

  const refreshCart = useCallback(async () => {
    if (!isHydrated) {
      return;
    }

    if (!isAuthenticated || !token) {
      const guestItems = readGuestCart();
      setCart(normalizeGuestCartPayload(guestItems));
      return;
    }

    setIsLoading(true);
    try {
      const data = await callCartApi("/me", { method: "GET" });
      setCart(normalizeCartPayload(data));
    } finally {
      setIsLoading(false);
    }
  }, [callCartApi, isAuthenticated, isHydrated, readGuestCart, token]);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    refreshCart().catch(() => {
      setCart({ items: [], totalItems: 0, totalPrice: 0 });
    });
  }, [isHydrated, refreshCart]);

  useEffect(() => {
    if (!isHydrated || !bundleStorageKey || typeof window === "undefined") {
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

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !token || typeof window === "undefined") {
      return;
    }

    const guestItems = readGuestCart();
    if (guestItems.length === 0) {
      return;
    }

    let cancelled = false;

    const mergeGuestCartToAccount = async () => {
      try {
        for (const item of guestItems) {
          if (!Number.isFinite(Number(item?.productId)) || Number(item?.quantity) <= 0) {
            continue;
          }

          await callCartApi("/items", {
            method: "POST",
            body: JSON.stringify({
              productId: Number(item.productId),
              quantity: Number(item.quantity),
            }),
          });
        }

        if (!cancelled) {
          writeGuestCart([]);
          await refreshCart();
        }
      } catch {
        // Keep guest cart untouched if merge fails; user can retry later.
      }
    };

    mergeGuestCartToAccount();

    return () => {
      cancelled = true;
    };
  }, [callCartApi, isAuthenticated, isHydrated, readGuestCart, refreshCart, token, writeGuestCart]);

  const addToCart = useCallback(
    async (component) => {
      if (!isAuthenticated || !token) {
        const normalized = normalizeGuestComponent(component);
        if (!normalized) {
          throw new Error("Không thể thêm sản phẩm vào giỏ");
        }

        const current = readGuestCart();
        const existing = current.find((item) => Number(item.productId) === Number(normalized.productId));

        let nextItems = [];
        if (existing) {
          nextItems = current.map((item) =>
            Number(item.productId) === Number(normalized.productId)
              ? {
                ...item,
                quantity: Math.min(Number(item.stock ?? 0) || 9999, Number(item.quantity ?? 0) + 1),
              }
              : item,
          );
        } else {
          nextItems = [...current, { ...normalized, quantity: 1 }];
        }

        writeGuestCart(nextItems);
        setCart(normalizeGuestCartPayload(nextItems));
        return;
      }

      const payload = await callCartApi("/items", {
        method: "POST",
        body: JSON.stringify({ productId: Number(component.id), quantity: 1 }),
      });
      setCart(normalizeCartPayload(payload));
    },
    [callCartApi, isAuthenticated, readGuestCart, token, writeGuestCart],
  );

  const addBuildToCart = useCallback(
    async ({ name, components, totalPrice, useUsedPrices }) => {
      const selectedComponents = Array.isArray(components)
        ? components.filter(Boolean)
        : [];

      if (selectedComponents.length === 0) {
        throw new Error("Combo không có linh kiện nào");
      }

      if (!isAuthenticated || !token) {
        const current = readGuestCart();
        const mergedByProductId = new Map(
          current.map((item) => [Number(item.productId), { ...item }]),
        );

        for (const component of selectedComponents) {
          const normalized = normalizeGuestComponent(component);
          if (!normalized) {
            continue;
          }

          const existing = mergedByProductId.get(Number(normalized.productId));
          if (existing) {
            existing.quantity = Math.min(Number(existing.stock ?? 0) || 9999, Number(existing.quantity ?? 0) + 1);
          } else {
            mergedByProductId.set(Number(normalized.productId), { ...normalized, quantity: 1 });
          }
        }

        const nextItems = Array.from(mergedByProductId.values());
        writeGuestCart(nextItems);
        setCart(normalizeGuestCartPayload(nextItems));
      } else {
        for (const component of selectedComponents) {
          await callCartApi("/items", {
            method: "POST",
            body: JSON.stringify({ productId: Number(component.id), quantity: 1 }),
          });
        }

        await refreshCart();
      }

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
    [callCartApi, isAuthenticated, readGuestCart, refreshCart, token, writeGuestCart],
  );

  const removeFromCart = useCallback(
    async (cartItemId) => {
      if (!isAuthenticated || !token) {
        const next = readGuestCart().filter((item) => Number(item.id) !== Number(cartItemId));
        writeGuestCart(next);
        setCart(normalizeGuestCartPayload(next));
        return;
      }

      const payload = await callCartApi(`/items/${cartItemId}`, {
        method: "DELETE",
      });
      setCart(normalizeCartPayload(payload));
    },
    [callCartApi, isAuthenticated, readGuestCart, token, writeGuestCart],
  );

  const updateQuantity = useCallback(
    async (cartItemId, quantity) => {
      if (!isAuthenticated || !token) {
        if (Number(quantity) <= 0) {
          const filtered = readGuestCart().filter((item) => Number(item.id) !== Number(cartItemId));
          writeGuestCart(filtered);
          setCart(normalizeGuestCartPayload(filtered));
          return;
        }

        const next = readGuestCart().map((item) => {
          if (Number(item.id) !== Number(cartItemId)) {
            return item;
          }

          const stock = Number(item.stock ?? 0);
          return {
            ...item,
            quantity: Math.max(1, Math.min(stock > 0 ? stock : 9999, Number(quantity))),
          };
        });

        writeGuestCart(next);
        setCart(normalizeGuestCartPayload(next));
        return;
      }

      const payload = await callCartApi(`/items/${cartItemId}`, {
        method: "PATCH",
        body: JSON.stringify({ quantity }),
      });
      setCart(normalizeCartPayload(payload));
    },
    [callCartApi, isAuthenticated, readGuestCart, token, writeGuestCart],
  );

  const clearCart = useCallback(async () => {
    if (!isAuthenticated || !token) {
      writeGuestCart([]);
      setCart({ items: [], totalItems: 0, totalPrice: 0 });
      setBundles([]);
      return;
    }

    const ids = cart.items.map((item) => item.id);
    for (const id of ids) {
      await removeFromCart(id);
    }
    setBundles([]);
  }, [cart.items, isAuthenticated, removeFromCart, token, writeGuestCart]);

  const clearBundleMetadata = useCallback(() => {
    setBundles([]);
  }, []);

  const removeCartItemsByIds = useCallback(
    async (cartItemIds) => {
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

      if (!isAuthenticated || !token) {
        const next = readGuestCart().filter((item) => !ids.includes(Number(item.id)));
        writeGuestCart(next);
        setCart(normalizeGuestCartPayload(next));
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
    [callCartApi, cart.items, isAuthenticated, readGuestCart, refreshCart, token, writeGuestCart],
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

      if (!isAuthenticated || !token) {
        let next = [...readGuestCart()];
        for (const [productId, removeCount] of removeCountByProductId.entries()) {
          next = next
            .map((item) => {
              if (Number(item.productId) !== Number(productId)) {
                return item;
              }

              return {
                ...item,
                quantity: Number(item.quantity ?? 0) - removeCount,
              };
            })
            .filter((item) => Number(item.quantity) > 0);
        }

        writeGuestCart(next);
        setCart(normalizeGuestCartPayload(next));
        setBundles((prev) => prev.filter((bundle) => String(bundle.id) !== String(bundleId)));
        return;
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
    [bundles, cart.items, callCartApi, isAuthenticated, readGuestCart, refreshCart, token, writeGuestCart],
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
        const normalizedIds = new Set(
          (Array.isArray(selectedCartItemIds) ? selectedCartItemIds : [])
            .map((id) => Number(id))
            .filter((id) => Number.isFinite(id)),
        );

        const selectedItems = cart.items.filter((item) => normalizedIds.has(Number(item.id)));
        const subtotal = selectedItems.reduce(
          (sum, item) => sum + Number(item.component?.price ?? 0) * Number(item.quantity ?? 0),
          0,
        );

        if (couponCode) {
          throw new Error("Vui lòng đăng nhập để sử dụng voucher");
        }

        return {
          subtotal,
          discountAmount: 0,
          totalAmount: subtotal,
          appliedCoupon: null,
        };
      }

      return callCartApi("/preview-pricing", {
        method: "POST",
        body: JSON.stringify({ couponCode, selectedCartItemIds }),
      });
    },
    [callCartApi, cart.items, isAuthenticated, token],
  );

  const estimateShipping = useCallback(
    async ({ addressId, shippingAddress, selectedCartItemIds, provider, paymentMethod }) => {
      if (!isAuthenticated || !token) {
        return {
          provider: provider || "GHN",
          estimatedFee: 0,
          estimatedDeliveryText: "2-4 ngày",
          totalWeightGrams: 0,
        };
      }

      return callCartApi("/shipping-estimate", {
        method: "POST",
        body: JSON.stringify({
          addressId,
          shippingAddress,
          selectedCartItemIds,
          provider,
          paymentMethod,
        }),
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
      estimateShipping,
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
      estimateShipping,
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

function normalizeGuestComponent(component) {
  const productId = Number(component?.id ?? component?.productId);
  if (!Number.isFinite(productId) || productId <= 0) {
    return null;
  }

  const price = Number(component?.price ?? 0);
  const stock = Number(component?.stock ?? component?.stockQuantity ?? 9999);

  return {
    id: productId,
    productId,
    name: String(component?.name ?? "Sản phẩm"),
    slug: String(component?.slug ?? ""),
    brand: String(component?.brand ?? component?.specifications?.brand ?? "PC Perfect"),
    image: String(component?.image ?? component?.imageUrl ?? "/images/component-placeholder.svg"),
    price: Number.isFinite(price) ? price : 0,
    stock: Number.isFinite(stock) ? stock : 9999,
  };
}

function normalizeGuestCartPayload(guestItems) {
  const items = (Array.isArray(guestItems) ? guestItems : []).map((item) => ({
    id: Number(item.id ?? item.productId),
    quantity: Math.max(1, Number(item.quantity ?? 1)),
    component: {
      id: Number(item.productId),
      slug: String(item.slug ?? ""),
      name: String(item.name ?? "Sản phẩm"),
      brand: String(item.brand ?? "PC Perfect"),
      image: String(item.image ?? "/images/component-placeholder.svg"),
      price: Number(item.price ?? 0),
      stock: Number(item.stock ?? 9999),
    },
  }));

  return {
    items,
    totalItems: items.reduce((sum, item) => sum + Number(item.quantity ?? 0), 0),
    totalPrice: items.reduce(
      (sum, item) => sum + Number(item.component?.price ?? 0) * Number(item.quantity ?? 0),
      0,
    ),
  };
}
