import { prisma } from "../db/prisma.js";
import { serializeData } from "../utils/serialize.js";

export async function getAdminDashboard() {
  const [
    totalUsers,
    totalOrders,
    totalProducts,
    totalRevenue,
    orderStatuses,
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
    const fullName = String(input.fullName).trim();
    if (!fullName) {
      throw new Error("Full name is required");
    }
    data.fullName = fullName;
  }

  if (input.phone !== undefined) {
    const phone = String(input.phone ?? "").trim();
    data.phone = phone || null;
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
