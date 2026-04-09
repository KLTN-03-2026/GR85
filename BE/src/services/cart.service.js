import { OrderStatus, PaymentMethod, PaymentStatus } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { serializeData } from "../utils/serialize.js";

export async function getMyCart(userId) {
  const cart = await ensureCart(userId);
  const hydrated = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: {
      cartItems: {
        include: {
          product: {
            include: {
              category: true,
              images: {
                orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
                take: 1,
              },
            },
          },
        },
      },
    },
  });

  return serializeData(mapCartPayload(hydrated));
}

export async function addItemToCart(userId, input) {
  const productId = Number(input.productId);
  const quantity = Number(input.quantity ?? 1);

  if (!Number.isFinite(productId) || productId <= 0) {
    throw new Error("Invalid product id");
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantity must be greater than 0");
  }

  const [cart, product] = await Promise.all([
    ensureCart(userId),
    prisma.product.findUnique({ where: { id: productId } }),
  ]);

  if (!product) {
    throw new Error("Product not found");
  }

  const existingItem = await prisma.cartItem.findFirst({
    where: { cartId: cart.id, productId },
  });

  const nextQuantity = (existingItem?.quantity ?? 0) + quantity;
  if (nextQuantity > product.stockQuantity) {
    throw new Error("Quantity exceeds current stock");
  }

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: nextQuantity },
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId,
        quantity,
      },
    });
  }

  return getMyCart(userId);
}

export async function updateCartItemQuantity(userId, cartItemId, quantityInput) {
  const itemId = Number(cartItemId);
  const quantity = Number(quantityInput);

  if (!Number.isFinite(itemId) || itemId <= 0) {
    throw new Error("Invalid cart item id");
  }

  const cart = await ensureCart(userId);
  const cartItem = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
    include: { product: true },
  });

  if (!cartItem) {
    throw new Error("Cart item not found");
  }

  if (!Number.isFinite(quantity) || quantity <= 0) {
    await prisma.cartItem.delete({ where: { id: itemId } });
    return getMyCart(userId);
  }

  if (quantity > cartItem.product.stockQuantity) {
    throw new Error("Quantity exceeds current stock");
  }

  await prisma.cartItem.update({
    where: { id: itemId },
    data: { quantity },
  });

  return getMyCart(userId);
}

export async function removeCartItem(userId, cartItemId) {
  const itemId = Number(cartItemId);
  if (!Number.isFinite(itemId) || itemId <= 0) {
    throw new Error("Invalid cart item id");
  }

  const cart = await ensureCart(userId);
  const cartItem = await prisma.cartItem.findFirst({
    where: { id: itemId, cartId: cart.id },
  });

  if (!cartItem) {
    throw new Error("Cart item not found");
  }

  await prisma.cartItem.delete({ where: { id: itemId } });
  return getMyCart(userId);
}

export async function checkoutCart(userId, input) {
  const shippingAddress = String(input.shippingAddress ?? "").trim();
  const phoneNumber = String(input.phoneNumber ?? "").trim();

  if (!shippingAddress) {
    throw new Error("Shipping address is required");
  }

  if (!phoneNumber) {
    throw new Error("Phone number is required");
  }

  const cart = await ensureCart(userId);
  const cartItems = await prisma.cartItem.findMany({
    where: { cartId: cart.id },
    include: { product: true },
  });

  if (cartItems.length === 0) {
    throw new Error("Cannot checkout an empty cart");
  }

  const totalAmount = cartItems.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );

  const result = await prisma.$transaction(async (tx) => {
    for (const item of cartItems) {
      if (item.quantity > item.product.stockQuantity) {
        throw new Error(`Insufficient stock for ${item.product.name}`);
      }
    }

    const createdOrder = await tx.order.create({
      data: {
        userId,
        totalAmount,
        discountAmount: 0,
        shippingAddress,
        phoneNumber,
        paymentMethod: PaymentMethod.COD,
        paymentStatus: PaymentStatus.PAID,
        orderStatus: OrderStatus.PENDING,
        orderItems: {
          create: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            priceAtTime: item.product.price,
          })),
        },
      },
      include: {
        orderItems: true,
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: createdOrder.id,
        fromStatus: OrderStatus.PENDING,
        toStatus: OrderStatus.PENDING,
        changedBy: userId,
        note: "Order created from checkout",
      },
    });

    for (const item of cartItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

    return createdOrder;
  });

  return serializeData({
    message: "Checkout successful",
    orderId: result.id,
    totalAmount: result.totalAmount,
  });
}

async function ensureCart(userId) {
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

function mapCartPayload(cart) {
  const items = (cart?.cartItems ?? []).map((item) => ({
    id: item.id,
    quantity: item.quantity,
    productId: item.productId,
    product: {
      id: item.product.id,
      name: item.product.name,
      slug: item.product.slug,
      productCode: item.product.slug,
      price: item.product.price,
      stockQuantity: item.product.stockQuantity,
      imageUrl: item.product.images?.[0]?.imageUrl ?? "/robots.txt",
      category: item.product.category,
      specifications: item.product.specifications,
    },
    lineTotal: Number(item.product.price) * item.quantity,
  }));

  return {
    id: cart?.id,
    items,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: items.reduce((sum, item) => sum + item.lineTotal, 0),
  };
}
