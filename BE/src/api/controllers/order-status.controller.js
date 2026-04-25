import { z } from "zod";
import {
  getOrderWithStatusHistory,
  isValidOrderStatus,
  isValidUpdateSource,
  mapServiceErrorToHttp,
  updateOrderStatus,
} from "../../services/order-status-sync.service.js";

const updateStatusSchema = z.object({
  status: z.string().refine((value) => isValidOrderStatus(value), {
    message: "status is invalid",
  }),
  source: z.string().refine((value) => isValidUpdateSource(value), {
    message: "source must be SYSTEM | PAYMENT | ADMIN",
  }),
  note: z.string().max(500).optional(),
});

export async function getOrderDetailHandler(req, res) {
  try {
    const orderId = Number(req.params.id);
    const data = await getOrderWithStatusHistory(orderId);

    const authUserId = Number(req.auth?.sub ?? 0);
    const isAdmin = isAdminRole(req.auth?.role);
    if (!isAdmin && Number(data?.order?.userId) !== authUserId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    return res.status(200).json(data);
  } catch (error) {
    return handleError(error, res);
  }
}

export async function updateOrderStatusHandler(req, res) {
  try {
    const parsed = updateStatusSchema.parse(req.body ?? {});

    console.info(
      `[OrderStatusAPI] PUT /api/orders/${String(req.params.id)} status=${parsed.status} source=${parsed.source}`,
    );

    const data = await updateOrderStatus({
      orderId: Number(req.params.id),
      targetStatus: parsed.status,
      source: parsed.source,
      updatedBy: Number(req.auth?.sub ?? 0),
      note: parsed.note,
    });

    return res.status(200).json(data);
  } catch (error) {
    return handleError(error, res);
  }
}

function handleError(error, res) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: "Invalid request payload",
      issues: error.flatten(),
    });
  }

  const mapped = mapServiceErrorToHttp(error);
  if (mapped.statusCode >= 500) {
    console.error("[OrderStatusAPI]", error);
  }

  return res.status(mapped.statusCode).json({ message: mapped.message });
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
