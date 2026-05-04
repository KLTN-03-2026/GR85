import { compare, hash } from "bcryptjs";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import dns from "node:dns";
import { OrderStatus, PaymentStatus, UserStatus } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { serializeData } from "../utils/serialize.js";
import {
  normalizeAndValidateFullName,
  normalizeAndValidatePhoneNumber,
} from "../utils/validation.js";
import { adminPermissionCatalog } from "./admin.service.js";

const defaultUserPermissions = ["place_order", "save_build", "send_review"];
const SUPER_ADMIN_EMAIL = "admin@gmail.com";
const OTP_SEND_COOLDOWN_SECONDS = 90;
const verificationPurposes = {
  EMAIL_VERIFY: "EMAIL_VERIFY",
  PASSWORD_RESET: "PASSWORD_RESET",
};
const otpSendCooldownState = new Map();

class OtpCooldownError extends Error {
  constructor(message, retryAfterSeconds) {
    super(message);
    this.name = "OtpCooldownError";
    this.statusCode = 429;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

try {
  dns.setDefaultResultOrder("ipv4first");
} catch {
  // Ignore when runtime does not support setting DNS result order.
}

const mailTransport = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  family: 4,
  auth: {
    user: env.EMAIL,
    pass: env.APP_PASSWORD.replace(/\s+/g, ""),
  },
  tls: {
    servername: "smtp.gmail.com",
  },
});

export async function registerUser(input) {
  const cooldownReservation = reserveOtpSendCooldown({
    purpose: verificationPurposes.EMAIL_VERIFY,
    email: input.email,
    ip: input.ip,
  });

  try {
  const provisionalFullName = buildProvisionalFullNameFromEmail(input.email);

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new Error("Email đã tồn tại");
  }

  const userRole = await prisma.role.findFirst({
    where: { name: { equals: "User" } },
  });

  const passwordHash = await hash(input.password, 10);
  const { user, verificationCode } = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: provisionalFullName,
        phone: null,
        status: UserStatus.UNVERIFIED,
        roleId: userRole?.id,
        cart: {
          create: {},
        },
      },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });

    const verificationCode = await issueEmailVerification(tx, {
      email: createdUser.email,
      purpose: verificationPurposes.EMAIL_VERIFY,
    });

    return { user: createdUser, verificationCode };
  });

  try {
    await sendOtpEmail({
      email: user.email,
      fullName: user.fullName,
      otp: verificationCode,
      purpose: verificationPurposes.EMAIL_VERIFY,
    });
  } catch (error) {
    cooldownReservation.release();
    await prisma.$transaction([
      prisma.emailVerification.deleteMany({
        where: {
          email: user.email,
          purpose: verificationPurposes.EMAIL_VERIFY,
        },
      }),
      prisma.user.delete({ where: { id: user.id } }),
    ]);

    throw new Error("Không thể gửi email xác minh. Vui lòng thử lại sau");
  }

  return serializeData({
    message:
      "Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản",
    email: user.email,
    verificationRequired: true,
  });
  } catch (error) {
    cooldownReservation.release();
    throw error;
  }
}

export async function loginUser(input) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error("Email hoặc mật khẩu không đúng");
  }

  const passwordMatches = await compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new Error("Email hoặc mật khẩu không đúng");
  }

  if (user.status === UserStatus.UNVERIFIED) {
    throw new Error("Vui lòng xác minh email của bạn trước tiên");
  }

  if (user.status === UserStatus.BANNED) {
    throw new Error("Tài khoản này đã bị cấm");
  }

  return buildAuthPayload(user);
}

export async function verifyEmail(input) {
  const verification = await getValidVerification({
    email: input.email,
    purpose: verificationPurposes.EMAIL_VERIFY,
    otp: input.otp,
  });

  const user = await prisma.$transaction(async (tx) => {
    await tx.emailVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });

    return tx.user.update({
      where: { email: input.email },
      data: { status: UserStatus.ACTIVE },
      include: {
        role: {
          include: {
            permissions: {
              include: {
                permission: true,
              },
            },
          },
        },
      },
    });
  });

  return buildAuthPayload(user);
}

