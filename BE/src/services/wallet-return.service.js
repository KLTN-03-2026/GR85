import {
  OrderStatus,
  PaymentStatus,
  ReturnRequestStatus,
} from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { serializeData } from "../utils/serialize.js";

const RETURN_WINDOW_DAYS = 3;

export async function requestOrderReturn(userId, input = {}) {
  const orderId = Number(input.orderId);
  const reason = String(input.reason ?? "").trim();
  const bankName = String(input.bankName ?? "").trim();
  const bankAccountNumber = String(input.bankAccountNumber ?? "").trim();
  const bankAccountName = String(input.bankAccountName ?? "").trim();

  if (!Number.isFinite(orderId) || orderId <= 0) {
    throw new Error("ID đơn hàng không hợp lệ");
  }

  if (reason.length < 10) {
    throw new Error("Lý do trả hàng phải có ít nhất 10 ký tự");
  }

  if (!bankName || bankName.length < 2) {
    throw new Error("Tên ngân hàng không hợp lệ");
  }

  if (!bankAccountNumber || bankAccountNumber.length < 8) {
    throw new Error("Số tài khoản ngân hàng không hợp lệ");
  }

  if (!bankAccountName || bankAccountName.length < 3) {
    throw new Error("Tên chủ tài khoản không hợp lệ");
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
    throw new Error("Chỉ được yêu cầu trả hàng trong vòng 3 ngày sau khi giao");
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
      bankName,
      bankAccountNumber,
      bankAccountName,
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

  // APPROVE action - move to APPROVED status, awaiting return shipping
  const updated = await prisma.returnRequest.update({
    where: { id: requestId },
    data: {
      status: ReturnRequestStatus.APPROVED,
      reviewedBy: adminUserId,
      reviewedAt: new Date(),
    },
  });

  return serializeData({
    message: "Yêu cầu trả hàng đã được phê duyệt. Khách hàng sẽ gửi hàng trả về",
    request: mapReturnRequest(updated),
  });
}

export async function markReturnAsShippingBack(adminUserId, requestIdInput) {
  const requestId = Number(requestIdInput);

  if (!Number.isFinite(requestId) || requestId <= 0) {
    throw new Error("ID yêu cầu trả hàng không hợp lệ");
  }

  const request = await prisma.returnRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error("Không tìm thấy yêu cầu trả hàng");
  }

  if (request.status !== ReturnRequestStatus.APPROVED) {
    throw new Error("Chỉ các yêu cầu đã phê duyệt mới có thể đánh dấu là đang gửi trả");
  }

  const updated = await prisma.returnRequest.update({
    where: { id: requestId },
    data: {
      status: ReturnRequestStatus.SHIPPING_BACK,
    },
  });

  return serializeData({
    message: "Đã đánh dấu trạng thái: Đang gửi trả",
    request: mapReturnRequest(updated),
  });
}

export async function markReturnAsReceived(adminUserId, requestIdInput) {
  const requestId = Number(requestIdInput);

  if (!Number.isFinite(requestId) || requestId <= 0) {
    throw new Error("ID yêu cầu trả hàng không hợp lệ");
  }

  const request = await prisma.returnRequest.findUnique({
    where: { id: requestId },
  });

  if (!request) {
    throw new Error("Không tìm thấy yêu cầu trả hàng");
  }

  if (![ReturnRequestStatus.APPROVED, ReturnRequestStatus.SHIPPING_BACK].includes(request.status)) {
    throw new Error("Chỉ các yêu cầu đã phê duyệt hoặc đang gửi trả mới có thể đánh dấu là đã nhận");
  }

  const updated = await prisma.returnRequest.update({
    where: { id: requestId },
    data: {
      status: ReturnRequestStatus.RECEIVED,
      receivedAt: new Date(),
    },
  });

  return serializeData({
    message: "Đã đánh dấu: Hàng trả đã được nhận. Bây giờ cần xử lý hoàn tiền",
    request: mapReturnRequest(updated),
  });
}

export async function processReturnRefund(adminUserId, requestIdInput) {
  const requestId = Number(requestIdInput);

  if (!Number.isFinite(requestId) || requestId <= 0) {
    throw new Error("ID yêu cầu trả hàng không hợp lệ");
  }

  const request = await prisma.returnRequest.findUnique({
    where: { id: requestId },
    include: { order: true },
  });

  if (!request) {
    throw new Error("Không tìm thấy yêu cầu trả hàng");
  }

  if (request.status !== ReturnRequestStatus.RECEIVED) {
    throw new Error("Chỉ các yêu cầu đã nhận được hàng trả mới có thể xử lý hoàn tiền");
  }

  if (!request.bankName || !request.bankAccountNumber || !request.bankAccountName) {
    throw new Error("Thông tin ngân hàng không đầy đủ. Không thể xử lý hoàn tiền");
  }

  const refundAmount = Number(request.order.totalAmount);

  const updated = await prisma.$transaction(async (tx) => {
    const returnRequest = await tx.returnRequest.update({
      where: { id: requestId },
      data: {
        status: ReturnRequestStatus.REFUNDED,
        refundedAt: new Date(),
        refundAmount,
        note: request.note
          ? request.note + `\n[Admin] Đã xử lý hoàn tiền vào tài khoản: ${request.bankAccountNumber} (${request.bankName})`
          : `[Admin] Đã xử lý hoàn tiền vào tài khoản: ${request.bankAccountNumber} (${request.bankName})`,
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
        note: `Hoàn tiền ${refundAmount.toFixed(2)} VND vào tài khoản ngân hàng: ${request.bankAccountNumber} (${request.bankName})`,
      },
    });

    return returnRequest;
  });

  return serializeData({
    message: "Yêu cầu hoàn tiền đã được xử lý. Tiền sẽ được chuyển vào tài khoản ngân hàng của khách hàng",
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
    bankName: item.bankName,
    bankAccountNumber: item.bankAccountNumber,
    bankAccountName: item.bankAccountName,
    note: item.note,
    requestedAt: item.requestedAt,
    reviewedAt: item.reviewedAt,
    receivedAt: item.receivedAt,
    refundedAt: item.refundedAt,
  };
}