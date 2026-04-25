import { Router } from "express";
import { z } from "zod";
import {
  createBatchImportByAdmin,
  createCouponByAdmin,
  createWarehouseByAdmin,
  deleteReviewByAdmin,
  deleteCouponByAdmin,
  getAdminDashboard,
  listReviewsForAdmin,
  moderateReviewByAdmin,
  replyReviewByAdmin,
  getWarehouseOverviewByAdmin,
  getUserDetailByAdmin,
  listCouponsForAdmin,
  listPermissionTargetsForAdmin,
  updateRolePermissionsByAdmin,
  updateCouponByAdmin,
  updateWarehouseByAdmin,
  updateUserPermissionsByAdmin,
  updateUserByAdmin,
} from "../../services/admin.service.js";
import {
  listReturnRequestsForAdmin,
  reviewReturnRequestByAdmin,
} from "../../services/wallet.service.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

const updateUserSchema = z.object({
  fullName: z
    .string()
    .min(2)
    .max(100)
    .refine((value) => !/\d/.test(value), {
      message: "Họ và tên không được chứa số",
    })
    .optional(),
  email: z.string().email().optional(),
  phone: z
    .string()
    .regex(/^\d{10}$/)
    .optional(),
  address: z.string().max(2000).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  roleId: z.number().int().positive().nullable().optional(),
  status: z.enum(["ACTIVE", "BANNED", "UNVERIFIED"]).optional(),
});

router.get("/users/:userId/detail", requireAuth, async (req, res) => {
  try {
    if (!isAdminRole(req.auth.role)) {
      return res
        .status(403)
        .json({
          message: "Chỉ quản trị viên mới có thể truy cập endpoint này",
        });
    }
    if (!hasPermission(req, "admin_users_manage")) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thực hiện chức năng này" });
    }

    const data = await getUserDetailByAdmin(req.params.userId);
    return res.json(data);
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message.includes("not found") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }

    return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
  }
});

router.get("/permission-targets", requireAuth, async (req, res) => {
  try {
    if (!isAdminRole(req.auth.role)) {
      return res
        .status(403)
        .json({ message: "Only admins can access this endpoint" });
    }
    if (!hasPermission(req, "admin_roles_manage")) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thực hiện chức năng này" });
    }

    const data = await listPermissionTargetsForAdmin();
    return res.json(data);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Unexpected server error" });
  }
});

const createCouponSchema = z.object({
  code: z.string().min(2).max(50),
  couponScope: z.enum(["PRODUCT", "SHIPPING"]).default("PRODUCT"),
  discountType: z.enum(["PERCENT", "FIXED_AMOUNT"]),
  discountValue: z.number().positive(),
  minOrderValue: z.number().min(0).default(0),
  usageLimit: z.number().int().positive().default(100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z.enum(["ACTIVE", "EXPIRED", "DISABLED"]).default("ACTIVE"),
  assignedUserIds: z.array(z.number().int().positive()).optional().default([]),
});

const updateCouponSchema = z.object({
  couponScope: z.enum(["PRODUCT", "SHIPPING"]).optional(),
  discountType: z.enum(["PERCENT", "FIXED_AMOUNT"]).optional(),
  discountValue: z.number().positive().optional(),
  minOrderValue: z.number().min(0).optional(),
  usageLimit: z.number().int().positive().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  status: z.enum(["ACTIVE", "EXPIRED", "DISABLED"]).optional(),
  assignedUserIds: z.array(z.number().int().positive()).optional(),
});

const reviewReturnSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  rejectReason: z.string().max(2000).optional(),
  refundAmount: z.number().positive().optional(),
});

const warehouseSchema = z.object({
  name: z.string().min(1).max(255),
  address: z.string().max(500).nullable().optional(),
  managerName: z.string().max(255).nullable().optional(),
});

const importBatchSchema = z.object({
  warehouseId: z.number().int().positive(),
  productId: z.number().int().positive(),
  supplierId: z.number().int().positive(),
  importPrice: z.number().positive(),
  quantity: z.number().int().positive(),
  batchCode: z.string().max(64).optional(),
});

const updateRolePermissionsSchema = z.object({
  permissions: z.array(z.string().min(1)).default([]),
});

const updateUserPermissionsSchema = z.object({
  permissions: z.array(z.string().min(1)).default([]),
});

const moderateReviewSchema = z.object({
  isHidden: z.boolean(),
  hiddenReason: z.string().max(2000).optional(),
});