export async function resendVerificationCode(input) {
  const cooldownReservation = reserveOtpSendCooldown({
    purpose: verificationPurposes.EMAIL_VERIFY,
    email: input.email,
    ip: input.ip,
  });

  try {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new Error("Email không tồn tại");
    }

    if (user.status === UserStatus.BANNED) {
      throw new Error("Tài khoản này đã bị cấm");
    }

    const verificationCode = await prisma.$transaction(async (tx) => {
      return issueEmailVerification(tx, {
        email: input.email,
        purpose: verificationPurposes.EMAIL_VERIFY,
      });
    });

    try {
      await sendOtpEmail({
        email: user.email,
        fullName: user.fullName,
        otp: verificationCode,
        purpose: verificationPurposes.EMAIL_VERIFY,
      });
    } catch {
      throw new Error("Không thể gửi lại email xác minh. Vui lòng thử lại sau");
    }

    return serializeData({
      message: "Mã xác minh đã được gửi lại đến email của bạn",
      email: user.email,
    });
  } catch (error) {
    cooldownReservation.release();
    throw error;
  }
}

export async function requestPasswordReset(input) {
  const cooldownReservation = reserveOtpSendCooldown({
    purpose: verificationPurposes.PASSWORD_RESET,
    email: input.email,
    ip: input.ip,
  });

  try {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new Error("Email không tồn tại");
    }

    if (user.status === UserStatus.BANNED) {
      throw new Error("Tài khoản này đã bị cấm");
    }

    const resetCode = await prisma.$transaction(async (tx) => {
      return issueEmailVerification(tx, {
        email: input.email,
        purpose: verificationPurposes.PASSWORD_RESET,
      });
    });

    try {
      await sendOtpEmail({
        email: user.email,
        fullName: user.fullName,
        otp: resetCode,
        purpose: verificationPurposes.PASSWORD_RESET,
      });
    } catch {
      throw new Error(
        "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau",
      );
    }

    return serializeData({
      message: "Mã đặt lại mật khẩu đã được gửi đến email của bạn",
      email: user.email,
    });
  } catch (error) {
    cooldownReservation.release();
    throw error;
  }
}

export async function validatePasswordResetOtp(input) {
  await getValidVerification({
    email: input.email,
    purpose: verificationPurposes.PASSWORD_RESET,
    otp: input.otp,
  });

  return serializeData({
    valid: true,
    message: "Mã OTP hợp lệ",
    email: input.email,
  });
}

export async function resetPassword(input) {
  const verification = await getValidVerification({
    email: input.email,
    purpose: verificationPurposes.PASSWORD_RESET,
    otp: input.otp,
  });

  const passwordHash = await hash(input.password, 10);

  await prisma.$transaction(async (tx) => {
    await tx.emailVerification.update({
      where: { id: verification.id },
      data: { usedAt: new Date() },
    });

    await tx.user.update({
      where: { email: input.email },
      data: { passwordHash },
    });
  });

  return serializeData({
    message: "Mật khẩu đã được cập nhật thành công",
    email: input.email,
  });
}

export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error("Người dùng không tồn tại");
  }

  const permissions = resolveEffectivePermissions(user);
  const roleName = resolveDisplayRoleFromPermissions(user, permissions);

  return serializeData({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    address: user.address,
    walletBalance: Number(user.walletBalance ?? 0),
    status: user.status,
    role: roleName,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    permissions,
  });
}

export async function listMyOrders(userId) {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
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
    },
  });

  return serializeData(
    orders.map((order) => ({
      id: order.id,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      totalAmount: order.totalAmount,
      discountAmount: order.discountAmount,
      shippingAddress: order.shippingAddress,
      phoneNumber: order.phoneNumber,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      itemCount: order.orderItems.reduce((sum, item) => sum + item.quantity, 0),
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
    })),
  );
}

