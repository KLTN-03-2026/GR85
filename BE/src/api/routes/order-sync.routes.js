import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  getOrderDetailHandler,
  updateOrderStatusHandler,
} from "../controllers/order-status.controller.js";

const router = Router();

router.get("/:id", requireAuth, getOrderDetailHandler);
router.put("/:id/status", requireAuth, requireAdminForStatusUpdate, updateOrderStatusHandler);

function requireAdminForStatusUpdate(req, res, next) {
  if (!isAdminRole(req.auth?.role)) {
    return res.status(403).json({ message: "Only admin can update order status" });
  }

  return next();
}

function isAdminRole(role) {
  const normalizedRole = String(role ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

  return normalizedRole.includes("admin") || normalizedRole.includes("quan tri");
}

export { router as orderSyncRouter };