const reviewReplySchema = z.object({
  reply: z.string().min(1).max(2000),
});

function isAdminRole(role) {
  const normalizedRole = String(role ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

  return (
    normalizedRole.includes("admin") || normalizedRole.includes("quan tri")
  );
}

function hasPermission(req, permission) {
  return (
    Array.isArray(req.auth?.permissions) &&
    req.auth.permissions.includes(permission)
  );
}

router.get("/reviews", requireAuth, async (req, res) => {
  try {
    if (!isAdminRole(req.auth.role)) {
      return res
        .status(403)
        .json({
          message: "Chỉ quản trị viên mới có thể truy cập endpoint này",
        });
    }
    if (!hasPermission(req, "admin_reviews_manage")) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thực hiện chức năng này" });
    }

    const data = await listReviewsForAdmin();
    return res.json(data);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
  }
});

router.patch("/reviews/:reviewId/moderate", requireAuth, async (req, res) => {
  try {
    if (!isAdminRole(req.auth.role)) {
      return res
        .status(403)
        .json({
          message: "Chỉ quản trị viên mới có thể truy cập endpoint này",
        });
    }
    if (!hasPermission(req, "admin_reviews_manage")) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thực hiện chức năng này" });
    }

    const parsed = moderateReviewSchema.parse(req.body ?? {});
    const data = await moderateReviewByAdmin(
      Number(req.auth?.sub),
      req.params.reviewId,
      parsed,
    );
    return res.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({
          message: "Dữ liệu yêu cầu không hợp lệ",
          issues: error.flatten(),
        });
    }

    if (error instanceof Error) {
      const status = error.message.includes("not found") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }

    return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
  }
});

router.patch("/reviews/:reviewId/reply", requireAuth, async (req, res) => {
  try {
    if (!isAdminRole(req.auth.role)) {
      return res
        .status(403)
        .json({
          message: "Chỉ quản trị viên mới có thể truy cập endpoint này",
        });
    }
    if (!hasPermission(req, "admin_reviews_manage")) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thực hiện chức năng này" });
    }

    const parsed = reviewReplySchema.parse(req.body ?? {});
    const data = await replyReviewByAdmin(
      Number(req.auth?.sub),
      req.params.reviewId,
      parsed,
    );
    return res.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({
          message: "Dữ liệu yêu cầu không hợp lệ",
          issues: error.flatten(),
        });
    }

    if (error instanceof Error) {
      const status = error.message.includes("not found") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }

    return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
  }
});

router.delete("/reviews/:reviewId", requireAuth, async (req, res) => {
  try {
    if (!isAdminRole(req.auth.role)) {
      return res
        .status(403)
        .json({
          message: "Chỉ quản trị viên mới có thể truy cập endpoint này",
        });
    }
    if (!hasPermission(req, "admin_reviews_manage")) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thực hiện chức năng này" });
    }

    const data = await deleteReviewByAdmin(req.params.reviewId);
    return res.json(data);
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message.includes("not found") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }

    return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
  }
});

router.get("/dashboard", requireAuth, async (req, res) => {
  try {
    // Check if user is Admin
    if (!isAdminRole(req.auth.role)) {
      return res
        .status(403)
        .json({
          message: "Chỉ quản trị viên mới có thể truy cập endpoint này",
        });
    }
    if (!hasPermission(req, "admin_dashboard_view")) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thực hiện chức năng này" });
    }

    const data = await getAdminDashboard();
    return res.json(data);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
  }
});

router.patch("/users/:userId", requireAuth, async (req, res) => {
  try {
    if (!isAdminRole(req.auth.role)) {
      return res
        .status(403)
        .json({
          message: "Chỉ quản trị viên mới có thể truy cập endpoint này",
        });
    }
    if (!hasPermission(req, "admin_users_manage")) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thực hiện chức năng này" });
    }

    const parsed = updateUserSchema.parse(req.body);
    const data = await updateUserByAdmin(req.params.userId, parsed);
    return res.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Dữ liệu yêu cầu không hợp lệ" });
    }

    if (error instanceof Error) {
      const status = error.message.includes("not found") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }

    return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
  }
});

router.get("/coupons", requireAuth, async (req, res) => {
  try {
    if (!isAdminRole(req.auth.role)) {
      return res
        .status(403)
        .json({
          message: "Chỉ quản trị viên mới có thể truy cập endpoint này",
        });
    }
    if (!hasPermission(req, "admin_vouchers_manage")) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thực hiện chức năng này" });
    }

    const data = await listCouponsForAdmin();
    return res.json(data);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
  }
});

