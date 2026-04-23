import { prisma } from "../db/prisma.js";

export async function findOrderWithHistory(orderId) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
      statusHistories: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function runOrderStatusUpdateTransaction({
  orderId,
  data,
  history,
}) {
  return prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            fullName: true,
          },
        },
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId,
        fromStatus: history.fromStatus,
        toStatus: history.toStatus,
        changedBy: history.changedBy,
        note: history.note ?? null,
      },
    });

    return updatedOrder;
  });
}

export async function reloadOrderWithHistory(orderId) {
  return prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          fullName: true,
        },
      },
      statusHistories: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}
