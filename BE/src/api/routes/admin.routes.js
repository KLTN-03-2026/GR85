import { Router } from "express";
import { z } from "zod";
import {
  createCouponByAdmin,
  getAdminDashboard,
  getUserDetailByAdmin,
  listCouponsForAdmin,
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
    message: "Full name cannot contain numbers",
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
        return res.status(403).json({ message: "Only admins can access this endpoint" });
      }

      const data = await getUserDetailByAdmin(req.params.userId);
      return res.json(data);
    } catch (error) {
      if (error instanceof Error) {
        const status = error.message.includes("not found") ? 404 : 400;
        return res.status(status).json({ message: error.message });
      }

      return res.status(500).json({ message: "Unexpected server error" });
    }
  },
);

const createCouponSchema = z.object({
  code: z.string().min(2).max(50),
  discountType: z.enum(["PERCENT", "FIXED_AMOUNT"]),
  discountValue: z.number().positive(),
  minOrderValue: z.number().min(0).default(0),
  usageLimit: z.number().int().positive().default(100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  status: z.enum(["ACTIVE", "EXPIRED", "DISABLED"]).default("ACTIVE"),
});

const reviewReturnSchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  rejectReason: z.string().max(2000).optional(),
  refundAmount: z.number().positive().optional(),
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
        return res.status(403).json({ message: "Only admins can access this endpoint" });
      }

      const data = await getAdminDashboard();
      return res.json(data);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }

      return res.status(500).json({ message: "Unexpected server error" });
    }
  },
);

router.patch(
  "/users/:userId",
  requireAuth,
  async (req, res) => {
    try {
      if (!isAdminRole(req.auth.role)) {
        return res.status(403).json({ message: "Only admins can access this endpoint" });
      }

      const parsed = updateUserSchema.parse(req.body);
      const data = await updateUserByAdmin(req.params.userId, parsed);
      return res.json(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", issues: error.flatten() });
      }

      if (error instanceof Error) {
        const status = error.message.includes("not found") ? 404 : 400;
        return res.status(status).json({ message: error.message });
      }

      return res.status(500).json({ message: "Unexpected server error" });
    }
  },
);

router.get(
  "/coupons",
  requireAuth,
  async (req, res) => {
    try {
      if (!isAdminRole(req.auth.role)) {
        return res.status(403).json({ message: "Only admins can access this endpoint" });
      }

      const data = await listCouponsForAdmin();
      return res.json(data);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }

      return res.status(500).json({ message: "Unexpected server error" });
    }
  },
);

router.post(
  "/coupons",
  requireAuth,
  async (req, res) => {
    try {
      if (!isAdminRole(req.auth.role)) {
        return res.status(403).json({ message: "Only admins can access this endpoint" });
      }

      const parsed = createCouponSchema.parse(req.body);
      const data = await createCouponByAdmin(parsed);
      return res.status(201).json(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", issues: error.flatten() });
      }

      if (error instanceof Error) {
        const status = error.message.includes("already exists") ? 409 : 400;
        return res.status(status).json({ message: error.message });
      }

      return res.status(500).json({ message: "Unexpected server error" });
    }
  },
);

router.get(
  "/returns",
  requireAuth,
  async (req, res) => {
    try {
      if (!isAdminRole(req.auth.role)) {
        return res.status(403).json({ message: "Only admins can access this endpoint" });
      }

      const data = await listReturnRequestsForAdmin();
      return res.json(data);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }

      return res.status(500).json({ message: "Unexpected server error" });
    }
  },
);

router.patch(
  "/returns/:requestId/review",
  requireAuth,
  async (req, res) => {
    try {
      if (!isAdminRole(req.auth.role)) {
        return res.status(403).json({ message: "Only admins can access this endpoint" });
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
        return res.status(400).json({ message: "Invalid request data", issues: error.flatten() });
      }

      if (error instanceof Error) {
        const status = error.message.includes("not found") ? 404 : 400;
        return res.status(status).json({ message: error.message });
      }

      return res.status(500).json({ message: "Unexpected server error" });
    }
  },
);

export { router as adminRouter };