export async function getMyOrderDetail(userId, orderId) {
  const id = Number(orderId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Mã đơn hàng không hợp lệ");
  }

  const order = await prisma.order.findFirst({
    where: { id, userId },
    include: {
      orderItems: {
        include: {
          product: {
            include: {
              images: {
                orderBy: [
                  { isPrimary: "desc" },
                  { sortOrder: "asc" },
                  { id: "asc" },
                ],
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
    throw new Error("Đơn hàng không tồn tại");
  }

  return serializeData({
    id: order.id,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    totalAmount: order.totalAmount,
    discountAmount: order.discountAmount,
    shippingAddress: order.shippingAddress,
    phoneNumber: order.phoneNumber,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    items: order.orderItems.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      priceAtTime: item.priceAtTime,
      lineTotal: Number(item.priceAtTime) * item.quantity,
      product: {
        id: item.product.id,
        name: item.product.name,
        slug: item.product.slug,
        imageUrl:
          item.product.images?.[0]?.imageUrl ??
          "/images/component-placeholder.svg",
      },
    })),
    statusHistory: order.statusHistories,
  });
}

export async function listMyReviewHistory(userId) {
  const normalizedUserId = Number(userId);
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    throw new Error("ID người dùng không hợp lệ");
  }

  const reviews = await prisma.review.findMany({
    where: { userId: normalizedUserId },
    orderBy: [{ createdAt: "desc" }],
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          images: {
            orderBy: [
              { isPrimary: "desc" },
              { sortOrder: "asc" },
              { id: "asc" },
            ],
            take: 1,
          },
        },
      },
      replies: {
        orderBy: { createdAt: "asc" },
        take: 200,
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
      replier: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  return serializeData({
    items: reviews.map((review) => mapMyReview(review, normalizedUserId)),
  });
}

export async function listMyPendingReviews(userId) {
  const normalizedUserId = Number(userId);
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    throw new Error("ID người dùng không hợp lệ");
  }

  const orderItems = await prisma.orderItem.findMany({
    where: {
      order: {
        userId: normalizedUserId,
        orderStatus: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
      },
    },
    orderBy: [{ order: { createdAt: "desc" } }, { id: "desc" }],
    include: {
      order: {
        select: {
          id: true,
          createdAt: true,
          updatedAt: true,
          orderStatus: true,
          paymentStatus: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
          images: {
            orderBy: [
              { isPrimary: "desc" },
              { sortOrder: "asc" },
              { id: "asc" },
            ],
            take: 1,
          },
        },
      },
      reviews: {
        where: { userId: normalizedUserId },
        select: { id: true },
        take: 1,
      },
    },
    take: 300,
  });

  const pending = orderItems
    .filter((item) => (item.reviews ?? []).length === 0)
    .map((item) => ({
      orderId: item.orderId,
      orderCreatedAt: item.order?.createdAt ?? null,
      product: {
        id: item.product?.id,
        name: item.product?.name ?? "",
        slug: item.product?.slug ?? "",
        imageUrl:
          item.product?.images?.[0]?.imageUrl ??
          "/images/component-placeholder.svg",
      },
      quantity: Number(item.quantity ?? 0),
    }));

  return serializeData({
    items: pending,
  });
}

export async function getMyReviewThread(userId, reviewIdInput) {
  const normalizedUserId = Number(userId);
  const reviewId = Number(reviewIdInput);

  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    throw new Error("ID người dùng không hợp lệ");
  }
  if (!Number.isFinite(reviewId) || reviewId <= 0) {
    throw new Error("Mã đánh giá không hợp lệ");
  }

  const review = await prisma.review.findFirst({
    where: { id: reviewId, userId: normalizedUserId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      replies: {
        orderBy: { createdAt: "asc" },
        take: 200,
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
      replier: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
    },
  });

  if (!review) {
    throw new Error("Không tìm thấy đánh giá");
  }

  return serializeData({
    reviewId: review.id,
    product: review.product,
    thread: mapReviewThread(review, normalizedUserId),
  });
}

export async function replyToMyReview(userId, reviewIdInput, input = {}) {
  const normalizedUserId = Number(userId);
  const reviewId = Number(reviewIdInput);
  const message = String(input.message ?? "").trim();

  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    throw new Error("ID người dùng không hợp lệ");
  }
  if (!Number.isFinite(reviewId) || reviewId <= 0) {
    throw new Error("Mã đánh giá không hợp lệ");
  }
  if (!message) {
    throw new Error("Nội dung phản hồi là bắt buộc");
  }
  if (message.length > 2000) {
    throw new Error("Nội dung phản hồi quá dài");
  }

  const existing = await prisma.review.findFirst({
    where: { id: reviewId, userId: normalizedUserId },
    select: { id: true },
  });

  if (!existing) {
    throw new Error("Không tìm thấy đánh giá");
  }

  await prisma.$transaction(async (tx) => {
    await tx.reviewReply.create({
      data: {
        reviewId,
        senderId: normalizedUserId,
        message,
      },
    });

    await tx.review.update({
      where: { id: reviewId },
      data: {
        threadStatus: "WAITING_ADMIN",
        threadResolvedBy: null,
        threadResolvedAt: null,
      },
    });
  });

  return getMyReviewThread(normalizedUserId, reviewId);
}

function mapMyReview(review, userId) {
  return {
    id: review.id,
    productId: review.productId,
    rating: Number(review.rating ?? 0),
    comment: review.comment ? String(review.comment) : "",
    isHidden: Boolean(review.isHidden),
    hiddenReason: review.hiddenReason ? String(review.hiddenReason) : "",
    adminReply: review.adminReply ? String(review.adminReply) : "",
    adminRepliedAt: review.adminRepliedAt,
    threadStatus: String(review.threadStatus ?? "OPEN"),
    threadResolvedAt: review.threadResolvedAt,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    product: review.product
      ? {
          id: review.product.id,
          name: review.product.name ?? "",
          slug: review.product.slug ?? "",
          imageUrl:
            review.product.images?.[0]?.imageUrl ??
            "/images/component-placeholder.svg",
        }
      : null,
    thread: mapReviewThread(review, userId),
  };
}

function mapReviewThread(review, userId) {
  const replies = Array.isArray(review?.replies) ? review.replies : [];
  const thread = replies.map((reply) => {
    const senderId = Number(reply.senderId);
    const isStaff =
      Number.isFinite(senderId) && senderId > 0 && senderId !== Number(userId);

    return {
      id: reply.id,
      senderId,
      senderName:
        String(reply.sender?.fullName ?? "").trim() ||
        String(reply.sender?.email ?? "").trim() ||
        (isStaff ? "Nhân viên" : "Bạn"),
      isStaff,
      message: String(reply.message ?? ""),
      createdAt: reply.createdAt,
    };
  });

  const fallbackAdminReply = String(review?.adminReply ?? "").trim();
  const fallbackAdminRepliedAt = review?.adminRepliedAt
    ? new Date(review.adminRepliedAt)
    : null;
  const hasFallback =
    Boolean(fallbackAdminReply) &&
    !thread.some(
      (item) => String(item.message ?? "").trim() === fallbackAdminReply,
    );

  if (hasFallback) {
    thread.push({
      id: `fallback-admin-${review.id}`,
      senderId: Number(review?.adminRepliedBy) || null,
      senderName: review?.replier?.fullName
        ? String(review.replier.fullName)
        : "Nhân viên",
      isStaff: true,
      message: fallbackAdminReply,
      createdAt:
        fallbackAdminRepliedAt || review?.updatedAt || review?.createdAt,
    });
  }

  return thread.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

function createOtp() {
  return String(crypto.randomInt(100000, 1000000));
}

function reserveOtpSendCooldown({ purpose, email, ip }) {
  const keys = buildOtpCooldownKeys({ purpose, email, ip });
  const retryAfterSeconds = getActiveOtpCooldownSeconds(keys);

  if (retryAfterSeconds > 0) {
    throw new OtpCooldownError(
      `Vui lòng chờ ${retryAfterSeconds} giây trước khi gửi lại mã OTP`,
      retryAfterSeconds,
    );
  }

  const expiresAt = Date.now() + OTP_SEND_COOLDOWN_SECONDS * 1000;
  for (const key of keys) {
    otpSendCooldownState.set(key, expiresAt);
  }

  return {
    release() {
      for (const key of keys) {
        otpSendCooldownState.delete(key);
      }
    },
  };
}

function getActiveOtpCooldownSeconds(keys) {
  const now = Date.now();
  let longestRemainingSeconds = 0;

  for (const key of keys) {
    const expiresAt = otpSendCooldownState.get(key);
    if (!expiresAt) {
      continue;
    }

    if (expiresAt <= now) {
      otpSendCooldownState.delete(key);
      continue;
    }

    const remainingSeconds = Math.ceil((expiresAt - now) / 1000);
    if (remainingSeconds > longestRemainingSeconds) {
      longestRemainingSeconds = remainingSeconds;
    }
  }

  return longestRemainingSeconds;
}

function buildOtpCooldownKeys({ purpose, email, ip }) {
  const normalizedPurpose = String(purpose ?? "OTP").trim().toUpperCase();
  const normalizedEmail = String(email ?? "").trim().toLowerCase();
  const normalizedIp = String(ip ?? "").trim().toLowerCase();

  const keys = [];
  if (normalizedEmail) {
    keys.push(`otp-cooldown:${normalizedPurpose}:email:${normalizedEmail}`);
  }
  if (normalizedIp) {
    keys.push(`otp-cooldown:${normalizedPurpose}:ip:${normalizedIp}`);
  }

  return keys;
}

async function issueEmailVerification(tx, { email, purpose }) {
  const otp = createOtp();

  await tx.emailVerification.deleteMany({
    where: {
      email,
      purpose,
    },
  });

  await tx.emailVerification.create({
    data: {
      email,
      otp,
      purpose,
      expiredAt: new Date(Date.now() + env.OTP_EXPIRY_MINUTES * 60 * 1000),
    },
  });

  return otp;
}

async function getValidVerification({ email, purpose, otp }) {
  const verification = await prisma.emailVerification.findFirst({
    where: {
      email,
      purpose,
      otp,
      usedAt: null,
      expiredAt: {
        gt: new Date(),
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!verification) {
    throw new Error("Mã xác minh không hợp lệ hoặc đã hết hạn");
  }

  return verification;
}

async function sendOtpEmail({ email, fullName, otp, purpose }) {
  const subject =
    purpose === verificationPurposes.PASSWORD_RESET
      ? "Mã đặt lại mật khẩu TechBuiltAI"
      : "Mã xác minh email TechBuiltAI";

  const label =
    purpose === verificationPurposes.PASSWORD_RESET
      ? "đặt lại mật khẩu"
      : "xác minh email";

  const verificationLink =
    purpose === verificationPurposes.EMAIL_VERIFY
      ? `${env.FRONTEND_URL}/verify-email?email=${encodeURIComponent(email)}&otp=${encodeURIComponent(otp)}&auto=1`
      : null;

  await mailTransport.sendMail({
    from: `TechBuiltAI <${env.EMAIL}>`,
    to: email,
    subject,
    text: [
      `Xin chào ${fullName || email},`,
      `Mã ${label} của bạn là: ${otp}`,
      `Mã này sẽ hết hạn sau ${env.OTP_EXPIRY_MINUTES} phút.`,
      ...(verificationLink
        ? [`Bấm link này để kích hoạt tài khoản tự động: ${verificationLink}`]
        : []),
      "Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email này.",
    ].join("\n\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <p>Xin chào ${fullName || email},</p>
        <p>Mã <strong>${label}</strong> của bạn là:</p>
        <div style="font-size: 28px; letter-spacing: 6px; font-weight: 700; padding: 12px 18px; background: #ecfdf5; border-radius: 12px; display: inline-block;">${otp}</div>
        <p>Mã này sẽ hết hạn sau ${env.OTP_EXPIRY_MINUTES} phút.</p>
        ${verificationLink ? `<p>Hoặc bấm trực tiếp vào link để kích hoạt tài khoản tự động:</p><p><a href="${verificationLink}" target="_blank" rel="noopener noreferrer">Kích hoạt tài khoản ngay</a></p>` : ""}
        <p>Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email này.</p>
      </div>
    `,
  });
}

function buildProvisionalFullNameFromEmail(email) {
  const raw = String(email ?? "").split("@")[0] ?? "";
  const cleaned = raw
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) {
    return "Nguoi dung moi";
  }

  return cleaned
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ")
    .slice(0, 100);
}

export async function updateUserProfile(userId, input) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error("Người dùng không tồn tại");
  }

  const normalizedFullName =
    input.fullName !== undefined
      ? normalizeAndValidateFullName(input.fullName, "Full name")
      : user.fullName;
  const normalizedPhone =
    input.phone !== undefined
      ? normalizeAndValidatePhoneNumber(input.phone)
      : user.phone;
  let normalizedAddress = user.address;

  if (input.address !== undefined) {
    const address = String(input.address ?? "").trim();
    if (!address) {
      throw new Error("Địa chỉ không được để trống");
    }
    if (address.length < 5) {
      throw new Error("Địa chỉ phải có ít nhất 5 ký tự");
    }
    normalizedAddress = address;
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: normalizedFullName,
      phone: normalizedPhone,
      address: normalizedAddress,
    },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
    },
  });

  return serializeData({
    id: updatedUser.id,
    email: updatedUser.email,
    fullName: updatedUser.fullName,
    phone: updatedUser.phone,
    address: updatedUser.address,
    status: updatedUser.status,
    role: updatedUser.role?.name ?? "User",
    createdAt: updatedUser.createdAt,
    updatedAt: updatedUser.updatedAt,
  });
}

export async function listUserAddresses(userId) {
  const addresses = await prisma.userAddress.findMany({
    where: { userId },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });

  return serializeData(addresses.map(mapUserAddress));
}

export async function createUserAddress(userId, input) {
  const normalized = normalizeAddressInput(input);
  const existingCount = await prisma.userAddress.count({ where: { userId } });
  const shouldSetDefault = Boolean(normalized.isDefault) || existingCount === 0;

  const created = await prisma.$transaction(async (tx) => {
    if (shouldSetDefault) {
      await tx.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    return tx.userAddress.create({
      data: {
        userId,
        label: normalized.label,
        receiverName: normalized.receiverName,
        phoneNumber: normalized.phoneNumber,
        addressLine: normalized.addressLine,
        isDefault: shouldSetDefault,
      },
    });
  });

  return serializeData(mapUserAddress(created));
}

export async function updateUserAddress(userId, addressId, input) {
  const id = Number(addressId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("ID địa chỉ không hợp lệ");
  }

  const existing = await prisma.userAddress.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new Error("Không tìm thấy địa chỉ");
  }

  const normalized = normalizeAddressInput(input);
  const shouldSetDefault = Boolean(normalized.isDefault);

  const updated = await prisma.$transaction(async (tx) => {
    if (shouldSetDefault) {
      await tx.userAddress.updateMany({
        where: { userId, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return tx.userAddress.update({
      where: { id },
      data: {
        label: normalized.label,
        receiverName: normalized.receiverName,
        phoneNumber: normalized.phoneNumber,
        addressLine: normalized.addressLine,
        isDefault: shouldSetDefault || existing.isDefault,
      },
    });
  });

  return serializeData(mapUserAddress(updated));
}

export async function deleteUserAddress(userId, addressId) {
  const id = Number(addressId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Mã địa chỉ không hợp lệ");
  }

  const existing = await prisma.userAddress.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new Error("Địa chỉ không tồn tại");
  }

  await prisma.$transaction(async (tx) => {
    await tx.userAddress.delete({ where: { id } });

    if (existing.isDefault) {
      const fallback = await tx.userAddress.findFirst({
        where: { userId },
        orderBy: { updatedAt: "desc" },
      });

      if (fallback) {
        await tx.userAddress.update({
          where: { id: fallback.id },
          data: { isDefault: true },
        });
      }
    }
  });

  return serializeData({ message: "Địa chỉ đã được xóa" });
}

export async function changePassword(userId, input) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("Người dùng không tồn tại");
  }

  const isPasswordValid = await compare(
    input.currentPassword,
    user.passwordHash,
  );

  if (!isPasswordValid) {
    throw new Error("Mật khẩu hiện tại không đúng");
  }

  const newPasswordHash = await hash(input.newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  return serializeData({
    message: "Mật khẩu đã được thay đổi thành công",
  });
}

function buildAuthPayload(user) {
  const permissions = resolveEffectivePermissions(user);
  const roleName = resolveDisplayRoleFromPermissions(user, permissions);

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: roleName,
      permissions,
    },
    env.JWT_SECRET,
    { expiresIn: "7d" },
  );

  return serializeData({
    token,
    user: {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      status: user.status,
      role: roleName,
      permissions,
    },
  });
}

function resolveEffectivePermissions(user) {
  const rolePermissions =
    user?.role?.permissions?.map((item) => item.permission.actionName) ??
    defaultUserPermissions;

  if (
    String(user?.email ?? "")
      .trim()
      .toLowerCase() === SUPER_ADMIN_EMAIL
  ) {
    return adminPermissionCatalog.map((item) => item.actionName);
  }

  return Array.from(new Set(rolePermissions.filter(Boolean)));
}

function resolveDisplayRoleFromPermissions(user, permissions = []) {
  const baseRole = String(user?.role?.name ?? "User").trim() || "User";

  if (
    String(user?.email ?? "")
      .trim()
      .toLowerCase() === SUPER_ADMIN_EMAIL
  ) {
    return "Admin";
  }

  if (
    (Array.isArray(permissions) ? permissions : []).some((item) =>
      String(item ?? "")
        .toLowerCase()
        .startsWith("admin_"),
    )
  ) {
    return "Admin";
  }

  return baseRole;
}

function normalizeAddressInput(input) {
  const receiverName = normalizeAndValidateFullName(
    input.receiverName,
    "Receiver name",
  );
  const phoneNumber = normalizeAndValidatePhoneNumber(input.phoneNumber, {
    required: true,
    fieldLabel: "Phone number",
  });
  const addressLine = String(input.addressLine ?? "").trim();
  const label = String(input.label ?? "").trim();

  if (!addressLine || addressLine.length < 5) {
    throw new Error("Địa chỉ không hợp lệ (ít nhất 5 ký tự)");
  }

  return {
    label: label || null,
    receiverName,
    phoneNumber,
    addressLine,
    isDefault: Boolean(input.isDefault),
  };
}

function mapUserAddress(address) {
  return {
    id: address.id,
    label: address.label,
    receiverName: address.receiverName,
    phoneNumber: address.phoneNumber,
    addressLine: address.addressLine,
    isDefault: address.isDefault,
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
  };
}
