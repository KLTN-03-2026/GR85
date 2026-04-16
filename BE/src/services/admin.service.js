import { prisma } from "../db/prisma.js";
import { serializeData } from "../utils/serialize.js";
import {
  normalizeAndValidateFullName,
  normalizeAndValidatePhoneNumber,
} from "../utils/validation.js";

export async function getAdminDashboard() {
  const [
    totalUsers,
    totalOrders,
    totalProducts,
    totalRevenue,
    orderStatuses,
    userStatuses,
    users,
    products,
    orders,
    coupons,
    roles,
    suppliers,
    warehouses,
    reviews,
    chatRooms,
    aiBuilds,
    emailVerifications,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.order.count(),
    prisma.product.count(),
    prisma.order.aggregate({ _sum: { totalAmount: true } }),
    prisma.order.groupBy({
      by: ["orderStatus"],
      _count: { orderStatus: true },
    }),
    prisma.user.groupBy({
      by: ["status"],
      _count: { status: true },
    }),
    prisma.user.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { role: true },
    }),
    prisma.product.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { category: true, supplier: true },
    }),
    prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: true, coupon: true },
    }),
    prisma.coupon.findMany({ take: 10, orderBy: { createdAt: "desc" } }),
    prisma.role.findMany({
      include: { permissions: { include: { permission: true } }, users: true },
    }),
    prisma.supplier.findMany({ take: 10, orderBy: { id: "desc" } }),
    prisma.warehouse.findMany({
      take: 10,
      orderBy: { id: "desc" },
      include: { batches: true },
    }),
    prisma.review.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: true, product: true },
    }),
    prisma.chatRoom.findMany({
      take: 10,
      orderBy: { updatedAt: "desc" },
      include: {
        user: true,
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
    prisma.aiSavedBuild.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: true, aiBuildItems: true },
    }),
    prisma.emailVerification.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return serializeData({
    summary: {
      totalUsers,
      totalOrders,
      totalProducts,
      totalRevenue: totalRevenue._sum.totalAmount ?? 0,
    },
    orderStatuses,
    userStatuses,
    users,
    products,
    orders,
    coupons,
    roles: roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      userCount: role.users.length,
      permissions: role.permissions.map((item) => item.permission.actionName),
    })),
    suppliers,
    warehouses,
    reviews,
    chatRooms: chatRooms.map((room) => ({
      id: room.id,
      status: room.status,
      customer: room.user.fullName,
      customerEmail: room.user.email,
      lastMessage: room.messages[0]?.content ?? null,
      updatedAt: room.updatedAt,
    })),
    aiBuilds: aiBuilds.map((build) => ({
      id: build.id,
      buildName: build.buildName,
      totalPrice: build.totalPrice,
      owner: build.user.fullName,
      itemCount: build.aiBuildItems.length,
      createdAt: build.createdAt,
    })),
    emailVerifications,
  });
}

export async function updateUserByAdmin(userId, input) {
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid user id");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id },
  });

  if (!currentUser) {
    throw new Error("User not found");
  }

  const data = {};

  if (input.fullName !== undefined) {
    data.fullName = normalizeAndValidateFullName(input.fullName, "Full name");
  }

  if (input.email !== undefined) {
    const email = String(input.email ?? "")
      .trim()
      .toLowerCase();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Invalid email");
    }

    const duplicate = await prisma.user.findFirst({
      where: {
        email,
        id: { not: id },
      },
      select: { id: true },
    });

    if (duplicate) {
      throw new Error("Email already in use");
    }

    data.email = email;
  }

  if (input.phone !== undefined) {
    data.phone = normalizeAndValidatePhoneNumber(input.phone);
  }

  if (input.address !== undefined) {
    const address = String(input.address ?? "").trim();
    data.address = address || null;
  }

  if (input.avatarUrl !== undefined) {
    const avatarUrl = String(input.avatarUrl ?? "").trim();
    if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
      throw new Error("Avatar URL must start with http:// or https://");
    }
    data.avatarUrl = avatarUrl || null;
  }

  if (input.roleId !== undefined) {
    const roleId = input.roleId === null ? null : Number(input.roleId);
    if (roleId !== null) {
      if (!Number.isFinite(roleId) || roleId <= 0) {
        throw new Error("Invalid role id");
      }

      const role = await prisma.role.findUnique({ where: { id: roleId } });
      if (!role) {
        throw new Error("Role not found");
      }
    }

    data.roleId = roleId;
  }

  if (input.status !== undefined) {
    data.status = String(input.status).trim().toUpperCase();
  }

  const updated = await prisma.user.update({
    where: { id },
    data,
    include: { role: true },
  });

  return serializeData(updated);
}