router.post("/coupons", requireAuth, async (req, res) => {
  try {
    if (!isAdminRole(req.auth.role)) {
      return res
        .status(403)
        .json({
          message: "Chỉ quản trị viên mới có thể truy cập endpoint này",
        });
    }
    if (!hasPermission(req, "admin_vouchers_manage")) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thực hiện chức năng này" });
    }

    const parsed = createCouponSchema.parse(req.body);
    const data = await createCouponByAdmin(parsed);
    return res.status(201).json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({
          message: "Dữ liệu yêu cầu không hợp lệ",
          issues: error.flatten(),
        });
    }

    if (error instanceof Error) {
      const status = error.message.includes("already exists") ? 409 : 400;
      return res.status(status).json({ message: error.message });
    }

    return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
  }
});

router.patch("/coupons/:couponId", requireAuth, async (req, res) => {
  try {
    if (!isAdminRole(req.auth.role)) {
      return res
        .status(403)
        .json({
          message: "Chỉ quản trị viên mới có thể truy cập endpoint này",
        });
    }
    if (!hasPermission(req, "admin_vouchers_manage")) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thực hiện chức năng này" });
    }

    const parsed = updateCouponSchema.parse(req.body ?? {});
    const data = await updateCouponByAdmin(req.params.couponId, parsed);
    return res.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({
          message: "Dữ liệu yêu cầu không hợp lệ",
          issues: error.flatten(),
        });
    }

    if (error instanceof Error) {
      const status = error.message.includes("not found") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }

    return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
  }
});

router.delete("/coupons/:couponId", requireAuth, async (req, res) => {
  try {
    if (!isAdminRole(req.auth.role)) {
      return res
        .status(403)
        .json({
          message: "Chỉ quản trị viên mới có thể truy cập endpoint này",
        });
    }
    if (!hasPermission(req, "admin_vouchers_manage")) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thực hiện chức năng này" });
    }

    const data = await deleteCouponByAdmin(req.params.couponId);
    return res.json(data);
  } catch (error) {
    if (error instanceof Error) {
      const status = error.message.includes("not found") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }

    return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
  }
});

router.get("/warehouse/overview", requireAuth, async (req, res) => {
  try {
    if (!isAdminRole(req.auth.role)) {
      return res
        .status(403)
        .json({
          message: "Chỉ quản trị viên mới có thể truy cập endpoint này",
        });
    }
    if (!hasPermission(req, "admin_warehouse_manage")) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thực hiện chức năng này" });
    }

    const data = await getWarehouseOverviewByAdmin();
    return res.json(data);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
  }
});

router.post("/warehouses", requireAuth, async (req, res) => {
  try {
    if (!isAdminRole(req.auth.role)) {
      return res
        .status(403)
        .json({
          message: "Chỉ quản trị viên mới có thể truy cập endpoint này",
        });
    }
    if (!hasPermission(req, "admin_warehouse_manage")) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thực hiện chức năng này" });
    }

    const parsed = warehouseSchema.parse(req.body);
    const data = await createWarehouseByAdmin(parsed);
    return res.status(201).json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({
          message: "Dữ liệu yêu cầu không hợp lệ",
          issues: error.flatten(),
        });
    }

    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
  }
});

router.patch("/warehouses/:warehouseId", requireAuth, async (req, res) => {
  try {
    if (!isAdminRole(req.auth.role)) {
      return res
        .status(403)
        .json({
          message: "Chỉ quản trị viên mới có thể truy cập endpoint này",
        });
    }
    if (!hasPermission(req, "admin_warehouse_manage")) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thực hiện chức năng này" });
    }

    const parsed = warehouseSchema.partial().parse(req.body);
    const data = await updateWarehouseByAdmin(req.params.warehouseId, parsed);
    return res.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({
          message: "Dữ liệu yêu cầu không hợp lệ",
          issues: error.flatten(),
        });
    }

    if (error instanceof Error) {
      const status = error.message.includes("not found") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }

    return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
  }
});

