import { prisma } from "../../db/prisma.js";
import { payos } from "../../config/payos.config.js";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { createSystemNotification } from "../../services/notification.service.js";

function buildFrontendBaseUrl() {
  const baseUrl = String(process.env.FE_DOMAIN ?? "").trim();

  if (!baseUrl) {
    throw new Error("FE_DOMAIN is required");
  }

  return baseUrl.replace(/\/+$/, "");
}

function toSafeAmount(value) {
  const amount = Math.round(Number(value));

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Số tiền đơn hàng không hợp lệ");
  }

  return amount;
}

export async function createPaymentLink(req, res) {
  try {
    const orderId = Number(req.body?.orderId);

    if (!Number.isFinite(orderId)) {
      return res.status(400).json({ message: "orderId không hợp lệ" });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        totalAmount: true,
      },
    });

    if (!order) {
      return res.status(404).json({ message: "Không tìm thấy đơn hàng" });
    }

    const frontendBaseUrl = buildFrontendBaseUrl();

    const paymentLinkData = {
      orderCode: Number(order.id),
      amount: toSafeAmount(order.totalAmount),
      description: `Thanh toan don #${order.id}`.slice(0, 25),
      returnUrl: `${frontendBaseUrl}/payment/success?orderId=${order.id}`,
      cancelUrl: `${frontendBaseUrl}/payment/cancel?orderId=${order.id}`,
    };

    const paymentLink = await payos.paymentRequests.create(paymentLinkData);

    return res.status(200).json({
      checkoutUrl: paymentLink?.checkoutUrl,
    });
  } catch (error) {
    console.error("[PayOS] Lỗi createPaymentLink:", error);
    return res.status(500).json({ message: "Không thể tạo link thanh toán" });
  }
}

async function markOrderPaid(orderId, note) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      orderItems: true,
    },
  });

  if (!order) {
    throw new Error("Không tìm thấy đơn hàng");
  }

  if (order.paymentStatus === PaymentStatus.PAID) {
    return order;
  }

  await prisma.$transaction(async (tx) => {
    for (const item of order.orderItems) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (!product || product.stockQuantity < item.quantity) {
        throw new Error("Không đủ tồn kho khi xác nhận thanh toán PayOS");
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

    const couponIdsToIncrease = [order.couponId, order.shippingCouponId]
      .filter((value, index, arr) => Number.isFinite(Number(value)) && arr.indexOf(value) === index);

    for (const couponId of couponIdsToIncrease) {
      await tx.coupon.update({
        where: { id: Number(couponId) },
        data: {
          usedCount: {
            increment: 1,
          },
        },
      });
    }

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: order.orderStatus,
        toStatus: nextOrderStatus,
        changedBy: order.userId,
        note,
      },
    });

    const cart = await tx.cart.findUnique({ where: { userId: order.userId } });
    if (cart) {
      const currentCartItems = await tx.cartItem.findMany({
        where: { cartId: cart.id },
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

  console.info(`[PayOS] order=${orderId} paid`);
  await createSystemNotification({
    userId: order.userId,
    title: "Thanh toán thành công",
    message: "Thanh toán QR thành công. Đơn hàng đang được xử lý.",
    payload: {
      orderId,
      paymentMethod: "QR",
      paymentStatus: PaymentStatus.PAID,
      orderStatus: OrderStatus.PROCESSING,
    },
  });
}

async function markOrderFailed(orderId, note) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    throw new Error("Không tìm thấy đơn hàng");
  }

  if (order.paymentStatus === PaymentStatus.PAID) {
    return;
  }

  if (order.orderStatus === OrderStatus.CANCELLED && order.paymentStatus === PaymentStatus.FAILED) {
    return;
  }

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
        note,
      },
    });
  });

  console.info(`[PayOS] order=${orderId} failed`);
  await createSystemNotification({
    userId: order.userId,
    title: "Thanh toán chưa thành công",
    message: "Thanh toán QR chưa thành công. Đơn hàng đã chuyển sang trạng thái hủy.",
    payload: {
      orderId,
      paymentMethod: "QR",
      paymentStatus: PaymentStatus.FAILED,
      orderStatus: OrderStatus.CANCELLED,
    },
  });
}