export async function getUserDetailByAdmin(userId) {
  const id = Number(userId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid user id");
  }

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      role: true,
      addresses: {
        orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
      },
      orders: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          orderItems: true,
          coupon: true,
        },
      },
      walletTransactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
        include: { order: true },
      },
      returnRequests: {
        orderBy: { requestedAt: "desc" },
        take: 20,
        include: { order: true },
      },
      reviews: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { product: true },
      },
      chatRooms: {
        orderBy: { updatedAt: "desc" },
        take: 10,
        include: {
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const response = {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    address: user.address,
    avatarUrl: user.avatarUrl,
    walletBalance: user.walletBalance,
    status: user.status,
    roleId: user.roleId,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    addresses: user.addresses,
    orders: user.orders.map((order) => ({
      ...order,
      itemCount: order.orderItems.length,
    })),
    walletTransactions: user.walletTransactions,
    returnRequests: user.returnRequests,
    reviews: user.reviews,
    chatRooms: user.chatRooms.map((room) => ({
      id: room.id,
      status: room.status,
      updatedAt: room.updatedAt,
      lastMessage: room.messages[0]?.content ?? null,
      lastMessageAt: room.messages[0]?.createdAt ?? null,
    })),
  };

  return serializeData(response);
}

export async function listCouponsForAdmin() {
  const coupons = await prisma.coupon.findMany({
    orderBy: [{ createdAt: "desc" }],
  });

  return serializeData(coupons.map(mapCoupon));
}

export async function createCouponByAdmin(input) {
  const code = String(input.code ?? "")
    .trim()
    .toUpperCase();
  const discountType = String(input.discountType ?? "")
    .trim()
    .toUpperCase();
  const discountValue = Number(input.discountValue);
  const minOrderValue = Number(input.minOrderValue ?? 0);
  const usageLimit = Number(input.usageLimit ?? 100);
  const startDate = new Date(input.startDate);
  const endDate = new Date(input.endDate);
  const status = String(input.status ?? "ACTIVE")
    .trim()
    .toUpperCase();

  if (!code) {
    throw new Error("Coupon code is required");
  }

  if (!["PERCENT", "FIXED_AMOUNT"].includes(discountType)) {
    throw new Error("Invalid discount type");
  }

  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    throw new Error("Discount value must be greater than 0");
  }

  if (discountType === "PERCENT" && discountValue > 100) {
    throw new Error("Percent discount cannot exceed 100");
  }

  if (!Number.isFinite(minOrderValue) || minOrderValue < 0) {
    throw new Error("Min order value must be >= 0");
  }

  if (!Number.isFinite(usageLimit) || usageLimit <= 0) {
    throw new Error("Usage limit must be greater than 0");
  }

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error("Invalid start/end date");
  }

  if (endDate <= startDate) {
    throw new Error("End date must be later than start date");
  }

  if (!["ACTIVE", "EXPIRED", "DISABLED"].includes(status)) {
    throw new Error("Invalid coupon status");
  }

  const existing = await prisma.coupon.findUnique({ where: { code } });
  if (existing) {
    throw new Error("Coupon code already exists");
  }

  const created = await prisma.coupon.create({
    data: {
      code,
      discountType,
      discountValue,
      minOrderValue,
      usageLimit,
      startDate,
      endDate,
      status,
    },
  });

  return serializeData(mapCoupon(created));
}

function mapCoupon(coupon) {
  return {
    id: coupon.id,
    code: coupon.code,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minOrderValue: coupon.minOrderValue,
    usageLimit: coupon.usageLimit,
    usedCount: coupon.usedCount,
    status: coupon.status,
    startDate: coupon.startDate,
    endDate: coupon.endDate,
    createdAt: coupon.createdAt,
  };
}