router.post("/warehouse/import-batch", requireAuth, async (req, res) => {
  try {
    if (!isAdminRole(req.auth.role)) {
      return res
        .status(403)
        .json({
          message: "Chỉ quản trị viên mới có thể truy cập endpoint này",
        });
    }
    if (!hasPermission(req, "admin_warehouse_manage")) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thực hiện chức năng này" });
    }

    const parsed = importBatchSchema.parse(req.body);
    const data = await createBatchImportByAdmin(parsed);
    return res.status(201).json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({
          message: "Dữ liệu yêu cầu không hợp lệ",
          issues: error.flatten(),
        });
    }

    if (error instanceof Error) {
      const status = error.message.includes("not found") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }

    return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
  }
});

router.get("/returns", requireAuth, async (req, res) => {
  try {
    if (!isAdminRole(req.auth.role)) {
      return res
        .status(403)
        .json({
          message: "Chỉ quản trị viên mới có thể truy cập endpoint này",
        });
    }
    if (!hasPermission(req, "admin_orders_manage")) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thực hiện chức năng này" });
    }

    const data = await listReturnRequestsForAdmin();
    return res.json(data);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
  }
});

router.patch("/returns/:requestId/review", requireAuth, async (req, res) => {
  try {
    if (!isAdminRole(req.auth.role)) {
      return res
        .status(403)
        .json({
          message: "Chỉ quản trị viên mới có thể truy cập endpoint này",
        });
    }
    if (!hasPermission(req, "admin_orders_manage")) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thực hiện chức năng này" });
    }

    const parsed = reviewReturnSchema.parse(req.body);
    const data = await reviewReturnRequestByAdmin(
      Number(req.auth?.sub),
      Number(req.params.requestId),
      parsed,
    );
    return res.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({
          message: "Dữ liệu yêu cầu không hợp lệ",
          issues: error.flatten(),
        });
    }

    if (error instanceof Error) {
      const status = error.message.includes("not found") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }

    return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
  }
});

router.delete(
  "/users/:userId/wallet-transactions/:transactionId",
  requireAuth,
  async (req, res) => {
    try {
      if (!isAdminRole(req.auth.role)) {
        return res
          .status(403)
          .json({
            message: "Chỉ quản trị viên mới có thể truy cập endpoint này",
          });
      }
      if (!hasPermission(req, "admin_users_manage")) {
        return res
          .status(403)
          .json({ message: "Bạn không có quyền thực hiện chức năng này" });
      }

      const userId = Number(req.params.userId);
      const transactionId = Number(req.params.transactionId);

      if (!Number.isFinite(userId) || !Number.isFinite(transactionId)) {
        return res
          .status(400)
          .json({ message: "ID người dùng hoặc ID giao dịch không hợp lệ" });
      }

      const { deleteWalletTransaction } =
        await import("../../services/wallet.service.js");
      await deleteWalletTransaction(transactionId);

      return res.json({ success: true, message: "Giao dịch ví đã được xóa" });
    } catch (error) {
      if (error instanceof Error) {
        const status = error.message.includes("not found") ? 404 : 400;
        return res.status(status).json({ message: error.message });
      }

      return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
    }
  },
);

router.patch("/users/:userId/permissions", requireAuth, async (req, res) => {
  try {
    if (!isAdminRole(req.auth.role)) {
      return res
        .status(403)
        .json({ message: "Only admins can access this endpoint" });
    }
    if (!hasPermission(req, "admin_roles_manage")) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thực hiện chức năng này" });
    }

    const parsed = updateUserPermissionsSchema.parse(req.body ?? {});
    const data = await updateUserPermissionsByAdmin(req.params.userId, parsed);
    return res.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid request data", issues: error.flatten() });
    }

    if (error instanceof Error) {
      const status = error.message.includes("not found") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }

    return res.status(500).json({ message: "Unexpected server error" });
  }
});

router.patch("/roles/:roleId/permissions", requireAuth, async (req, res) => {
  try {
    if (!isAdminRole(req.auth.role)) {
      return res
        .status(403)
        .json({ message: "Only admins can access this endpoint" });
    }
    if (!hasPermission(req, "admin_roles_manage")) {
      return res
        .status(403)
        .json({ message: "Bạn không có quyền thực hiện chức năng này" });
    }

    const parsed = updateRolePermissionsSchema.parse(req.body ?? {});
    const data = await updateRolePermissionsByAdmin(req.params.roleId, parsed);
    return res.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res
        .status(400)
        .json({ message: "Invalid request data", issues: error.flatten() });
    }

    if (error instanceof Error) {
      const status = error.message.includes("not found") ? 404 : 400;
      return res.status(status).json({ message: error.message });
    }

    return res.status(500).json({ message: "Unexpected server error" });
  }
});

export { router as adminRouter };
