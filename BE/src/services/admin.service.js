import { prisma } from "../db/prisma.js";
import { serializeData } from "../utils/serialize.js";
import {
  normalizeAndValidateFullName,
  normalizeAndValidatePhoneNumber,
} from "../utils/validation.js";
import { createWishlistCouponNotifications } from "./notification.service.js";

export const adminPermissionCatalog = [
  {
    actionName: "admin_dashboard_view",
    description: "Xem dashboard quản trị",
  },
  {
    actionName: "admin_users_view",
    description: "Chỉ xem danh sách người dùng",
  },
  {
    actionName: "admin_users_edit",
    description: "Xem và sửa người dùng",
  },
  {
    actionName: "admin_users_manage",
    description: "Quản lý người dùng (toàn quyền)",
  },
  {
    actionName: "admin_products_view",
    description: "Chỉ xem danh sách sản phẩm",
  },
  {
    actionName: "admin_products_edit",
    description: "Xem và sửa sản phẩm",
  },
  {
    actionName: "admin_products_manage",
    description: "Quản lý sản phẩm (toàn quyền)",
  },
  {
    actionName: "admin_orders_view",
    description: "Chỉ xem danh sách đơn hàng",
  },
  {
    actionName: "admin_orders_edit",
    description: "Xem và cập nhật trạng thái đơn hàng",
  },
  {
    actionName: "admin_orders_manage",
    description: "Quản lý đơn hàng (toàn quyền)",
  },
  {
    actionName: "admin_catalog_view",
    description: "Chỉ xem danh mục",
  },
  {
    actionName: "admin_catalog_edit",
    description: "Xem và sửa danh mục",
  },
  {
    actionName: "admin_catalog_manage",
    description: "Quản lý danh mục (toàn quyền)",
  },
  {
    actionName: "admin_vouchers_view",
    description: "Chỉ xem danh sách voucher",
  },
  {
    actionName: "admin_vouchers_edit",
    description: "Xem và sửa voucher",
  },
  {
    actionName: "admin_vouchers_manage",
    description: "Quản lý voucher (toàn quyền)",
  },
  {
    actionName: "admin_warehouse_view",
    description: "Chỉ xem kho",
  },
  {
    actionName: "admin_warehouse_edit",
    description: "Xem và cập nhật kho",
  },
  {
    actionName: "admin_warehouse_manage",
    description: "Quản lý kho (toàn quyền)",
  },
  {
    actionName: "admin_reviews_view",
    description: "Chỉ xem đánh giá",
  },
  {
    actionName: "admin_reviews_edit",
    description: "Xem và duyệt đánh giá",
  },
  {
    actionName: "admin_reviews_manage",
    description: "Quản lý đánh giá (toàn quyền)",
  },
  {
    actionName: "admin_chat_view",
    description: "Chỉ xem chat",
  },
  {
    actionName: "admin_chat_edit",
    description: "Xem và trả lời chat",
  },
  {
    actionName: "admin_chat_manage",
    description: "Quản lý chat (toàn quyền)",
  },
  {
    actionName: "admin_ai_build_view",
    description: "Chỉ xem cấu hình AI",
  },
  {
    actionName: "admin_ai_build_edit",
    description: "Xem và sửa cấu hình AI",
  },
  {
    actionName: "admin_ai_build_manage",
    description: "Quản lý cấu hình AI (toàn quyền)",
  },
  {
    actionName: "admin_verification_view",
    description: "Xem xác thực email",
  },
  {
    actionName: "admin_roles_view",
    description: "Chỉ xem phân quyền",
  },
  {
    actionName: "admin_roles_manage",
    description: "Quản lý phân quyền (toàn quyền)",
  },
];

export async function getAdminDashboard() {
  await ensureAdminPermissionCatalogInDb();

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
    allPermissions,
    suppliers,
    warehouses,
    reviews,
    chatRooms,
    aiBuilds,
    emailVerifications,
    lowStockProducts,
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
    prisma.coupon.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: {
        couponUsers: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    }),
    prisma.role.findMany({
      include: { permissions: { include: { permission: true } }, users: true },
    }),
    prisma.permission.findMany({
      orderBy: [{ actionName: "asc" }],
      select: {
        id: true,
        actionName: true,
        description: true,
      },
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
      include: {
        user: true,
        product: true,
        replies: {
          orderBy: { createdAt: "asc" },
          include: {
            user: true,
          },
        },
      },
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
    prisma.product.findMany({
      orderBy: [{ stockQuantity: "asc" }, { updatedAt: "desc" }],
      take: 100,
      select: {
        id: true,
        name: true,
        slug: true,
        stockQuantity: true,
        lowStockThreshold: true,
      },
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
    coupons: coupons.map(mapCoupon),
    roles: roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      userCount: role.users.length,
      permissions: role.permissions.map((item) => item.permission.actionName),
    })),
    permissionCatalog: allPermissions,
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
    lowStockProducts: lowStockProducts.filter(
      (item) =>
        Number(item.stockQuantity ?? 0) <= Number(item.lowStockThreshold ?? 0),
    ),
  });
}

