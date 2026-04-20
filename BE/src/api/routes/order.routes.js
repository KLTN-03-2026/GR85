import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import {
  getOrderDetailForAdmin,
  listOrdersForAdmin,
  updateOrderStatusForAdmin,
} from "../../services/order.service.js";

const router = Router();

function isAdminRole(role) {
  const normalizedRole = String(role ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

  return normalizedRole.includes("admin") || normalizedRole.includes("quan tri");
}

const updateStatusSchema = z.object({
  status: z.enum(["PENDING", "PROCESSING", "SHIPPING", "DELIVERED", "CANCELLED"]),
  note: z.string().optional(),
});

router.use(requireAuth);
router.use((req, res, next) => {
  if (!isAdminRole(req.auth?.role)) {
    return res.status(403).json({ message: "Chỉ quản trị viên" });
  }

  if (!Array.isArray(req.auth?.permissions) || !req.auth.permissions.includes("admin_orders_manage")) {
    return res.status(403).json({ message: "Bạn không có quyền quản lý đơn hàng" });
  }

  return next();
});

router.get("/", async (_req, res) => {
  try {
    const data = await listOrdersForAdmin();
    return res.json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.get("/:orderId", async (req, res) => {
  try {
    const data = await getOrderDetailForAdmin(Number(req.params.orderId));
    return res.json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.patch("/:orderId/status", async (req, res) => {
  try {
    const parsed = updateStatusSchema.parse(req.body);
    const data = await updateOrderStatusForAdmin(
      Number(req.params.orderId),
      parsed.status,
      Number(req.auth?.sub),
      parsed.note,
    );
    return res.json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

function handleRouteError(error, res) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: "Dữ liệu yêu cầu không hợp lệ", issues: error.flatten() });
  }

  if (error instanceof Error) {
    const status =
      error.message.includes("not found")
        ? 404
        : error.message.includes("cannot") || error.message.includes("Invalid")
          ? 400
          : 400;
    return res.status(status).json({ message: error.message });
  }

  return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
}

export { router as orderRouter };
