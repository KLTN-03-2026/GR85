import React, { createContext, useContext, useState, useCallback } from "react";

const CartContext = createContext(undefined);

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addToCart = useCallback((component, isUsed = false) => {
    setItems((prev) => {
      const existingItem = prev.find(
        (item) => item.component.id === component.id && item.isUsed === isUsed,
      );
      if (existingItem) {
        return prev.map((item) =>
          item.component.id === component.id && item.isUsed === isUsed
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [...prev, { component, quantity: 1, isUsed }];
    });
  }, []);

  const removeFromCart = useCallback((componentId) => {
    setItems((prev) =>
      prev.filter((item) => item.component.id !== componentId),
    );
  }, []);

  const updateQuantity = useCallback(
    (componentId, quantity) => {
      if (quantity <= 0) {
        removeFromCart(componentId);
        return;
      }
      setItems((prev) =>
        prev.map((item) =>
          item.component.id === componentId ? { ...item, quantity } : item,
        ),
      );
    },
    [removeFromCart],
  );

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = items.reduce((sum, item) => {
    const price =
      item.isUsed && item.component.usedPrice
        ? item.component.usedPrice
        : item.component.price;
    return sum + price * item.quantity;
  }, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