export async function listReviewsForAdmin() {
  const reviews = await prisma.review.findMany({
    orderBy: [{ createdAt: "desc" }],
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      moderator: {
        select: {
          id: true,
          fullName: true,
          email: true,
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
    items: reviews.map(mapAdminReview),
  });
}

export async function moderateReviewByAdmin(
  adminUserId,
  reviewIdInput,
  input = {},
) {
  const reviewId = Number(reviewIdInput);
  const moderatorId = Number(adminUserId);
  const isHidden = Boolean(input.isHidden);
  const hiddenReason = String(input.hiddenReason ?? "").trim();

  if (!Number.isFinite(reviewId) || reviewId <= 0) {
    throw new Error("Invalid review id");
  }
  if (!Number.isFinite(moderatorId) || moderatorId <= 0) {
    throw new Error("Invalid admin id");
  }

  const existing = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!existing) {
    throw new Error("Review not found");
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      isHidden,
      hiddenReason: isHidden ? hiddenReason || null : null,
      moderatedBy: moderatorId,
      moderatedAt: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      moderator: {
        select: {
          id: true,
          fullName: true,
          email: true,
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

  return serializeData(mapAdminReview(updated));
}

export async function replyReviewByAdmin(
  adminUserId,
  reviewIdInput,
  input = {},
) {
  const reviewId = Number(reviewIdInput);
  const replierId = Number(adminUserId);
  const adminReply = String(input.reply ?? "").trim();

  if (!Number.isFinite(reviewId) || reviewId <= 0) {
    throw new Error("Invalid review id");
  }
  if (!Number.isFinite(replierId) || replierId <= 0) {
    throw new Error("Invalid admin id");
  }
  if (!adminReply) {
    throw new Error("Reply content is required");
  }
  if (adminReply.length > 2000) {
    throw new Error("Reply is too long");
  }

  const existing = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!existing) {
    throw new Error("Review not found");
  }

  const updated = await prisma.review.update({
    where: { id: reviewId },
    data: {
      adminReply,
      adminRepliedBy: replierId,
      adminRepliedAt: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      moderator: {
        select: {
          id: true,
          fullName: true,
          email: true,
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

  return serializeData(mapAdminReview(updated));
}

export async function deleteReviewByAdmin(reviewIdInput) {
  const reviewId = Number(reviewIdInput);
  if (!Number.isFinite(reviewId) || reviewId <= 0) {
    throw new Error("Invalid review id");
  }

  const existing = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!existing) {
    throw new Error("Review not found");
  }

  await prisma.review.delete({ where: { id: reviewId } });
  return serializeData({ id: reviewId, deleted: true });
}

export async function updateRolePermissionsByAdmin(roleIdInput, input = {}) {
  const roleId = Number(roleIdInput);
  if (!Number.isFinite(roleId) || roleId <= 0) {
    throw new Error("Invalid role id");
  }

  await ensureAdminPermissionCatalogInDb();

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      users: {
        select: { id: true },
      },
    },
  });

  if (!role) {
    throw new Error("Role not found");
  }

  const requestedPermissions = normalizePermissionActionList(input.permissions);
  const availablePermissions = await prisma.permission.findMany({
    where: {
      actionName: {
        in: requestedPermissions,
      },
    },
    select: {
      id: true,
      actionName: true,
    },
  });

  if (availablePermissions.length !== requestedPermissions.length) {
    throw new Error("One or more permissions do not exist");
  }

  const permissionIds = availablePermissions.map((item) => item.id);

  await prisma.$transaction(async (tx) => {
    await tx.rolePermission.deleteMany({
      where: { roleId },
    });

    if (permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }
  });

  const updatedRole = await prisma.role.findUnique({
    where: { id: roleId },
    include: {
      permissions: {
        include: {
          permission: true,
        },
      },
      users: {
        select: { id: true },
      },
    },
  });

  return serializeData({
    id: updatedRole.id,
    name: updatedRole.name,
    description: updatedRole.description,
    userCount: updatedRole.users.length,
    permissions: updatedRole.permissions.map(
      (item) => item.permission.actionName,
    ),
  });
}

export async function listPermissionTargetsForAdmin() {
  await ensureAdminPermissionCatalogInDb();

  const users = await prisma.user.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 200,
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

  return serializeData(
    users.map((user) => ({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      status: user.status,
      roleId: user.roleId,
      role: user.role
        ? {
            id: user.role.id,
            name: user.role.name,
            description: user.role.description,
          }
        : null,
      permissions: resolveEffectivePermissionsFromUser(user),
      rolePermissions:
        user.role?.permissions.map((item) => item.permission.actionName) ?? [],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })),
  );
}

export async function updateUserPermissionsByAdmin(userIdInput, input = {}) {
  const userId = Number(userIdInput);
  if (!Number.isFinite(userId) || userId <= 0) {
    throw new Error("Invalid user id");
  }

  await ensureAdminPermissionCatalogInDb();

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

  if (
    String(user.email ?? "")
      .trim()
      .toLowerCase() === "admin@gmail.com"
  ) {
    return serializeData({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      permissions: adminPermissionCatalog.map((item) => item.actionName),
      roleId: user.roleId,
      role: user.role,
    });
  }

  const requestedPermissions = normalizePermissionActionList(input.permissions);
  const availablePermissions = await prisma.permission.findMany({
    where: {
      actionName: {
        in: requestedPermissions,
      },
    },
    select: {
      id: true,
      actionName: true,
    },
  });

  if (availablePermissions.length !== requestedPermissions.length) {
    throw new Error("One or more permissions do not exist");
  }

  const permissionIds = availablePermissions.map((item) => item.id);
  const personalRoleName = `EMPLOYEE_USER_${user.id}`;
  const personalRoleDescription = `Quyen rieng cho ${user.fullName}`;

  const updatedUser = await prisma.$transaction(async (tx) => {
    let personalRole = await tx.role.findUnique({
      where: { name: personalRoleName },
    });

    if (!personalRole) {
      personalRole = await tx.role.create({
        data: {
          name: personalRoleName,
          description: personalRoleDescription,
        },
      });
    } else {
      await tx.role.update({
        where: { id: personalRole.id },
        data: {
          description: personalRoleDescription,
        },
      });
    }

    await tx.rolePermission.deleteMany({
      where: { roleId: personalRole.id },
    });

    if (permissionIds.length > 0) {
      await tx.rolePermission.createMany({
        data: permissionIds.map((permissionId) => ({
          roleId: personalRole.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }

    await tx.user.update({
      where: { id: user.id },
      data: {
        roleId: personalRole.id,
      },
    });

    return tx.user.findUnique({
      where: { id: user.id },
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

  return serializeData({
    id: updatedUser.id,
    email: updatedUser.email,
    fullName: updatedUser.fullName,
    roleId: updatedUser.roleId,
    role: updatedUser.role
      ? {
          id: updatedUser.role.id,
          name: updatedUser.role.name,
          description: updatedUser.role.description,
        }
      : null,
    permissions: resolveEffectivePermissionsFromUser(updatedUser),
    rolePermissions:
      updatedUser.role?.permissions.map((item) => item.permission.actionName) ??
      [],
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
    include: {
      couponUsers: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
    },
  });

  return serializeData(coupons.map(mapCoupon));
}

export async function createCouponByAdmin(input) {
  const couponScope = String(input.couponScope ?? "PRODUCT")
    .trim()
    .toUpperCase();
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
  const assignedUserIds = Array.from(
    new Set(
      (Array.isArray(input.assignedUserIds) ? input.assignedUserIds : [])
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0),
    ),
  );
  if (!["PRODUCT", "SHIPPING"].includes(couponScope)) {
    throw new Error("Invalid coupon scope");
  }

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

  if (assignedUserIds.length > 0) {
    const countUsers = await prisma.user.count({
      where: {
        id: {
          in: assignedUserIds,
        },
      },
    });
    if (countUsers !== assignedUserIds.length) {
      throw new Error("One or more assigned users do not exist");
    }
  }

  const created = await prisma.coupon.create({
    data: {
      code,
      couponScope,
      discountType,
      discountValue,
      minOrderValue,
      usageLimit,
      startDate,
      endDate,
      status,
      ...(assignedUserIds.length > 0
        ? {
            couponUsers: {
              create: assignedUserIds.map((userId) => ({ userId })),
            },
          }
        : {}),
    },
    include: {
      couponUsers: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
    },
  });

  await notifyWishlistUsersAboutCoupon(created);

  return serializeData(mapCoupon(created));
}

export async function updateCouponByAdmin(couponId, input) {
  const id = Number(couponId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("ID mã giảm giá không hợp lệ");
  }

  const current = await prisma.coupon.findUnique({ where: { id } });
  if (!current) {
    throw new Error("Không tìm thấy mã giảm giá");
  }

  const data = {};

  if (input.couponScope !== undefined) {
    const couponScope = String(input.couponScope ?? "")
      .trim()
      .toUpperCase();
    if (!["PRODUCT", "SHIPPING"].includes(couponScope)) {
      throw new Error("Invalid coupon scope");
    }
    data.couponScope = couponScope;
  }

  if (input.discountType !== undefined) {
    const discountType = String(input.discountType ?? "")
      .trim()
      .toUpperCase();
    if (!["PERCENT", "FIXED_AMOUNT"].includes(discountType)) {
      throw new Error("Invalid discount type");
    }
    data.discountType = discountType;
  }

  if (input.discountValue !== undefined) {
    const discountValue = Number(input.discountValue);
    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      throw new Error("Discount value must be greater than 0");
    }
    data.discountValue = discountValue;
  }

  const finalDiscountType = String(
    data.discountType ?? current.discountType,
  ).toUpperCase();
  const finalDiscountValue = Number(
    data.discountValue ?? current.discountValue,
  );
  if (finalDiscountType === "PERCENT" && finalDiscountValue > 100) {
    throw new Error("Percent discount cannot exceed 100");
  }

  if (input.minOrderValue !== undefined) {
    const minOrderValue = Number(input.minOrderValue);
    if (!Number.isFinite(minOrderValue) || minOrderValue < 0) {
      throw new Error("Min order value must be >= 0");
    }
    data.minOrderValue = minOrderValue;
  }

  if (input.usageLimit !== undefined) {
    const usageLimit = Number(input.usageLimit);
    if (!Number.isFinite(usageLimit) || usageLimit <= 0) {
      throw new Error("Usage limit must be greater than 0");
    }
    if (usageLimit < Number(current.usedCount ?? 0)) {
      throw new Error("Usage limit cannot be less than used count");
    }
    data.usageLimit = usageLimit;
  }

  if (input.startDate !== undefined) {
    const startDate = new Date(input.startDate);
    if (Number.isNaN(startDate.getTime())) {
      throw new Error("Invalid start date");
    }
    data.startDate = startDate;
  }

  if (input.endDate !== undefined) {
    const endDate = new Date(input.endDate);
    if (Number.isNaN(endDate.getTime())) {
      throw new Error("Invalid end date");
    }
    data.endDate = endDate;
  }

  const finalStartDate = data.startDate ?? current.startDate;
  const finalEndDate = data.endDate ?? current.endDate;
  if (finalEndDate <= finalStartDate) {
    throw new Error("End date must be later than start date");
  }

  if (input.status !== undefined) {
    const status = String(input.status ?? "")
      .trim()
      .toUpperCase();
    if (!["ACTIVE", "EXPIRED", "DISABLED"].includes(status)) {
      throw new Error("Invalid coupon status");
    }
    data.status = status;
  }

  if (input.assignedUserIds !== undefined) {
    const assignedUserIds = Array.from(
      new Set(
        (Array.isArray(input.assignedUserIds) ? input.assignedUserIds : [])
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value > 0),
      ),
    );

    if (assignedUserIds.length > 0) {
      const countUsers = await prisma.user.count({
        where: {
          id: {
            in: assignedUserIds,
          },
        },
      });
      if (countUsers !== assignedUserIds.length) {
        throw new Error("One or more assigned users do not exist");
      }
    }

    data.couponUsers = {
      deleteMany: {},
      ...(assignedUserIds.length > 0
        ? {
            create: assignedUserIds.map((userId) => ({ userId })),
          }
        : {}),
    };
  }

  const updated = await prisma.coupon.update({
    where: { id },
    data,
    include: {
      couponUsers: {
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (String(updated.status ?? "").toUpperCase() === "ACTIVE") {
    await notifyWishlistUsersAboutCoupon(updated);
  }

  return serializeData(mapCoupon(updated));
}

export async function deleteCouponByAdmin(couponId) {
  const id = Number(couponId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("ID mã giảm giá không hợp lệ");
  }

  const current = await prisma.coupon.findUnique({
    where: { id },
    include: {
      _count: {
        select: { orders: true, shippingOrders: true },
      },
    },
  });

  if (!current) {
    throw new Error("Không tìm thấy mã giảm giá");
  }

  await prisma.$transaction(async (tx) => {
    await tx.order.updateMany({
      where: { couponId: id },
      data: { couponId: null },
    });

    await tx.order.updateMany({
      where: { shippingCouponId: id },
      data: { shippingCouponId: null },
    });

    await tx.coupon.delete({ where: { id } });
  });

  return serializeData({
    success: true,
    message: "Mã giảm giá đã được xóa thành công",
  });
}

export async function getWarehouseOverviewByAdmin() {
  const [warehouses, recentBatches, suppliers, products] = await Promise.all([
    prisma.warehouse.findMany({
      orderBy: [{ id: "desc" }],
      include: {
        batches: {
          orderBy: [{ createdAt: "desc" }],
          include: {
            product: {
              select: {
                id: true,
                name: true,
                stockQuantity: true,
              },
            },
            supplier: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          take: 20,
        },
      },
    }),
    prisma.batch.findMany({
      orderBy: [{ createdAt: "desc" }],
      include: {
        warehouse: {
          select: {
            id: true,
            name: true,
          },
        },
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        supplier: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 200,
    }),
    prisma.supplier.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.product.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        stockQuantity: true,
        lowStockThreshold: true,
      },
    }),
  ]);

  return serializeData({
    summary: {
      totalWarehouses: warehouses.length,
      totalBatches: recentBatches.length,
      totalProducts: products.length,
      totalStockQuantity: products.reduce(
        (sum, item) => sum + Number(item.stockQuantity ?? 0),
        0,
      ),
    },
    warehouses,
    batches: recentBatches,
    suppliers,
    products,
    lowStockProducts: products.filter(
      (item) =>
        Number(item.stockQuantity ?? 0) <= Number(item.lowStockThreshold ?? 0),
    ),
  });
}

export async function createWarehouseByAdmin(input) {
  const name = String(input.name ?? "").trim();
  const address = String(input.address ?? "").trim();
  const managerName = String(input.managerName ?? "").trim();

  if (!name) {
    throw new Error("Warehouse name is required");
  }

  const created = await prisma.warehouse.create({
    data: {
      name,
      address: address || null,
      managerName: managerName || null,
    },
  });

  return serializeData(created);
}

export async function updateWarehouseByAdmin(warehouseId, input) {
  const id = Number(warehouseId);
  if (!Number.isFinite(id) || id <= 0) {
    throw new Error("Invalid warehouse id");
  }

  const existing = await prisma.warehouse.findUnique({ where: { id } });
  if (!existing) {
    throw new Error("Warehouse not found");
  }

  const data = {};
  if (input.name !== undefined) {
    const name = String(input.name ?? "").trim();
    if (!name) {
      throw new Error("Warehouse name is required");
    }
    data.name = name;
  }

  if (input.address !== undefined) {
    data.address = String(input.address ?? "").trim() || null;
  }

  if (input.managerName !== undefined) {
    data.managerName = String(input.managerName ?? "").trim() || null;
  }

  const updated = await prisma.warehouse.update({
    where: { id },
    data,
  });

  return serializeData(updated);
}

export async function createBatchImportByAdmin(input) {
  const warehouseId = Number(input.warehouseId);
  const productId = Number(input.productId);
  const supplierId = Number(input.supplierId);
  const quantity = Number(input.quantity);
  const importPrice = Number(input.importPrice);
  const customBatchCode = String(input.batchCode ?? "").trim();

  if (!Number.isFinite(warehouseId) || warehouseId <= 0) {
    throw new Error("Invalid warehouse id");
  }
  if (!Number.isFinite(productId) || productId <= 0) {
    throw new Error("Invalid product id");
  }
  if (!Number.isFinite(supplierId) || supplierId <= 0) {
    throw new Error("Invalid supplier id");
  }
  if (!Number.isFinite(quantity) || quantity <= 0) {
    throw new Error("Quantity must be greater than 0");
  }
  if (!Number.isFinite(importPrice) || importPrice <= 0) {
    throw new Error("Import price must be greater than 0");
  }

  const [warehouse, product, supplier] = await Promise.all([
    prisma.warehouse.findUnique({
      where: { id: warehouseId },
      select: { id: true },
    }),
    prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    }),
    prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { id: true },
    }),
  ]);

  if (!warehouse) {
    throw new Error("Warehouse not found");
  }
  if (!product) {
    throw new Error("Product not found");
  }
  if (!supplier) {
    throw new Error("Supplier not found");
  }

  const batchCode = customBatchCode || buildBatchCode(productId, warehouseId);

  const existingBatch = await prisma.batch.findUnique({ where: { batchCode } });
  if (existingBatch) {
    throw new Error("Batch code already exists");
  }

  const created = await prisma.$transaction(async (tx) => {
    const batch = await tx.batch.create({
      data: {
        batchCode,
        productId,
        warehouseId,
        supplierId,
        importPrice,
        quantity,
      },
      include: {
        warehouse: true,
        product: true,
        supplier: true,
      },
    });

    await tx.product.update({
      where: { id: productId },
      data: {
        stockQuantity: {
          increment: quantity,
        },
      },
    });

    return batch;
  });

  return serializeData(created);
}

function buildBatchCode(productId, warehouseId) {
  const dateText = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `B${dateText}-P${productId}-W${warehouseId}-${randomPart}`;
}

function mapAdminReview(review) {
  return {
    id: review.id,
    rating: Number(review.rating ?? 0),
    comment: review.comment ? String(review.comment) : "",
    isHidden: Boolean(review.isHidden),
    hiddenReason: review.hiddenReason ? String(review.hiddenReason) : "",
    moderatedAt: review.moderatedAt,
    adminReply: review.adminReply ? String(review.adminReply) : "",
    adminRepliedAt: review.adminRepliedAt,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    user: review.user
      ? {
          id: review.user.id,
          fullName:
            String(review.user.fullName ?? "").trim() ||
            String(review.user.email ?? "Ẩn danh"),
          email: review.user.email ?? "",
        }
      : null,
    product: review.product
      ? {
          id: review.product.id,
          name: review.product.name ?? "",
          slug: review.product.slug ?? "",
        }
      : null,
    moderator: review.moderator
      ? {
          id: review.moderator.id,
          fullName:
            String(review.moderator.fullName ?? "").trim() ||
            String(review.moderator.email ?? "Admin"),
        }
      : null,
    replier: review.replier
      ? {
          id: review.replier.id,
          fullName:
            String(review.replier.fullName ?? "").trim() ||
            String(review.replier.email ?? "Admin"),
        }
      : null,
  };
}

function mapCoupon(coupon) {
  return {
    id: coupon.id,
    code: coupon.code,
    couponScope: coupon.couponScope,
    discountType: coupon.discountType,
    discountValue: coupon.discountValue,
    minOrderValue: coupon.minOrderValue,
    usageLimit: coupon.usageLimit,
    usedCount: coupon.usedCount,
    status: coupon.status,
    startDate: coupon.startDate,
    endDate: coupon.endDate,
    createdAt: coupon.createdAt,
    assignedUsers: (coupon.couponUsers ?? []).map((item) => ({
      id: item.user?.id ?? item.userId,
      fullName: item.user?.fullName ?? null,
      email: item.user?.email ?? null,
    })),
    assignedUserIds: (coupon.couponUsers ?? []).map(
      (item) => item.user?.id ?? item.userId,
    ),
  };
}

async function notifyWishlistUsersAboutCoupon(coupon) {
  if (String(coupon?.status ?? "").toUpperCase() !== "ACTIVE") {
    return;
  }

  const wishlistProductIds = await prisma.wishlistItem.findMany({
    distinct: ["productId"],
    select: {
      productId: true,
    },
  });

  if (wishlistProductIds.length === 0) {
    return;
  }

  await createWishlistCouponNotifications(
    coupon,
    wishlistProductIds.map((item) => item.productId),
  );
}

async function ensureAdminPermissionCatalogInDb() {
  await prisma.permission.createMany({
    data: adminPermissionCatalog,
    skipDuplicates: true,
  });
}

function normalizePermissionActionList(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((item) => String(item ?? "").trim())
        .filter(Boolean),
    ),
  );
}

function resolveEffectivePermissionsFromUser(user) {
  const rolePermissions =
    user?.role?.permissions?.map((item) => item.permission.actionName) ?? [];

  if (
    String(user?.email ?? "")
      .trim()
      .toLowerCase() === "admin@gmail.com"
  ) {
    return adminPermissionCatalog.map((item) => item.actionName);
  }

  return Array.from(new Set(rolePermissions.filter(Boolean)));
}
