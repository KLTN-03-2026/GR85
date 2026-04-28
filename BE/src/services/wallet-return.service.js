import {
  OrderStatus,
  PaymentStatus,
  ReturnRequestStatus,
  WalletTransactionType,
} from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { serializeData } from "../utils/serialize.js";

const RETURN_WINDOW_DAYS = 15;

export async function requestOrderReturn(userId, input = {}) {
  const orderId = Number(input.orderId);
  const reason = String(input.reason ?? "").trim();

  if (!Number.isFinite(orderId) || orderId <= 0) {
    throw new Error("ID đơn hàng không hợp lệ");
  }

  if (reason.length < 10) {
    throw new Error("Lý do trả hàng phải có ít nhất 10 ký tự");
  }

  const order = await prisma.order.findFirst({
    where: { id: orderId, userId },
    include: {
      statusHistories: {
        where: { toStatus: OrderStatus.DELIVERED },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!order) {
    throw new Error("Không tìm thấy đơn hàng");
  }

  if (order.orderStatus !== OrderStatus.DELIVERED) {
    throw new Error("Chỉ đơn hàng đã giao mới có thể yêu cầu trả hàng");
  }

  if (order.paymentStatus !== PaymentStatus.PAID) {
    throw new Error("Chỉ đơn hàng đã thanh toán mới có thể yêu cầu trả hàng");
  }

  const deliveredAt = order.statusHistories[0]?.createdAt ?? order.updatedAt;
  const elapsed = Date.now() - new Date(deliveredAt).getTime();
  const limit = RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  if (elapsed > limit) {
    throw new Error("Chỉ được yêu cầu trả hàng trong vòng 15 ngày sau khi giao");
  }

  const existing = await prisma.returnRequest.findFirst({
    where: {
      orderId,
      status: {
        in: [ReturnRequestStatus.PENDING, ReturnRequestStatus.APPROVED, ReturnRequestStatus.REFUNDED],
      },
    },
  });

  if (existing) {
    throw new Error("Đơn hàng này đã có yêu cầu trả hàng");
  }

  const created = await prisma.returnRequest.create({
    data: {
      orderId,
      userId,
      reason,
      status: ReturnRequestStatus.PENDING,
    },
  });

  return serializeData({
    message: "Yêu cầu trả hàng đã được gửi và đang chờ quản trị viên duyệt",
    request: mapReturnRequest(created),
  });
}

export async function listMyReturnRequests(userId) {
  const requests = await prisma.returnRequest.findMany({
    where: { userId },
    orderBy: { requestedAt: "desc" },
    include: {
      order: true,
    },
  });

  return serializeData(
    requests.map((item) => ({
      ...mapReturnRequest(item),
      order: {
        id: item.order.id,
        totalAmount: Number(item.order.totalAmount),
        orderStatus: item.order.orderStatus,
        paymentStatus: item.order.paymentStatus,
      },
    })),
  );
}

export async function listReturnRequestsForAdmin() {
  const requests = await prisma.returnRequest.findMany({
    orderBy: { requestedAt: "desc" },
    include: {
      user: {
        select: { id: true, fullName: true, email: true },
      },
      order: true,
    },
  });

  return serializeData(
    requests.map((item) => ({
      ...mapReturnRequest(item),
      user: item.user,
      order: {
        id: item.order.id,
        totalAmount: Number(item.order.totalAmount),
        orderStatus: item.order.orderStatus,
        paymentStatus: item.order.paymentStatus,
      },
    })),
  );
}

export async function reviewReturnRequestByAdmin(adminUserId, requestIdInput, input = {}) {
  const requestId = Number(requestIdInput);
  const action = String(input.action ?? "").trim().toUpperCase();
  const rejectReason = String(input.rejectReason ?? "").trim();
  const refundAmountInput = input.refundAmount;

  if (!Number.isFinite(requestId) || requestId <= 0) {
    throw new Error("ID yêu cầu trả hàng không hợp lệ");
  }

  if (!["APPROVE", "REJECT"].includes(action)) {
    throw new Error("Hành động phải là APPROVE hoặc REJECT");
  }

  const request = await prisma.returnRequest.findUnique({
    where: { id: requestId },
    include: { order: true },
  });

  if (!request) {
    throw new Error("Không tìm thấy yêu cầu trả hàng");
  }

  if (request.status !== ReturnRequestStatus.PENDING) {
    throw new Error("Chỉ các yêu cầu đang chờ mới có thể được duyệt");
  }

  if (action === "REJECT") {
    if (rejectReason.length < 5) {
      throw new Error("Lý do từ chối phải có ít nhất 5 ký tự");
    }

    const updated = await prisma.returnRequest.update({
      where: { id: requestId },
      data: {
        status: ReturnRequestStatus.REJECTED,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        rejectReason,
      },
    });

    return serializeData({
      message: "Yêu cầu trả hàng đã bị từ chối",
      request: mapReturnRequest(updated),
    });
  }

  const refundAmount =
    refundAmountInput === undefined || refundAmountInput === null
      ? Number(request.order.totalAmount)
      : Number(refundAmountInput);

  if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
    throw new Error("Số tiền hoàn trả phải lớn hơn 0");
  }

  if (refundAmount > Number(request.order.totalAmount)) {
    throw new Error("Số tiền hoàn trả không được vượt quá tổng tiền đơn hàng");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: request.userId },
      select: { walletBalance: true },
    });

    if (!user) {
      throw new Error("Không tìm thấy người dùng");
    }

    const nextBalance = Number(user.walletBalance ?? 0) + refundAmount;

    await tx.user.update({
      where: { id: request.userId },
      data: { walletBalance: nextBalance },
    });

    await tx.walletTransaction.create({
      data: {
        userId: request.userId,
        orderId: request.orderId,
        amount: refundAmount,
        type: WalletTransactionType.REFUND_CREDIT,
        note: `Hoàn tiền cho đơn hàng trả lại #${request.orderId}`,
      },
    });

    const returnRequest = await tx.returnRequest.update({
      where: { id: requestId },
      data: {
        status: ReturnRequestStatus.REFUNDED,
        reviewedBy: adminUserId,
        reviewedAt: new Date(),
        refundAmount,
      },
    });

    await tx.order.update({
      where: { id: request.orderId },
      data: {
        paymentStatus: PaymentStatus.REFUNDED,
        orderStatus: OrderStatus.CANCELLED,
      },
    });

    await tx.orderStatusHistory.create({
      data: {
        orderId: request.orderId,
        fromStatus: request.order.orderStatus,
        toStatus: OrderStatus.CANCELLED,
        changedBy: adminUserId,
        note: `Đã duyệt trả hàng và hoàn ${refundAmount.toFixed(2)} vào ví`,
      },
    });

    return returnRequest;
  });

  return serializeData({
    message: "Đã duyệt trả hàng và hoàn tiền vào ví người dùng",
    request: mapReturnRequest(updated),
  });
}

function mapReturnRequest(item) {
  return {
    id: item.id,
    orderId: item.orderId,
    userId: item.userId,
    reason: item.reason,
    status: item.status,
    reviewedBy: item.reviewedBy,
    rejectReason: item.rejectReason,
    refundAmount: item.refundAmount != null ? Number(item.refundAmount) : null,
    requestedAt: item.requestedAt,
    reviewedAt: item.reviewedAt,
  };
}