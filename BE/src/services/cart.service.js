import {
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  WalletTransactionType,
} from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { serializeData } from "../utils/serialize.js";
import { normalizeAndValidatePhoneNumber } from "../utils/validation.js";
import {
  parseOrderIdFromTxnRef,
  verifyVnpayCallback,
  generateMockVnpayPaymentCode,
  createMockVnpayQrCode,
} from "./vnpay.service.js";
import { sendPaymentCodeEmail } from "./email.service.js";
import { env } from "../config/env.js";

export async function previewCartPricing(userId, input = {}) {
  const couponCode = String(input.couponCode ?? "").trim().toUpperCase();
  const cart = await ensureCart(userId);
  const cartItems = await resolveSelectedCartItems({
    cartId: cart.id,
    selectedCartItemIds: input.selectedCartItemIds,
  });

  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );

  if (cartItems.length === 0) {
    return serializeData({
      subtotal,
      discountAmount: 0,
      totalAmount: subtotal,
      appliedCoupon: null,
    });
  }

  if (!couponCode) {
    return serializeData({
      subtotal,
      discountAmount: 0,
      totalAmount: subtotal,
      appliedCoupon: null,
    });
  }

  const applied = await resolveCouponOrThrow(couponCode, subtotal);

  return serializeData({
    subtotal,
    discountAmount: applied.discountAmount,
    totalAmount: Math.max(0, subtotal - applied.discountAmount),
    appliedCoupon: {
      id: applied.coupon.id,
      code: applied.coupon.code,
      discountType: applied.coupon.discountType,
      discountValue: applied.coupon.discountValue,
    },
  });
}

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
  const selectedAddressId = Number(input.addressId);
  let shippingAddress = String(input.shippingAddress ?? "").trim();
  let phoneNumber = String(input.phoneNumber ?? "").trim();
  const useWalletBalance = input.useWalletBalance !== false;
  const paymentMethod = String(input.paymentMethod ?? PaymentMethod.VNPAY)
    .trim()
    .toUpperCase();
  const couponCode = String(input.couponCode ?? "").trim().toUpperCase();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { address: true, phone: true, email: true, walletBalance: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  if (Number.isFinite(selectedAddressId) && selectedAddressId > 0) {
    const savedAddress = await prisma.userAddress.findFirst({
      where: {
        id: selectedAddressId,
        userId,
      },
    });

    if (!savedAddress) {
      throw new Error("Address not found");
    }

    shippingAddress = savedAddress.addressLine;
    phoneNumber = savedAddress.phoneNumber;
  } else {
    if (!shippingAddress) {
      shippingAddress = String(user.address ?? "").trim();
    }
    if (!phoneNumber) {
      phoneNumber = String(user.phone ?? "").trim();
    }
  }

  if (!shippingAddress) {
    throw new Error("Shipping address is required");
  }

  if (!phoneNumber) {
    throw new Error("Phone number is required");
  }

  phoneNumber = normalizeAndValidatePhoneNumber(phoneNumber, {
    required: true,
    fieldLabel: "Phone number",
  });

  if (paymentMethod !== PaymentMethod.VNPAY) {
    throw new Error("Only VNPAY transfer payment is supported");
  }

  const cart = await ensureCart(userId);
  const cartItems = await resolveSelectedCartItems({
    cartId: cart.id,
    selectedCartItemIds: input.selectedCartItemIds,
  });

  if (cartItems.length === 0) {
    throw new Error("Cannot checkout an empty cart");
  }

  const subtotal = cartItems.reduce(
    (sum, item) => sum + Number(item.product.price) * item.quantity,
    0,
  );

  const couponResolved = couponCode
    ? await resolveCouponOrThrow(couponCode, subtotal)
    : null;
  const discountAmount = couponResolved?.discountAmount ?? 0;
  const totalAmount = Math.max(0, subtotal - discountAmount);
  const walletBalance = Number(user.walletBalance ?? 0);
  const walletUsedAmount = useWalletBalance ? Math.min(walletBalance, totalAmount) : 0;
  const remainingPayableAmount = Math.max(0, totalAmount - walletUsedAmount);
  const isFullyPaidByWallet = remainingPayableAmount === 0;

  const result = await prisma.$transaction(async (tx) => {
    for (const item of cartItems) {
      if (item.quantity > item.product.stockQuantity) {
        throw new Error(`Insufficient stock for ${item.product.name}`);
      }
    }

    const createdOrder = await tx.order.create({
      data: {
        userId,
        couponId: couponResolved?.coupon.id ?? null,
        totalAmount,
        discountAmount,
        shippingAddress,
        phoneNumber,
        paymentMethod,
        paymentStatus: isFullyPaidByWallet ? PaymentStatus.PAID : PaymentStatus.PENDING,
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
        note: isFullyPaidByWallet
          ? "Order paid fully by wallet balance"
          : "Order created and waiting for VNPAY payment",
      },
    });

    if (walletUsedAmount > 0) {
      await tx.user.update({
        where: { id: userId },
        data: {
          walletBalance: {
            decrement: walletUsedAmount,
          },
        },
      });

      await tx.walletTransaction.create({
        data: {
          userId,
          orderId: createdOrder.id,
          amount: walletUsedAmount,
          type: WalletTransactionType.PAYMENT_DEBIT,
          note: `Wallet used for order #${createdOrder.id}`,
        },
      });
    }

    if (isFullyPaidByWallet) {
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

      if (couponResolved?.coupon.id) {
        await tx.coupon.update({
          where: { id: couponResolved.coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      await removePurchasedCartItems(tx, cart.id, cartItems);
    }

    return createdOrder;
  });

  if (isFullyPaidByWallet) {
    return serializeData({
      message: "Order paid successfully using wallet balance",
      paymentMethod: PaymentMethod.VNPAY,
      orderId: result.id,
      subtotal,
      discountAmount,
      totalAmount: result.totalAmount,
      walletUsedAmount,
      remainingPayableAmount: 0,
      isWalletPaymentOnly: true,
    });
  }

  if (paymentMethod === PaymentMethod.VNPAY) {
    // Generate mock VNPAY payment code and QR
    const paymentCode = generateMockVnpayPaymentCode();
    const mockQrData = await createMockVnpayQrCode({
      paymentCode,
      orderId: result.id,
      amount: remainingPayableAmount,
    });

    // Get user email from database
    let userEmail = user.email ?? "";
    try {
      userEmail = String(userEmail || "").trim();
    } catch (error) {
      console.error("Error fetching user email:", error);
    }

    // Send payment code email (non-blocking)
    if (userEmail) {
      try {
        await sendPaymentCodeEmail(userEmail, {
          paymentCode: mockQrData.paymentCode,
          orderId: result.id,
          totalAmount: remainingPayableAmount,
          qrCodeDataUrl: mockQrData.qrCodeDataUrl,
        });
      } catch (error) {
        console.error("Failed to send payment email:", error);
        // Don't throw - payment flow should continue even if email fails
      }
    }

    return serializeData({
      message: "Mock VNPAY payment initialized",
      paymentMethod: PaymentMethod.VNPAY,
      orderId: result.id,
      subtotal,
      discountAmount,
      totalAmount: result.totalAmount,
      walletUsedAmount,
      remainingPayableAmount,
      paymentCode: mockQrData.paymentCode,
      qrCodeDataUrl: mockQrData.qrCodeDataUrl,
      expiresAt: mockQrData.expiresAt,
      isMockPayment: true,
    });
  }
}

export async function handleVnpayIpn(query) {
  const { isValidSignature, payload } = verifyVnpayCallback(query);
  if (!isValidSignature) {
    return { RspCode: "97", Message: "Invalid checksum" };
  }

  const orderId = parseOrderIdFromTxnRef(payload.vnp_TxnRef);
  if (!orderId) {
    return { RspCode: "01", Message: "Order not found" };
  }

  await finalizeVnpayPayment({
    orderId,
    responseCode: String(payload.vnp_ResponseCode ?? ""),
    transactionNo: payload.vnp_TransactionNo,
    payDate: payload.vnp_PayDate,
    source: "IPN",
  });

  return { RspCode: "00", Message: "Confirm Success" };
}

export async function handleVnpayReturn(query) {
  const { isValidSignature, payload } = verifyVnpayCallback(query);

  if (!isValidSignature) {
    return {
      ok: false,
      redirectUrl: `${env.FRONTEND_URL}/payment-result?status=invalid-signature`,
    };
  }

  const orderId = parseOrderIdFromTxnRef(payload.vnp_TxnRef);
  if (!orderId) {
    return {
      ok: false,
      redirectUrl: `${env.FRONTEND_URL}/payment-result?status=order-not-found`,
    };
  }

  const finalized = await finalizeVnpayPayment({
    orderId,
    responseCode: String(payload.vnp_ResponseCode ?? ""),
    transactionNo: payload.vnp_TransactionNo,
    payDate: payload.vnp_PayDate,
    source: "RETURN",
  });

  const status = finalized.isSuccess ? "success" : "failed";
  const reason = encodeURIComponent(finalized.message);
  const transactionNo = encodeURIComponent(String(payload.vnp_TransactionNo ?? ""));

  return {
    ok: finalized.isSuccess,
    redirectUrl:
      `${env.FRONTEND_URL}/payment-result?status=${status}` +
      `&orderId=${orderId}` +
      `&txnNo=${transactionNo}` +
      `&message=${reason}`,
  };
}

async function finalizeVnpayPayment({
  orderId,
  responseCode,
  transactionNo,
  payDate,
  source,
}) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: true,
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  if (order.paymentMethod !== PaymentMethod.VNPAY) {
    return {
      isSuccess: false,
      message: "Order is not VNPAY payment",
    };
  }

  if (order.paymentStatus === PaymentStatus.PAID) {
    return {
      isSuccess: true,
      message: "Payment already confirmed",
    };
  }

  const isSuccess = responseCode === "00";

  if (!isSuccess) {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.FAILED,
          orderStatus: OrderStatus.CANCELLED,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.orderStatus,
          toStatus: OrderStatus.CANCELLED,
          changedBy: order.userId,
          note: `VNPAY payment failed via ${source}`,
        },
      });
    });

    return {
      isSuccess: false,
      message: "Payment failed or cancelled",
    };
  }

  await prisma.$transaction(async (tx) => {
    for (const item of order.orderItems) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product || product.stockQuantity < item.quantity) {
        throw new Error("Insufficient stock while confirming payment");
      }
    }

    for (const item of order.orderItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stockQuantity: {
            decrement: item.quantity,
          },
        },
      });
    }

    await tx.order.update({
      where: { id: orderId },
      data: {
        paymentStatus: PaymentStatus.PAID,
      },
    });

    if (order.couponId) {
      await tx.coupon.update({
        where: { id: order.couponId },
        data: { usedCount: { increment: 1 } },
      });
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.orderStatus,
        toStatus: order.orderStatus,
        changedBy: order.userId,
        note: `VNPAY confirmed via ${source}. TxnNo=${transactionNo ?? ""} PayDate=${payDate ?? ""}`,
      },
    });

    const cart = await tx.cart.findUnique({ where: { userId: order.userId } });
    if (cart) {
      const currentCartItems = await tx.cartItem.findMany({
        where: { cartId: cart.id },
        include: { product: true },
      });
      const orderItemByProductId = new Map(
        order.orderItems.map((item) => [Number(item.productId), Number(item.quantity)]),
      );

      for (const cartItem of currentCartItems) {
        const purchasedQuantity = orderItemByProductId.get(Number(cartItem.productId));
        if (!purchasedQuantity) {
          continue;
        }

        if (cartItem.quantity > purchasedQuantity) {
          await tx.cartItem.update({
            where: { id: cartItem.id },
            data: {
              quantity: cartItem.quantity - purchasedQuantity,
            },
          });
          continue;
        }

        await tx.cartItem.delete({ where: { id: cartItem.id } });
      }
    }
  });

  return {
    isSuccess: true,
    message: "Payment confirmed",
  };
}

