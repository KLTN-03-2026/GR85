import { OrderStatus, PaymentStatus } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { serializeData } from "../utils/serialize.js";
import { createOrderStatusChangeNotification } from "./notification.service.js";

const ALLOWED_STATUS_TRANSITIONS = new Set([
  OrderStatus.PENDING,
  OrderStatus.PROCESSING,
  OrderStatus.SHIPPING,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
]);

export async function listOrdersForAdmin() {
  await syncPaidPendingOrdersToProcessing();

  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: true,
      orderItems: {
        include: {
          product: true,
        },
      },
    },
  });

  return serializeData(
    orders.map((order) => ({
      id: order.id,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      totalAmount: order.totalAmount,
      discountAmount: order.discountAmount,
      shippingAddress: order.shippingAddress,
      phoneNumber: order.phoneNumber,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      customer: {
        id: order.user.id,
        fullName: order.user.fullName,
        email: order.user.email,
      },
      itemCount: order.orderItems.reduce((sum, item) => sum + item.quantity, 0),
    })),
  );
}

export async function getOrderDetailForAdmin(orderId) {
  await syncPaidPendingOrdersToProcessing();

  const id = Number(orderId);
  if (!Number.isFinite(id)) {
    throw new Error("Invalid order id");
  }

  const order = await prisma.order.findUnique({
    where: { id },
    include: {
      user: true,
      orderItems: {
        include: {
          product: {
            include: {
              images: {
                orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
                take: 1,
              },
            },
          },
        },
      },
      statusHistories: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) {
    throw new Error("Order not found");
  }

  return serializeData({
    id: order.id,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    totalAmount: order.totalAmount,
    discountAmount: order.discountAmount,
    shippingAddress: order.shippingAddress,
    phoneNumber: order.phoneNumber,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customer: {
      id: order.user.id,
      fullName: order.user.fullName,
      email: order.user.email,
      phone: order.user.phone,
    },
    items: order.orderItems.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      priceAtTime: item.priceAtTime,
      lineTotal: Number(item.priceAtTime) * item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        imageUrl: item.product.images?.[0]?.imageUrl ?? "/images/component-placeholder.svg",
      },
    })),
    statusHistory: order.statusHistories,
  });
}

export async function updateOrderStatusForAdmin(orderId, nextStatusInput, changedBy, note) {
  const id = Number(orderId);
  if (!Number.isFinite(id)) {
    throw new Error("Invalid order id");
  }

  const nextStatus = String(nextStatusInput ?? "").trim().toUpperCase();
  if (!ALLOWED_STATUS_TRANSITIONS.has(nextStatus)) {
    throw new Error("Invalid order status");
  }

  const current = await prisma.order.findUnique({
    where: { id },
    include: {
      orderItems: true,
    },
  });
  if (!current) {
    throw new Error("Order not found");
  }

  if (current.orderStatus === OrderStatus.DELIVERED) {
    throw new Error("Completed order cannot be modified");
  }

  assertOrderTransitionAllowed(current.orderStatus, nextStatus);

  if (current.orderStatus === nextStatus) {
    return getOrderDetailForAdmin(id);
  }

  await prisma.$transaction(async (tx) => {
    if (
      nextStatus === OrderStatus.CANCELLED &&
      current.orderStatus !== OrderStatus.CANCELLED &&
      current.paymentStatus === PaymentStatus.PAID
    ) {
      for (const item of current.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: {
              increment: item.quantity,
            },
          },
        });
      }
    }

    await tx.order.update({
      where: { id },
      data: { orderStatus: nextStatus },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: id,
        fromStatus: current.orderStatus,
        toStatus: nextStatus,
        changedBy,
        note: note ? String(note) : null,
      },
    });
  });

  // Create notification for order status change
  await createOrderStatusChangeNotification(id, current.userId, nextStatus);

  return getOrderDetailForAdmin(id);
}

function assertOrderTransitionAllowed(currentStatus, nextStatus) {
  const current = String(currentStatus ?? "").toUpperCase();
  const next = String(nextStatus ?? "").toUpperCase();

  if (current === next) {
    return;
  }

  const allowedByCurrent = {
    PENDING: ["PROCESSING", "CANCELLED"],
    PROCESSING: ["SHIPPING", "CANCELLED"],
    SHIPPING: ["DELIVERED", "CANCELLED"],
    DELIVERED: [],
    CANCELLED: [],
  };

  if (!(allowedByCurrent[current] ?? []).includes(next)) {
    throw new Error("Invalid status flow. Vui lòng thao tác theo thứ tự xử lý đơn hàng");
  }
}

async function syncPaidPendingOrdersToProcessing() {
  const staleOrders = await prisma.order.findMany({
    where: {
      paymentStatus: PaymentStatus.PAID,
      orderStatus: OrderStatus.PENDING,
    },
    select: {
      id: true,
      userId: true,
    },
    take: 200,
  });

  if (staleOrders.length === 0) {
    return;
  }

  for (const order of staleOrders) {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { orderStatus: OrderStatus.PROCESSING },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: OrderStatus.PENDING,
          toStatus: OrderStatus.PROCESSING,
          changedBy: order.userId,
          note: "Đơn đã thanh toán, chuyển sang trạng thái chuẩn bị hàng",
        },
      });
    });

    await createOrderStatusChangeNotification(
      order.id,
      order.userId,
      OrderStatus.PROCESSING,
    );
  }
}
