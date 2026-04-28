import { WalletTransactionType } from "@prisma/client";
import QRCode from "qrcode";
import { prisma } from "../db/prisma.js";
import { serializeData } from "../utils/serialize.js";
import { sendWalletTopUpEmail } from "./email.service.js";

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

export async function deleteWalletTransaction(transactionId) {
  const id = Number(transactionId);
  if (!Number.isFinite(id)) {
    throw new Error("ID giao dịch không hợp lệ");
  }

  const transaction = await prisma.walletTransaction.findUnique({
    where: { id },
    include: { user: true },
  });

  if (!transaction) {
    throw new Error("Không tìm thấy giao dịch ví");
  }

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
    message: "Giao dịch ví đã được xóa thành công",
  });
}

function buildWalletTopUpCode(transactionId) {
  const suffix = String(transactionId).padStart(6, "0");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TOPUP-${suffix}-${random}`;
}