async function getPayosPaymentInfo(orderId) {
  try {
    const paymentInfo = await payos.paymentRequests.get(orderId);
    return { paymentInfo, errorCode: null };
  } catch (error) {
    if (error instanceof Error) {
      const payosCode = String(error?.code ?? "");
      if (payosCode === "101") {
        return { paymentInfo: null, errorCode: "101" };
      }
    }

    throw error;
  }
}

async function syncOrderWithPayos(orderId, source) {
  const { paymentInfo, errorCode } = await getPayosPaymentInfo(orderId);

  if (!paymentInfo) {
    return {
      success: false,
      status: errorCode === "101" ? "NOT_FOUND" : "UNKNOWN",
      transactionNo: null,
      checkoutUrl: null,
      qrCode: null,
    };
  }

  const status = String(paymentInfo?.status ?? "").toUpperCase();

  if (status === "PAID") {
    await markOrderPaid(
      orderId,
      `PayOS confirmed via ${source}. LinkId=${paymentInfo?.id ?? paymentInfo?.paymentLinkId ?? ""}`,
    );

    return {
      success: true,
      status,
      transactionNo: paymentInfo?.id ?? paymentInfo?.paymentLinkId ?? null,
      checkoutUrl: paymentInfo?.checkoutUrl ?? null,
      qrCode: paymentInfo?.qrCode ?? null,
    };
  }

  if (["CANCELLED", "EXPIRED", "FAILED"].includes(status)) {
    await markOrderFailed(orderId, `PayOS ${status} via ${source}`);
  }

  return {
    success: false,
    status,
    transactionNo: paymentInfo?.id ?? paymentInfo?.paymentLinkId ?? null,
    checkoutUrl: paymentInfo?.checkoutUrl ?? null,
    qrCode: paymentInfo?.qrCode ?? null,
  };
}

export async function getPayosStatus(req, res) {
  try {
    const orderId = Number(req.query?.orderId ?? req.body?.orderId);
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "orderId không hợp lệ" });
    }

    const statusPayload = await syncOrderWithPayos(orderId, "status-polling");

    return res.status(200).json({
      ...statusPayload,
      orderId,
    });
  } catch (error) {
    console.error("[PayOS] Lỗi getPayosStatus:", error);
    return res.status(500).json({ message: "Không thể lấy trạng thái thanh toán" });
  }
}

export async function confirmPayosReturn(req, res) {
  try {
    const orderId = Number(req.query?.orderId ?? req.body?.orderId);

    if (!Number.isFinite(orderId) || orderId <= 0) {
      return res.status(400).json({ message: "orderId không hợp lệ" });
    }

    const statusPayload = await syncOrderWithPayos(orderId, "return");
    return res.status(200).json({
      ...statusPayload,
      orderId,
    });
  } catch (error) {
    console.error("[PayOS] Lỗi confirmPayosReturn:", error);

    return res.status(500).json({ message: "Không thể xác nhận trạng thái thanh toán" });
  }
}

export async function receiveWebhook(req, res) {
  try {
    // Bắt buộc verify chữ ký webhook trước khi xử lý
    const verifiedData = await payos.webhooks.verify(req.body);
    const orderCode = Number(verifiedData?.orderCode);

    if (!Number.isFinite(orderCode)) {
      return res.status(400).json({ message: "orderCode không hợp lệ" });
    }

    const responseCode = String(verifiedData?.code ?? "");
    if (responseCode === "00") {
      await markOrderPaid(Number(orderCode), `PayOS confirmed via webhook. Ref=${verifiedData?.reference ?? ""}`);
    } else {
      await markOrderFailed(Number(orderCode), `PayOS webhook failed with code ${responseCode}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("[PayOS] Lỗi receiveWebhook:", error);
    return res.status(400).json({ success: false, message: "Webhook không hợp lệ" });
  }
}
