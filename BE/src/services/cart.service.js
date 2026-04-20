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
import { estimateShippingFromCartItems } from "./shipping.service.js";
import { payos } from "../config/payos.config.js";

function resolveFrontendBaseUrl() {
  const candidate = String(env.FE_DOMAIN ?? env.FRONTEND_URL ?? "").trim();
  if (!candidate) {
    throw new Error("Missing FE_DOMAIN for PayOS redirect");
  }

  return candidate.replace(/\/+$/, "");
}

function toPayosAmount(value) {
  const amount = Math.round(Number(value));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Invalid payable amount for PayOS");
  }

  return amount;
}

export async function previewCartPricing(userId, input = {}) {
  const cart = await ensureCart(userId);
  const cartItems = await resolveSelectedCartItems({
    cartId: cart.id,
    selectedCartItemIds: input.selectedCartItemIds,
  });
  const pricing = await buildPricingBreakdown({
    userId,
    cartItems,
    productCouponCode:
      String(input.productCouponCode ?? input.couponCode ?? "").trim().toUpperCase() || null,
    shippingCouponCode:
      String(input.shippingCouponCode ?? "").trim().toUpperCase() || null,
    shippingAddress: input.shippingAddress,
    selectedAddressId: input.addressId,
    provider: input.provider,
    paymentMethod: input.paymentMethod,
  });

  return serializeData(pricing);
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

export async function listAvailableCoupons(userId, input = {}) {
  const scope = String(input.scope ?? "PRODUCT").trim().toUpperCase();
  if (!["PRODUCT", "SHIPPING"].includes(scope)) {
    throw new Error("Invalid coupon scope");
  }

  const cart = await ensureCart(userId);
  const cartItems = await resolveSelectedCartItems({
    cartId: cart.id,
    selectedCartItemIds: input.selectedCartItemIds,
  });

  if (cartItems.length === 0) {
    return serializeData([]);
  }

  const pricing = await buildPricingBreakdown({
    userId,
    cartItems,
    shippingAddress: input.shippingAddress,
    selectedAddressId: input.addressId,
    provider: input.provider,
    paymentMethod: input.paymentMethod,
  });

  const baseAmount = scope === "PRODUCT"
    ? Number(pricing.subtotal ?? 0)
    : Number(pricing.shippingFee ?? 0);

  if (!Number.isFinite(baseAmount) || baseAmount <= 0) {
    return serializeData([]);
  }

  const now = new Date();
  const coupons = await prisma.coupon.findMany({
    where: {
      couponScope: scope,
      status: "ACTIVE",
      startDate: { lte: now },
      endDate: { gte: now },
      couponUsers: { some: { userId } },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const available = coupons
    .map((coupon) => {
      if (Number(coupon.usedCount ?? 0) >= Number(coupon.usageLimit ?? 0)) {
        return null;
      }

      const minimumOrder = Number(coupon.minOrderValue ?? 0);
      if (baseAmount < minimumOrder) {
        return null;
      }

      const rawDiscount =
        coupon.discountType === "PERCENT"
          ? (baseAmount * Number(coupon.discountValue)) / 100
          : Number(coupon.discountValue);

      const discountAmount = Math.min(baseAmount, Math.max(0, rawDiscount));
      if (!Number.isFinite(discountAmount) || discountAmount <= 0) {
        return null;
      }

      return {
        id: coupon.id,
        code: coupon.code,
        couponScope: coupon.couponScope,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        minOrderValue: coupon.minOrderValue,
        estimatedDiscountAmount: discountAmount,
        startDate: coupon.startDate,
        endDate: coupon.endDate,
      };
    })
    .filter(Boolean);

  return serializeData(available);
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
  const paymentMethodInput = String(input.paymentMethod ?? "PAYOS")
    .trim()
    .toUpperCase();
  const isPayosCheckout = paymentMethodInput === "PAYOS";
  const paymentMethod = isPayosCheckout ? PaymentMethod.VNPAY : paymentMethodInput;
  const productCouponCode = String(input.productCouponCode ?? input.couponCode ?? "")
    .trim()
    .toUpperCase();
  const shippingCouponCode = String(input.shippingCouponCode ?? "")
    .trim()
    .toUpperCase();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      address: true,
      phone: true,
      email: true,
      walletBalance: true,
      fullName: true,
    },
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
      throw new Error("Không tìm thấy địa chỉ");
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

  if (!Number.isFinite(selectedAddressId) || selectedAddressId <= 0) {
    await ensureCheckoutAddressBookEntry({
      userId,
      shippingAddress,
      phoneNumber,
      receiverName: user.fullName,
    });
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      address: shippingAddress,
      phone: phoneNumber,
    },
  });

  if (![PaymentMethod.VNPAY, PaymentMethod.COD].includes(paymentMethod)) {
    throw new Error("Unsupported payment method");
  }

  const cart = await ensureCart(userId);
  const cartItems = await resolveSelectedCartItems({
    cartId: cart.id,
    selectedCartItemIds: input.selectedCartItemIds,
  });

  if (cartItems.length === 0) {
    throw new Error("Cannot checkout an empty cart");
  }

  const pricing = await buildPricingBreakdown({
    userId,
    cartItems,
    productCouponCode: productCouponCode || null,
    shippingCouponCode: shippingCouponCode || null,
    shippingAddress,
    selectedAddressId,
    provider: input.provider,
    paymentMethod,
  });

  const subtotal = Number(pricing.subtotal ?? 0);
  const discountAmount = Number(pricing.discountAmount ?? 0);
  const shippingFee = Number(pricing.shippingFee ?? 0);
  const shippingDiscountAmount = Number(pricing.shippingDiscountAmount ?? 0);
  const totalAmount = Number(pricing.totalAmount ?? 0);
  const walletBalance = Number(user.walletBalance ?? 0);
  const walletUsedAmount = useWalletBalance ? Math.min(walletBalance, totalAmount) : 0;
  const remainingPayableAmount = Math.max(0, totalAmount - walletUsedAmount);
  const isFullyPaidByWallet = remainingPayableAmount === 0;
  const shouldReserveStockImmediately =
    isFullyPaidByWallet || paymentMethod === PaymentMethod.COD;
  const initialOrderStatus = isFullyPaidByWallet ? OrderStatus.PROCESSING : OrderStatus.PENDING;

  const result = await prisma.$transaction(async (tx) => {
    for (const item of cartItems) {
      if (item.quantity > item.product.stockQuantity) {
        throw new Error(`Insufficient stock for ${item.product.name}`);
      }
    }

    const createdOrder = await tx.order.create({
      data: {
        userId,
        couponId: pricing.appliedCoupon?.id ?? null,
        shippingCouponId: pricing.appliedShippingCoupon?.id ?? null,
        totalAmount,
        discountAmount,
        shippingFee,
        shippingDiscountAmount,
        shippingAddress,
        phoneNumber,
        paymentMethod,
        paymentStatus: isFullyPaidByWallet ? PaymentStatus.PAID : PaymentStatus.PENDING,
        orderStatus: initialOrderStatus,
        orderItems: {
          create: cartItems.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            priceAtTime: resolveEffectiveItemPrice(item),
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
        toStatus: initialOrderStatus,
        changedBy: userId,
        note: isFullyPaidByWallet
          ? "Order paid fully by wallet balance and moved to processing"
          : paymentMethod === PaymentMethod.COD
            ? "Order placed with COD and waiting for delivery"
            : isPayosCheckout
              ? "Order created and waiting for PayOS payment"
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

    if (shouldReserveStockImmediately) {
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

      const couponIdsToIncrease = [
        pricing.appliedCoupon?.id,
        pricing.appliedShippingCoupon?.id,
      ].filter((value, index, arr) => value && arr.indexOf(value) === index);

      for (const couponId of couponIdsToIncrease) {
        await tx.coupon.update({
          where: { id: couponId },
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
      paymentMethod,
      orderId: result.id,
      subtotal,
      discountAmount,
      shippingFee,
      shippingDiscountAmount,
      totalAmount: result.totalAmount,
      walletUsedAmount,
      remainingPayableAmount: 0,
      isWalletPaymentOnly: true,
    });
  }

  if (paymentMethod === PaymentMethod.COD) {
    return serializeData({
      message: "Đặt hàng COD thành công",
      paymentMethod: PaymentMethod.COD,
      orderId: result.id,
      subtotal,
      discountAmount,
      shippingFee,
      shippingDiscountAmount,
      totalAmount: result.totalAmount,
      walletUsedAmount,
      remainingPayableAmount,
      isCodOrder: true,
    });
  }

  if (isPayosCheckout) {
    const frontendBaseUrl = resolveFrontendBaseUrl();
    const payosPayment = await payos.paymentRequests.create({
      orderCode: Number(result.id),
      amount: toPayosAmount(remainingPayableAmount),
      description: `TT don #${result.id}`.slice(0, 25),
      returnUrl: `${frontendBaseUrl}/payment/success?orderId=${result.id}`,
      cancelUrl: `${frontendBaseUrl}/payment/cancel?orderId=${result.id}`,
    });

    return serializeData({
      message: "PayOS payment initialized",
      paymentMethod,
      paymentProvider: "PAYOS",
      orderId: result.id,
      subtotal,
      discountAmount,
      shippingFee,
      shippingDiscountAmount,
      totalAmount: result.totalAmount,
      walletUsedAmount,
      remainingPayableAmount,
      checkoutUrl: payosPayment?.checkoutUrl,
      paymentUrl: payosPayment?.checkoutUrl,
      qrCode: payosPayment?.qrCode ?? null,
      paymentLinkId: payosPayment?.paymentLinkId ?? null,
      payosStatus: payosPayment?.status ?? null,
      payosOrderCode: Number(result.id),
      isPayosPayment: true,
    });
  }

  if (paymentMethod === PaymentMethod.VNPAY) {
    // Generate payment code and QR (VietQR-compatible) for transfer methods.
    const paymentCode = generateMockVnpayPaymentCode();
    const transferContent = `TT DON ${result.id} ${paymentCode}`;
    const mockQrData = await createMockVnpayQrCode({
      paymentCode,
      orderId: result.id,
      amount: remainingPayableAmount,
      transferContent,
    });

    // Get user email from database
    let userEmail = user.email ?? "";
    try {
      userEmail = String(userEmail || "").trim();
    } catch (error) {
      console.error("Error fetching user email:", error);
      console.error("Lỗi khi lấy email người dùng:", error);
    }

    // Send payment code email (non-blocking)
    if (userEmail) {
      try {
        await sendPaymentCodeEmail(userEmail, {
          paymentCode: mockQrData.paymentCode,
          orderId: result.id,
          totalAmount: remainingPayableAmount,
          qrCodeDataUrl: mockQrData.qrCodeDataUrl,
          bankTransfer: mockQrData.bankTransfer,
        });
      } catch (error) {
        console.error("Không thể gửi email thanh toán:", error);
        // Don't throw - payment flow should continue even if email fails
      }
    }

    return serializeData({
      message: "Đã khởi tạo thanh toán VNPAY giả lập",
      paymentMethod,
      paymentProvider: "VNPAY",
      orderId: result.id,
      subtotal,
      discountAmount,
      shippingFee,
      shippingDiscountAmount,
      totalAmount: result.totalAmount,
      walletUsedAmount,
      remainingPayableAmount,
      paymentCode: mockQrData.paymentCode,
      qrCodeDataUrl: mockQrData.qrCodeDataUrl,
      expiresAt: mockQrData.expiresAt,
      bankTransfer: mockQrData.bankTransfer,
      isMockPayment: true,
    });
  }
}

export async function handleVnpayIpn(query) {
  const { isValidSignature, payload } = verifyVnpayCallback(query);
  if (!isValidSignature) {
    return { RspCode: "97", Message: "Checksum không hợp lệ" };
  }

  const orderId = parseOrderIdFromTxnRef(payload.vnp_TxnRef);
  if (!orderId) {
    return { RspCode: "01", Message: "Không tìm thấy đơn hàng" };
  }

  await finalizeVnpayPayment({
    orderId,
    responseCode: String(payload.vnp_ResponseCode ?? ""),
    transactionNo: payload.vnp_TransactionNo,
    payDate: payload.vnp_PayDate,
    source: "IPN",
  });

  return { RspCode: "00", Message: "Xác nhận thành công" };
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

export async function confirmMockVnpayPayment(userId, input) {
  const orderId = Number(input.orderId);
  const paymentCode = String(input.paymentCode ?? "").trim();

  if (!Number.isFinite(orderId) || orderId <= 0) {
    throw new Error("ID đơn hàng không hợp lệ");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      userId: true,
      paymentMethod: true,
      paymentStatus: true,
    },
  });

  if (!order || Number(order.userId) !== Number(userId)) {
    throw new Error("Không tìm thấy đơn hàng");
  }

  if (order.paymentMethod !== PaymentMethod.VNPAY) {
    throw new Error("Đơn hàng không thuộc phương thức chuyển khoản");
  }

  if (order.paymentStatus === PaymentStatus.PAID) {
    return serializeData({
      message: "Thanh toán đã được xác nhận",
      orderId,
      paymentStatus: PaymentStatus.PAID,
      status: "success",
    });
  }

  const finalized = await finalizeVnpayPayment({
    orderId,
    responseCode: "00",
    transactionNo: paymentCode || `MOCK-QR-${orderId}`,
    payDate: new Date().toISOString(),
    source: "QR_SCAN",
  });

  return serializeData({
    message: finalized.message,
    orderId,
    paymentStatus: finalized.isSuccess ? PaymentStatus.PAID : PaymentStatus.FAILED,
    status: finalized.isSuccess ? "success" : "failed",
  });
}

export async function estimateCartShipping(userId, input = {}) {
  const selectedAddressId = Number(input.addressId);
  const provider = String(input.provider ?? "GHN").trim().toUpperCase();
  let shippingAddress = String(input.shippingAddress ?? "").trim();

  if (Number.isFinite(selectedAddressId) && selectedAddressId > 0) {
    const savedAddress = await prisma.userAddress.findFirst({
      where: {
        id: selectedAddressId,
        userId,
      },
    });

    if (!savedAddress) {
      throw new Error("Không tìm thấy địa chỉ");
    }

    shippingAddress = savedAddress.addressLine;
  }

  const cart = await ensureCart(userId);
  const cartItems = await prisma.cartItem.findMany({
    where: {
      cartId: cart.id,
      ...(Array.isArray(input.selectedCartItemIds) && input.selectedCartItemIds.length > 0
        ? {
          id: {
            in: input.selectedCartItemIds
              .map((value) => Number(value))
              .filter((value) => Number.isFinite(value) && value > 0),
          },
        }
        : {}),
    },
    include: {
      product: {
        include: {
          category: true,
        },
      },
    },
  });

  if (cartItems.length === 0) {
    throw new Error("Không thể ước tính phí vận chuyển cho giỏ hàng trống");
  }

  return estimateShippingFromCartItems({
    provider,
    addressText: shippingAddress,
    cartItems,
    isCodOrder: String(input.paymentMethod ?? "").trim().toUpperCase() === "COD",
  });
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
    throw new Error("Không tìm thấy đơn hàng");
  }

  if (order.paymentMethod !== PaymentMethod.VNPAY) {
    return {
      isSuccess: false,
      message: "Đơn hàng không thuộc phương thức chuyển khoản",
    };
  }

  if (order.paymentStatus === PaymentStatus.PAID) {
    return {
      isSuccess: true,
      message: "Thanh toán đã được xác nhận",
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
          note: `Thanh toán VNPAY thất bại qua ${source}`,
        },
      });

      await refundWalletDebitForOrder(tx, order.id, order.userId, "Payment failed");
      await refundWalletDebitForOrder(tx, order.id, order.userId, "Thanh toán thất bại");
    });

    return {
      isSuccess: false,
      message: "Payment failed or cancelled",
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      for (const item of order.orderItems) {
        const product = await tx.product.findUnique({ where: { id: item.productId } });
        if (!product || product.stockQuantity < item.quantity) {
          throw new Error("INSUFFICIENT_STOCK_WHILE_CONFIRMING_PAYMENT");
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

      const nextOrderStatus =
        order.orderStatus === OrderStatus.PENDING ? OrderStatus.PROCESSING : order.orderStatus;

      await tx.order.update({
        where: { id: orderId },
        data: {
          paymentStatus: PaymentStatus.PAID,
          orderStatus: nextOrderStatus,
        },
      });

      const couponIdsToIncrease = [order.couponId, order.shippingCouponId].filter(
        (value, index, arr) => value && arr.indexOf(value) === index,
      );

      for (const couponId of couponIdsToIncrease) {
        await tx.coupon.update({
          where: { id: couponId },
          data: { usedCount: { increment: 1 } },
        });
      }

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          fromStatus: order.orderStatus,
          toStatus: nextOrderStatus,
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
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes("INSUFFICIENT_STOCK_WHILE_CONFIRMING_PAYMENT")
    ) {
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
            note: "Cancelled: stock changed during payment confirmation",
          },
        });

        await refundWalletDebitForOrder(
          tx,
          order.id,
          order.userId,
          "Refund wallet amount due to insufficient stock",
        );
      });

      return {
        isSuccess: false,
        message: "Payment cancelled because product is out of stock",
      };
    }

    throw error;
  }

  return {
    isSuccess: true,
    message: "Payment confirmed",
  };
}

