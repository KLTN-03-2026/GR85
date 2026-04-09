import { OrderStatus } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { serializeData } from "../utils/serialize.js";

const ALLOWED_STATUS_TRANSITIONS = new Set([
  OrderStatus.PENDING,
  OrderStatus.SHIPPING,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
]);

export async function listOrdersForAdmin() {
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

  const current = await prisma.order.findUnique({ where: { id } });
  if (!current) {
    throw new Error("Order not found");
  }

  if (current.orderStatus === OrderStatus.DELIVERED) {
    throw new Error("Completed order cannot be modified");
  }

  if (current.orderStatus === nextStatus) {
    return getOrderDetailForAdmin(id);
  }

  await prisma.$transaction(async (tx) => {
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

  return getOrderDetailForAdmin(id);
}
