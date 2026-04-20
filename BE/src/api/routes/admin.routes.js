import { Router } from "express";
import { z } from "zod";
import {
  createBatchImportByAdmin,
  createCouponByAdmin,
  createWarehouseByAdmin,
  deleteCouponByAdmin,
  getAdminDashboard,
  getWarehouseOverviewByAdmin,
  getUserDetailByAdmin,
  listCouponsForAdmin,
  updateCouponByAdmin,
  updateWarehouseByAdmin,
  updateUserByAdmin,
} from "../../services/admin.service.js";
import {
  listReturnRequestsForAdmin,
  reviewReturnRequestByAdmin,
} from "../../services/wallet.service.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

const updateUserSchema = z.object({
  fullName: z.string().min(2).max(100).refine((value) => !/\d/.test(value), {
    message: "Họ và tên không được chứa số",
  }).optional(),
  email: z.string().email().optional(),
  phone: z.string().regex(/^\d{10}$/).optional(),
  address: z.string().max(2000).nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
  roleId: z.number().int().positive().nullable().optional(),
  status: z.enum(["ACTIVE", "BANNED", "UNVERIFIED"]).optional(),
});

router.get(
  "/users/:userId/detail",
  requireAuth,
  async (req, res) => {
    try {
      if (!isAdminRole(req.auth.role)) {
        return res.status(403).json({ message: "Chỉ quản trị viên mới có thể truy cập endpoint này" });
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
  },
);

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

function isAdminRole(role) {
  const normalizedRole = String(role ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

  return normalizedRole.includes("admin") || normalizedRole.includes("quan tri");
}

router.get(
  "/dashboard",
  requireAuth,
  async (req, res) => {
    try {
      // Check if user is Admin
      if (!isAdminRole(req.auth.role)) {
        return res.status(403).json({ message: "Chỉ quản trị viên mới có thể truy cập endpoint này" });
      }

      const data = await getAdminDashboard();
      return res.json(data);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }

      return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
    }
  },
);

router.patch(
  "/users/:userId",
  requireAuth,
  async (req, res) => {
    try {
      if (!isAdminRole(req.auth.role)) {
        return res.status(403).json({ message: "Chỉ quản trị viên mới có thể truy cập endpoint này" });
      }

      const parsed = updateUserSchema.parse(req.body);
      const data = await updateUserByAdmin(req.params.userId, parsed);
      return res.json(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dữ liệu yêu cầu không hợp lệ", issues: error.flatten() });
      }

      if (error instanceof Error) {
        const status = error.message.includes("not found") ? 404 : 400;
        return res.status(status).json({ message: error.message });
      }

      return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
    }
  },
);

router.get(
  "/coupons",
  requireAuth,
  async (req, res) => {
    try {
      if (!isAdminRole(req.auth.role)) {
        return res.status(403).json({ message: "Chỉ quản trị viên mới có thể truy cập endpoint này" });
      }

      const data = await listCouponsForAdmin();
      return res.json(data);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }

      return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
    }
  },
);

router.post(
  "/coupons",
  requireAuth,
  async (req, res) => {
    try {
      if (!isAdminRole(req.auth.role)) {
        return res.status(403).json({ message: "Chỉ quản trị viên mới có thể truy cập endpoint này" });
      }

      const parsed = createCouponSchema.parse(req.body);
      const data = await createCouponByAdmin(parsed);
      return res.status(201).json(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dữ liệu yêu cầu không hợp lệ", issues: error.flatten() });
      }

      if (error instanceof Error) {
        const status = error.message.includes("already exists") ? 409 : 400;
        return res.status(status).json({ message: error.message });
      }

      return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
    }
  },
);

router.patch(
  "/coupons/:couponId",
  requireAuth,
  async (req, res) => {
    try {
      if (!isAdminRole(req.auth.role)) {
        return res.status(403).json({ message: "Chỉ quản trị viên mới có thể truy cập endpoint này" });
      }

      const parsed = updateCouponSchema.parse(req.body ?? {});
      const data = await updateCouponByAdmin(req.params.couponId, parsed);
      return res.json(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dữ liệu yêu cầu không hợp lệ", issues: error.flatten() });
      }

      if (error instanceof Error) {
        const status = error.message.includes("not found") ? 404 : 400;
        return res.status(status).json({ message: error.message });
      }

      return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
    }
  },
);

router.delete(
  "/coupons/:couponId",
  requireAuth,
  async (req, res) => {
    try {
      if (!isAdminRole(req.auth.role)) {
        return res.status(403).json({ message: "Chỉ quản trị viên mới có thể truy cập endpoint này" });
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
  },
);

router.get(
  "/warehouse/overview",
  requireAuth,
  async (req, res) => {
    try {
      if (!isAdminRole(req.auth.role)) {
        return res.status(403).json({ message: "Chỉ quản trị viên mới có thể truy cập endpoint này" });
      }

      const data = await getWarehouseOverviewByAdmin();
      return res.json(data);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }

      return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
    }
  },
);

router.post(
  "/warehouses",
  requireAuth,
  async (req, res) => {
    try {
      if (!isAdminRole(req.auth.role)) {
        return res.status(403).json({ message: "Chỉ quản trị viên mới có thể truy cập endpoint này" });
      }

      const parsed = warehouseSchema.parse(req.body);
      const data = await createWarehouseByAdmin(parsed);
      return res.status(201).json(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dữ liệu yêu cầu không hợp lệ", issues: error.flatten() });
      }

      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }

      return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
    }
  },
);

router.patch(
  "/warehouses/:warehouseId",
  requireAuth,
  async (req, res) => {
    try {
      if (!isAdminRole(req.auth.role)) {
        return res.status(403).json({ message: "Chỉ quản trị viên mới có thể truy cập endpoint này" });
      }

      const parsed = warehouseSchema.partial().parse(req.body);
      const data = await updateWarehouseByAdmin(req.params.warehouseId, parsed);
      return res.json(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dữ liệu yêu cầu không hợp lệ", issues: error.flatten() });
      }

      if (error instanceof Error) {
        const status = error.message.includes("not found") ? 404 : 400;
        return res.status(status).json({ message: error.message });
      }

      return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
    }
  },
);

router.post(
  "/warehouse/import-batch",
  requireAuth,
  async (req, res) => {
    try {
      if (!isAdminRole(req.auth.role)) {
        return res.status(403).json({ message: "Chỉ quản trị viên mới có thể truy cập endpoint này" });
      }

      const parsed = importBatchSchema.parse(req.body);
      const data = await createBatchImportByAdmin(parsed);
      return res.status(201).json(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Dữ liệu yêu cầu không hợp lệ", issues: error.flatten() });
      }

      if (error instanceof Error) {
        const status = error.message.includes("not found") ? 404 : 400;
        return res.status(status).json({ message: error.message });
      }

      return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
    }
  },
);

router.get(
  "/returns",
  requireAuth,
  async (req, res) => {
    try {
      if (!isAdminRole(req.auth.role)) {
        return res.status(403).json({ message: "Chỉ quản trị viên mới có thể truy cập endpoint này" });
      }

      const data = await listReturnRequestsForAdmin();
      return res.json(data);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }

      return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
    }
  },
);

router.patch(
  "/returns/:requestId/review",
  requireAuth,
  async (req, res) => {
    try {
      if (!isAdminRole(req.auth.role)) {
        return res.status(403).json({ message: "Chỉ quản trị viên mới có thể truy cập endpoint này" });
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
        return res.status(400).json({ message: "Dữ liệu yêu cầu không hợp lệ", issues: error.flatten() });
      }

      if (error instanceof Error) {
        const status = error.message.includes("not found") ? 404 : 400;
        return res.status(status).json({ message: error.message });
      }

      return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
    }
  },
);

router.delete(
  "/users/:userId/wallet-transactions/:transactionId",
  requireAuth,
  async (req, res) => {
    try {
      if (!isAdminRole(req.auth.role)) {
        return res.status(403).json({ message: "Chỉ quản trị viên mới có thể truy cập endpoint này" });
      }

      const userId = Number(req.params.userId);
      const transactionId = Number(req.params.transactionId);

      if (!Number.isFinite(userId) || !Number.isFinite(transactionId)) {
        return res.status(400).json({ message: "ID người dùng hoặc ID giao dịch không hợp lệ" });
      }

      const { deleteWalletTransaction } = await import("../../services/wallet.service.js");
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

export { router as adminRouter };