async function refundWalletDebitForOrder(tx, orderId, userId, note) {
  const debit = await tx.walletTransaction.findFirst({
    where: {
      orderId,
      userId,
      type: WalletTransactionType.PAYMENT_DEBIT,
    },
    orderBy: { id: "desc" },
  });

  if (!debit) {
    return;
  }

  const amount = Number(debit.amount ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return;
  }

  await tx.user.update({
    where: { id: userId },
    data: {
      walletBalance: {
        increment: amount,
      },
    },
  });

  await tx.walletTransaction.create({
    data: {
      userId,
      orderId,
      amount,
      type: WalletTransactionType.REFUND_CREDIT,
      note: note || `Refund wallet for cancelled order #${orderId}`,
    },
  });
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

async function ensureCheckoutAddressBookEntry({
  userId,
  shippingAddress,
  phoneNumber,
  receiverName,
}) {
  const normalizedAddress = String(shippingAddress ?? "").trim();
  const normalizedPhone = String(phoneNumber ?? "").trim();

  if (!normalizedAddress || !normalizedPhone) {
    return null;
  }

  const existed = await prisma.userAddress.findFirst({
    where: {
      userId,
      phoneNumber: normalizedPhone,
      addressLine: normalizedAddress,
    },
  });

  if (existed) {
    return existed;
  }

  const hasAddress = await prisma.userAddress.count({
    where: { userId },
  });

  return prisma.userAddress.create({
    data: {
      userId,
      label: "Checkout",
      receiverName: normalizeReceiverNameForAddress(receiverName),
      phoneNumber: normalizedPhone,
      addressLine: normalizedAddress,
      isDefault: hasAddress === 0,
    },
  });
}

function normalizeReceiverNameForAddress(value) {
  const normalized = String(value ?? "").trim();
  if (normalized.length >= 2) {
    return normalized;
  }

  return "Khach hang";
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
      price: resolveEffectiveItemPrice(item),
      basePrice: Number(item.product.price ?? 0),
      salePrice: item.product.salePrice,
      saleStartAt: item.product.saleStartAt,
      saleEndAt: item.product.saleEndAt,
      stockQuantity: item.product.stockQuantity,
      imageUrl: item.product.images?.[0]?.imageUrl ?? "/images/component-placeholder.svg",
      category: item.product.category,
      specifications: item.product.specifications,
    },
    lineTotal: resolveEffectiveItemPrice(item) * item.quantity,
  }));

  return {
    id: cart?.id,
    items,
    totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
    totalPrice: items.reduce((sum, item) => sum + item.lineTotal, 0),
  };
}

