import { compare, hash } from "bcryptjs";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { UserStatus } from "@prisma/client";
import { env } from "../config/env.js";
import { prisma } from "../db/prisma.js";
import { serializeData } from "../utils/serialize.js";
import {
  normalizeAndValidateFullName,
  normalizeAndValidatePhoneNumber,
} from "../utils/validation.js";

const defaultUserPermissions = ["place_order", "save_build", "send_review"];
const verificationPurposes = {
  EMAIL_VERIFY: "EMAIL_VERIFY",
  PASSWORD_RESET: "PASSWORD_RESET",
};

const mailTransport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: env.EMAIL,
    pass: env.APP_PASSWORD.replace(/\s+/g, ""),
  },
});

export async function registerUser(input) {
  const normalizedFullName = normalizeAndValidateFullName(
    input.fullName,
    "Full name",
  );
  const normalizedPhone = normalizeAndValidatePhoneNumber(input.phone);

  const existingUser = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (existingUser) {
    throw new Error("Email already exists");
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
        fullName: normalizedFullName,
        phone: normalizedPhone,
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
    await prisma.$transaction([
      prisma.emailVerification.deleteMany({
        where: {
          email: user.email,
          purpose: verificationPurposes.EMAIL_VERIFY,
        },
      }),
      prisma.user.delete({ where: { id: user.id } }),
    ]);

    throw new Error("Unable to send verification email");
  }

  return serializeData({
    message: "Verification code sent to your email",
    email: user.email,
    verificationRequired: true,
  });
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
    throw new Error("Invalid email or password");
  }

  const passwordMatches = await compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new Error("Invalid email or password");
  }

  if (user.status === UserStatus.UNVERIFIED) {
    throw new Error("Please verify your email first");
  }

  if (user.status === UserStatus.BANNED) {
    throw new Error("This account has been banned");
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
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new Error("Email not found");
  }

  if (user.status === UserStatus.BANNED) {
    throw new Error("This account has been banned");
  }

  const verificationCode = await prisma.$transaction(async (tx) => {
    return issueEmailVerification(tx, {
      email: input.email,
      purpose: verificationPurposes.EMAIL_VERIFY,
    });
  });

  await sendOtpEmail({
    email: user.email,
    fullName: user.fullName,
    otp: verificationCode,
    purpose: verificationPurposes.EMAIL_VERIFY,
  });

  return serializeData({
    message: "Verification code resent to your email",
    email: user.email,
  });
}

export async function requestPasswordReset(input) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
  });

  if (!user) {
    throw new Error("Email not found");
  }

  if (user.status === UserStatus.BANNED) {
    throw new Error("This account has been banned");
  }

  const resetCode = await prisma.$transaction(async (tx) => {
    return issueEmailVerification(tx, {
      email: input.email,
      purpose: verificationPurposes.PASSWORD_RESET,
    });
  });

  await sendOtpEmail({
    email: user.email,
    fullName: user.fullName,
    otp: resetCode,
    purpose: verificationPurposes.PASSWORD_RESET,
  });

  return serializeData({
    message: "Password reset code sent to your email",
    email: user.email,
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
    message: "Password updated successfully",
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
    throw new Error("User not found");
  }

  return serializeData({
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    address: user.address,
    walletBalance: Number(user.walletBalance ?? 0),
    status: user.status,
    role: user.role?.name ?? "User",
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    permissions:
      user.role?.permissions.map((item) => item.permission.actionName) ??
      defaultUserPermissions,
  });
}

export async function listMyOrders(userId) {
  const orders = await prisma.order.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      orderItems: true,
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
      itemCount: order.orderItems.reduce((sum, item) => sum + item.quantity, 0),
    })),
  );
}

export async function getMyOrderDetail(userId, orderId) {
  const id = Number(orderId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid order id");
  }

  const order = await prisma.order.findFirst({
    where: { id, userId },
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

function createOtp() {
  return String(crypto.randomInt(100000, 1000000));
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
    throw new Error("Invalid or expired verification code");
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

  await mailTransport.sendMail({
    from: `TechBuiltAI <${env.EMAIL}>`,
    to: email,
    subject,
    text: [
      `Xin chào ${fullName || email},`,
      `Mã ${label} của bạn là: ${otp}`,
      `Mã này sẽ hết hạn sau ${env.OTP_EXPIRY_MINUTES} phút.`,
      "Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email này.",
    ].join("\n\n"),
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <p>Xin chào ${fullName || email},</p>
        <p>Mã <strong>${label}</strong> của bạn là:</p>
        <div style="font-size: 28px; letter-spacing: 6px; font-weight: 700; padding: 12px 18px; background: #ecfdf5; border-radius: 12px; display: inline-block;">${otp}</div>
        <p>Mã này sẽ hết hạn sau ${env.OTP_EXPIRY_MINUTES} phút.</p>
        <p>Nếu bạn không yêu cầu thao tác này, hãy bỏ qua email này.</p>
      </div>
    `,
  });
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
    throw new Error("User not found");
  }

  const normalizedFullName =
    input.fullName !== undefined
      ? normalizeAndValidateFullName(input.fullName, "Full name")
      : user.fullName;
  const normalizedPhone =
    input.phone !== undefined
      ? normalizeAndValidatePhoneNumber(input.phone)
      : user.phone;

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      fullName: normalizedFullName,
      phone: normalizedPhone,
      address:
        input.address !== undefined
          ? String(input.address ?? "").trim() || null
          : user.address,
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
    throw new Error("Invalid address id");
  }

  const existing = await prisma.userAddress.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new Error("Address not found");
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
    throw new Error("Invalid address id");
  }

  const existing = await prisma.userAddress.findFirst({
    where: { id, userId },
  });

  if (!existing) {
    throw new Error("Address not found");
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

  return serializeData({ message: "Address deleted" });
}

export async function changePassword(userId, input) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const isPasswordValid = await compare(
    input.currentPassword,
    user.passwordHash,
  );

  if (!isPasswordValid) {
    throw new Error("Current password is incorrect");
  }

  const newPasswordHash = await hash(input.newPassword, 10);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  return serializeData({
    message: "Password changed successfully",
  });
}

function buildAuthPayload(user) {
  const permissions =
    user.role?.permissions.map((item) => item.permission.actionName) ??
    defaultUserPermissions;

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role?.name ?? "User",
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
      role: user.role?.name ?? "User",
      permissions,
    },
  });
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
    throw new Error("Address line is required");
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
