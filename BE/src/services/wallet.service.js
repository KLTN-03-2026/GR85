import {
  OrderStatus,
  PaymentStatus,
  ReturnRequestStatus,
  WalletTransactionType,
} from "@prisma/client";
import QRCode from "qrcode";
import { prisma } from "../db/prisma.js";
import { serializeData } from "../utils/serialize.js";
import { sendWalletTopUpEmail } from "./email.service.js";

const RETURN_WINDOW_DAYS = 15;

export async function getMyWallet(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      walletBalance: true,
      walletTransactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return serializeData({
    balance: Number(user.walletBalance ?? 0),
    recentTransactions: user.walletTransactions.map((item) => ({
      id: item.id,
      orderId: item.orderId,
      type: item.type,
      amount: Number(item.amount),
      note: item.note,
      createdAt: item.createdAt,
    })),
  });
}

export async function topUpWallet(userId, input = {}) {
  const amount = Number(input.amount);
  const note = String(input.note ?? "Nạp tiền vào ví").trim();

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Top-up amount must be greater than 0");
  }

  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, walletBalance: true },
    });

    if (!user) {
      throw new Error("User not found");
    }

    const nextBalance = Number(user.walletBalance ?? 0) + amount;

    await tx.user.update({
      where: { id: userId },
      data: { walletBalance: nextBalance },
    });

    const txn = await tx.walletTransaction.create({
      data: {
        userId,
        amount,
        type: WalletTransactionType.TOP_UP,
        note,
      },
    });

    return {
      balance: nextBalance,
      transaction: txn,
      user,
    };
  });

  const paymentCode = buildWalletTopUpCode(result.transaction.id);
  const qrCodeDataUrl = await QRCode.toDataURL(
    JSON.stringify({
      type: "WALLET_TOPUP",
      paymentCode,
      userId,
      amount,
      balance: result.balance,
      transactionId: result.transaction.id,
      timestamp: new Date().toISOString(),
    }),
    {
      errorCorrectionLevel: "H",
      type: "image/png",
      width: 300,
      margin: 1,
    },
  );

  if (result.user?.email) {
    await sendWalletTopUpEmail(result.user.email, {
      fullName: result.user.fullName,
      amount,
      balance: result.balance,
      paymentCode,
      qrCodeDataUrl,
    });
  }

  return serializeData({
    message: "Top-up successful",
    balance: result.balance,
    paymentCode,
    qrCodeDataUrl,
    topUpAmount: amount,
    transaction: {
      id: result.transaction.id,
      type: result.transaction.type,
      amount: Number(result.transaction.amount),
      note: result.transaction.note,
      createdAt: result.transaction.createdAt,
    },
  });
}

function buildWalletTopUpCode(transactionId) {
  const suffix = String(transactionId).padStart(6, "0");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TOPUP-${suffix}-${random}`;
}

export async function requestOrderReturn(userId, input = {}) {
  const orderId = Number(input.orderId);
  const reason = String(input.reason ?? "").trim();

  if (!Number.isFinite(orderId) || orderId <= 0) {
    throw new Error("Invalid order id");
  }

  if (reason.length < 10) {
    throw new Error("Return reason must be at least 10 characters");
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
    throw new Error("Order not found");
  }

  if (order.orderStatus !== OrderStatus.DELIVERED) {
    throw new Error("Only delivered orders can be returned");
  }

  if (order.paymentStatus !== PaymentStatus.PAID) {
    throw new Error("Only paid orders can be returned");
  }

  const deliveredAt = order.statusHistories[0]?.createdAt ?? order.updatedAt;
  const elapsed = Date.now() - new Date(deliveredAt).getTime();
  const limit = RETURN_WINDOW_DAYS * 24 * 60 * 60 * 1000;

  if (elapsed > limit) {
    throw new Error("Return request is only allowed within 15 days after delivery");
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
    throw new Error("A return request already exists for this order");
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
    message: "Return request submitted and waiting for admin approval",
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
    throw new Error("Invalid return request id");
  }

  if (!["APPROVE", "REJECT"].includes(action)) {
    throw new Error("Action must be APPROVE or REJECT");
  }

  const request = await prisma.returnRequest.findUnique({
    where: { id: requestId },
    include: { order: true },
  });

  if (!request) {
    throw new Error("Return request not found");
  }

  if (request.status !== ReturnRequestStatus.PENDING) {
    throw new Error("Only pending requests can be reviewed");
  }

  if (action === "REJECT") {
    if (rejectReason.length < 5) {
      throw new Error("Reject reason must be at least 5 characters");
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
      message: "Return request rejected",
      request: mapReturnRequest(updated),
    });
  }

  const refundAmount =
    refundAmountInput === undefined || refundAmountInput === null
      ? Number(request.order.totalAmount)
      : Number(refundAmountInput);

  if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
    throw new Error("Refund amount must be greater than 0");
  }

  if (refundAmount > Number(request.order.totalAmount)) {
    throw new Error("Refund amount cannot exceed order total amount");
  }

  const updated = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: request.userId },
      select: { walletBalance: true },
    });

    if (!user) {
      throw new Error("User not found");
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
        note: `Refund for returned order #${request.orderId}`,
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
        note: `Return approved and refunded ${refundAmount.toFixed(2)} to wallet`,
      },
    });

    return returnRequest;
  });

  return serializeData({
    message: "Return approved and refunded to user wallet",
    request: mapReturnRequest(updated),
  });
}

export async function deleteWalletTransaction(transactionId) {
  const id = Number(transactionId);
  if (!Number.isFinite(id)) {
    throw new Error("Invalid transaction ID");
  }

  const transaction = await prisma.walletTransaction.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!transaction) {
    throw new Error("Wallet transaction not found");
  }

  // If transaction added credits to wallet, subtract them back
  if (
    transaction.type === WalletTransactionType.TOPUP_CREDIT ||
    transaction.type === WalletTransactionType.REFUND_CREDIT
  ) {
    const newBalance = Number(transaction.user.walletBalance ?? 0) - Number(transaction.amount);
    
    await prisma.user.update({
      where: { id: transaction.userId },
      data: { walletBalance: Math.max(0, newBalance) },
    });
  }

  await prisma.walletTransaction.delete({
    where: { id },
  });

  return serializeData({
    success: true,
    message: "Wallet transaction deleted successfully",
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