function resolveEffectiveItemPrice(item, now = new Date()) {
  const basePrice = Number(item?.product?.price ?? 0);
  const salePrice =
    item?.product?.salePrice === null || item?.product?.salePrice === undefined
      ? null
      : Number(item.product.salePrice);
  const saleStartAt = item?.product?.saleStartAt ? new Date(item.product.saleStartAt) : null;
  const saleEndAt = item?.product?.saleEndAt ? new Date(item.product.saleEndAt) : null;

  const hasSalePrice = Number.isFinite(salePrice) && salePrice > 0 && salePrice < basePrice;
  const inSaleWindow = (!saleStartAt || now >= saleStartAt) && (!saleEndAt || now <= saleEndAt);

  if (hasSalePrice && inSaleWindow) {
    return salePrice;
  }

  return basePrice;
}

async function buildPricingBreakdown({
  userId,
  cartItems,
  productCouponCode = null,
  shippingCouponCode = null,
  shippingAddress = "",
  selectedAddressId,
  provider,
  paymentMethod,
}) {
  const subtotal = (Array.isArray(cartItems) ? cartItems : []).reduce(
    (sum, item) => sum + resolveEffectiveItemPrice(item) * item.quantity,
    0,
  );

  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    return {
      subtotal,
      discountAmount: 0,
      shippingFee: 0,
      shippingDiscountAmount: 0,
      totalAmount: subtotal,
      appliedCoupon: null,
      appliedShippingCoupon: null,
    };
  }

  let resolvedShippingAddress = String(shippingAddress ?? "").trim();

  if (!resolvedShippingAddress && Number.isFinite(Number(selectedAddressId)) && Number(selectedAddressId) > 0) {
    const savedAddress = await prisma.userAddress.findFirst({
      where: {
        id: Number(selectedAddressId),
        userId,
      },
    });

    if (savedAddress) {
      resolvedShippingAddress = String(savedAddress.addressLine ?? "").trim();
    }
  }

  const shippingEstimate = estimateShippingFromCartItems({
    provider,
    addressText: resolvedShippingAddress,
    cartItems,
    isCodOrder: String(paymentMethod ?? "").trim().toUpperCase() === "COD",
  });

  const shippingFee = Number(shippingEstimate?.estimatedFee ?? 0);
  const productCouponResolved = productCouponCode
    ? await resolveCouponOrThrow({
      code: productCouponCode,
      scope: "PRODUCT",
      userId,
      baseAmount: subtotal,
    })
    : null;

  const shippingCouponResolved = shippingCouponCode
    ? await resolveCouponOrThrow({
      code: shippingCouponCode,
      scope: "SHIPPING",
      userId,
      baseAmount: shippingFee,
    })
    : null;

  const discountAmount = Number(productCouponResolved?.discountAmount ?? 0);
  const shippingDiscountAmount = Number(shippingCouponResolved?.discountAmount ?? 0);
  const totalAmount = Math.max(0, subtotal - discountAmount + Math.max(0, shippingFee - shippingDiscountAmount));

  return {
    subtotal,
    discountAmount,
    shippingFee,
    shippingDiscountAmount,
    totalAmount,
    appliedCoupon: productCouponResolved
      ? {
        id: productCouponResolved.coupon.id,
        code: productCouponResolved.coupon.code,
        discountType: productCouponResolved.coupon.discountType,
        discountValue: productCouponResolved.coupon.discountValue,
      }
      : null,
    appliedShippingCoupon: shippingCouponResolved
      ? {
        id: shippingCouponResolved.coupon.id,
        code: shippingCouponResolved.coupon.code,
        discountType: shippingCouponResolved.coupon.discountType,
        discountValue: shippingCouponResolved.coupon.discountValue,
      }
      : null,
  };
}

async function resolveCouponOrThrow({ code, scope, userId, baseAmount }) {
  const coupon = await prisma.coupon.findUnique({
    where: { code: String(code ?? "").trim().toUpperCase() },
    include: {
      couponUsers: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!coupon) {
    throw new Error("Voucher not found");
  }

  if (String(coupon.couponScope ?? "PRODUCT").toUpperCase() !== String(scope ?? "PRODUCT")) {
    throw new Error("Voucher scope mismatch");
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

  if (
    !Array.isArray(coupon.couponUsers) ||
    coupon.couponUsers.length === 0 ||
    !coupon.couponUsers.some((item) => Number(item.userId) === Number(userId))
  ) {
    throw new Error("Bạn không được phép sử dụng voucher này");
  }

  const minimumOrder = Number(coupon.minOrderValue ?? 0);
  if (baseAmount < minimumOrder) {
    throw new Error(`Order must be at least ${minimumOrder} to use this voucher`);
  }

  const rawDiscount =
    coupon.discountType === "PERCENT"
      ? (baseAmount * Number(coupon.discountValue)) / 100
      : Number(coupon.discountValue);
  const discountAmount = Math.min(baseAmount, Math.max(0, rawDiscount));

  return {
    coupon,
    discountAmount,
  };
}