async function ensureCart(userId) {
  return prisma.cart.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });
}

async function resolveSelectedCartItems({ cartId, selectedCartItemIds }) {
  const isSelectionProvided = Array.isArray(selectedCartItemIds);

  if (isSelectionProvided && selectedCartItemIds.length === 0) {
    return [];
  }

  const normalizedIds = isSelectionProvided
    ? Array.from(
        new Set(
          selectedCartItemIds
            .map((value) => Number(value))
            .filter((value) => Number.isFinite(value) && value > 0),
        ),
      )
    : [];

  if (isSelectionProvided && normalizedIds.length === 0) {
    return [];
  }

  return prisma.cartItem.findMany({
    where: {
      cartId,
      ...(normalizedIds.length > 0 ? { id: { in: normalizedIds } } : {}),
    },
    include: { product: true },
  });
}

async function removePurchasedCartItems(tx, cartId, purchasedCartItems) {
  if (!Array.isArray(purchasedCartItems) || purchasedCartItems.length === 0) {
    return;
  }

  await tx.cartItem.deleteMany({
    where: {
      cartId,
      id: {
        in: purchasedCartItems.map((item) => item.id),
      },
    },
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
      imageUrl: item.product.images?.[0]?.imageUrl ?? "/images/component-placeholder.svg",
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

async function resolveCouponOrThrow(code, orderSubtotal) {
  const coupon = await prisma.coupon.findUnique({
    where: { code },
  });

  if (!coupon) {
    throw new Error("Voucher not found");
  }

  const now = new Date();
  if (coupon.status !== "ACTIVE") {
    throw new Error("Voucher is not active");
  }

  if (now < coupon.startDate || now > coupon.endDate) {
    throw new Error("Voucher is out of date");
  }

  if (coupon.usedCount >= coupon.usageLimit) {
    throw new Error("Voucher usage limit reached");
  }

  const minimumOrder = Number(coupon.minOrderValue ?? 0);
  if (orderSubtotal < minimumOrder) {
    throw new Error(`Order must be at least ${minimumOrder} to use this voucher`);
  }

  const rawDiscount =
    coupon.discountType === "PERCENT"
      ? (orderSubtotal * Number(coupon.discountValue)) / 100
      : Number(coupon.discountValue);
  const discountAmount = Math.min(orderSubtotal, Math.max(0, rawDiscount));

  return {
    coupon,
    discountAmount,
  };
}
