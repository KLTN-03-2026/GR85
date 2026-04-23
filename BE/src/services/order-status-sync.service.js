import { OrderStatus, PaymentStatus } from "@prisma/client";
import {
  findOrderWithHistory,
  reloadOrderWithHistory,
  runOrderStatusUpdateTransaction,
} from "../repositories/order-sync.repository.js";

const ORDER_STATUS = {
  PENDING: "PENDING",
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  PAID: "PAID",
  PROCESSING: "PROCESSING",
  SHIPPED: "SHIPPED",
  DELIVERED: "DELIVERED",
  CANCELLED: "CANCELLED",
  FAILED: "FAILED",
  REFUNDED: "REFUNDED",
};

const UPDATE_SOURCE = {
  SYSTEM: "SYSTEM",
  PAYMENT: "PAYMENT",
  ADMIN: "ADMIN",
};

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

export function isValidOrderStatus(value) {
  return Object.prototype.hasOwnProperty.call(ORDER_STATUS, String(value ?? "").toUpperCase());
}

export function isValidUpdateSource(value) {
  return Object.prototype.hasOwnProperty.call(UPDATE_SOURCE, String(value ?? "").toUpperCase());
}

export async function getOrderWithStatusHistory(orderId) {
  const normalizedOrderId = normalizeOrderId(orderId);

  const order = await findOrderWithHistory(normalizedOrderId);
  if (!order) {
    throw new AppError("Order not found", 404);
  }

  return toOrderDetailResponseDto(order);
}

export async function updateOrderStatus({
  orderId,
  targetStatus,
  source,
  updatedBy,
  note,
}) {
  const normalizedOrderId = normalizeOrderId(orderId);
  const normalizedTargetStatus = normalizeStatus(targetStatus);
  const normalizedSource = normalizeSource(source);

  const order = await findOrderWithHistory(normalizedOrderId);
  if (!order) {
    throw new AppError("Order not found", 404);
  }

  const currentStatus = deriveCurrentBusinessStatus(order);
  assertValidTransition({
    currentStatus,
    targetStatus: normalizedTargetStatus,
  });

  if (currentStatus === normalizedTargetStatus) {
    console.info(`[OrderStatusSync] Skip idempotent update for order ${normalizedOrderId} (${currentStatus})`);
    return toOrderDetailResponseDto(order);
  }

  const updateData = buildOrderUpdateData(order, normalizedTargetStatus);
  const historyData = {
    fromStatus: toHistoryOrderStatus(currentStatus),
    toStatus: toHistoryOrderStatus(normalizedTargetStatus),
    changedBy: normalizeUpdatedBy(updatedBy),
    note: buildHistoryNote({
      source: normalizedSource,
      requestedStatus: normalizedTargetStatus,
      currentStatus,
      note,
    }),
  };

  await runOrderStatusUpdateTransaction({
    orderId: normalizedOrderId,
    data: updateData,
    history: historyData,
  });

  console.info(
    `[OrderStatusSync] order=${normalizedOrderId} source=${normalizedSource} ${currentStatus} -> ${normalizedTargetStatus}`,
  );

  emitOrderStatusUpdatedEvent({
    orderId: normalizedOrderId,
    status: normalizedTargetStatus,
    time: new Date().toISOString(),
  });

  const updatedOrder = await reloadOrderWithHistory(normalizedOrderId);
  return toOrderDetailResponseDto(updatedOrder);
}

export async function handlePaymentWebhook({
  orderId,
  paymentSuccess,
  source = UPDATE_SOURCE.PAYMENT,
}) {
  const normalizedOrderId = normalizeOrderId(orderId);

  const order = await findOrderWithHistory(normalizedOrderId);
  if (!order) {
    throw new AppError("Order not found", 404);
  }

  const targetStatus = paymentSuccess ? ORDER_STATUS.PAID : ORDER_STATUS.FAILED;
  const currentStatus = deriveCurrentBusinessStatus(order);

  if (currentStatus === targetStatus) {
    console.info(`[WebhookPayment] idempotent webhook for order ${normalizedOrderId}, status=${currentStatus}`);
    return {
      updated: false,
      order: toOrderDetailResponseDto(order),
    };
  }

  const orderDto = await updateOrderStatus({
    orderId: normalizedOrderId,
    targetStatus,
    source,
    updatedBy: 0,
    note: "Webhook payment status synchronization",
  });

  return {
    updated: true,
    order: orderDto,
  };
}

export function mapServiceErrorToHttp(error) {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
    };
  }

  return {
    statusCode: 500,
    message: "Internal server error",
  };
}

function normalizeOrderId(orderId) {
  const normalized = Number(orderId);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new AppError("Invalid order id", 400);
  }
  return normalized;
}

function normalizeStatus(status) {
  const normalized = String(status ?? "").trim().toUpperCase();
  if (!isValidOrderStatus(normalized)) {
    throw new AppError("Invalid target status", 400);
  }
  return normalized;
}

function normalizeSource(source) {
  const normalized = String(source ?? "").trim().toUpperCase();
  if (!isValidUpdateSource(normalized)) {
    throw new AppError("Invalid update source", 400);
  }
  return normalized;
}

function normalizeUpdatedBy(updatedBy) {
  const normalized = Number(updatedBy);
  if (!Number.isFinite(normalized)) {
    return 0;
  }
  return Math.trunc(normalized);
}

function deriveCurrentBusinessStatus(order) {
  const orderStatus = String(order?.orderStatus ?? "").toUpperCase();
  const paymentStatus = String(order?.paymentStatus ?? "").toUpperCase();

  if (paymentStatus === PaymentStatus.REFUNDED) {
    return ORDER_STATUS.REFUNDED;
  }

  if (paymentStatus === PaymentStatus.FAILED) {
    return ORDER_STATUS.FAILED;
  }

  if (orderStatus === OrderStatus.CANCELLED) {
    return ORDER_STATUS.CANCELLED;
  }

  if (orderStatus === OrderStatus.DELIVERED) {
    return ORDER_STATUS.DELIVERED;
  }

  if (orderStatus === OrderStatus.SHIPPING) {
    return ORDER_STATUS.SHIPPED;
  }

  if (orderStatus === OrderStatus.PROCESSING) {
    return ORDER_STATUS.PROCESSING;
  }

  if (paymentStatus === PaymentStatus.PAID) {
    return ORDER_STATUS.PAID;
  }

  if (paymentStatus === PaymentStatus.PENDING && orderStatus === OrderStatus.PENDING) {
    return ORDER_STATUS.AWAITING_PAYMENT;
  }

  return ORDER_STATUS.PENDING;
}

function assertValidTransition({ currentStatus, targetStatus }) {
  if (currentStatus === targetStatus) {
    return;
  }

  if (
    targetStatus === ORDER_STATUS.CANCELLED &&
    currentStatus !== ORDER_STATUS.SHIPPED &&
    currentStatus !== ORDER_STATUS.DELIVERED
  ) {
    return;
  }

  const allowedTransitions = {
    [ORDER_STATUS.PENDING]: [ORDER_STATUS.AWAITING_PAYMENT],
    [ORDER_STATUS.AWAITING_PAYMENT]: [ORDER_STATUS.PAID, ORDER_STATUS.FAILED],
    [ORDER_STATUS.PAID]: [ORDER_STATUS.PROCESSING, ORDER_STATUS.REFUNDED],
    [ORDER_STATUS.PROCESSING]: [ORDER_STATUS.SHIPPED],
    [ORDER_STATUS.SHIPPED]: [ORDER_STATUS.DELIVERED],
    [ORDER_STATUS.DELIVERED]: [],
    [ORDER_STATUS.CANCELLED]: [],
    [ORDER_STATUS.FAILED]: [],
    [ORDER_STATUS.REFUNDED]: [],
  };

  if (!(allowedTransitions[currentStatus] ?? []).includes(targetStatus)) {
    throw new AppError(
      `Invalid status transition: ${currentStatus} -> ${targetStatus}`,
      400,
    );
  }
}

function buildOrderUpdateData(order, targetStatus) {
  const currentPaymentStatus = String(order?.paymentStatus ?? PaymentStatus.PENDING).toUpperCase();

  switch (targetStatus) {
    case ORDER_STATUS.PENDING:
    case ORDER_STATUS.AWAITING_PAYMENT:
      return {
        orderStatus: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PENDING,
      };
    case ORDER_STATUS.PAID:
      return {
        orderStatus: OrderStatus.PENDING,
        paymentStatus: PaymentStatus.PAID,
      };
    case ORDER_STATUS.PROCESSING:
      return {
        orderStatus: OrderStatus.PROCESSING,
        paymentStatus: PaymentStatus.PAID,
      };
    case ORDER_STATUS.SHIPPED:
      return {
        orderStatus: OrderStatus.SHIPPING,
        paymentStatus: PaymentStatus.PAID,
      };
    case ORDER_STATUS.DELIVERED:
      return {
        orderStatus: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
      };
    case ORDER_STATUS.CANCELLED:
      return {
        orderStatus: OrderStatus.CANCELLED,
        paymentStatus:
          currentPaymentStatus === PaymentStatus.REFUNDED
            ? PaymentStatus.REFUNDED
            : currentPaymentStatus === PaymentStatus.PAID
              ? PaymentStatus.PAID
              : PaymentStatus.FAILED,
      };
    case ORDER_STATUS.FAILED:
      return {
        orderStatus: OrderStatus.CANCELLED,
        paymentStatus: PaymentStatus.FAILED,
      };
    case ORDER_STATUS.REFUNDED:
      return {
        orderStatus: OrderStatus.CANCELLED,
        paymentStatus: PaymentStatus.REFUNDED,
      };
    default:
      throw new AppError("Unsupported status", 400);
  }
}

function toHistoryOrderStatus(status) {
  switch (status) {
    case ORDER_STATUS.SHIPPED:
      return OrderStatus.SHIPPING;
    case ORDER_STATUS.DELIVERED:
      return OrderStatus.DELIVERED;
    case ORDER_STATUS.PROCESSING:
      return OrderStatus.PROCESSING;
    case ORDER_STATUS.CANCELLED:
    case ORDER_STATUS.FAILED:
    case ORDER_STATUS.REFUNDED:
      return OrderStatus.CANCELLED;
    case ORDER_STATUS.PAID:
    case ORDER_STATUS.AWAITING_PAYMENT:
    case ORDER_STATUS.PENDING:
    default:
      return OrderStatus.PENDING;
  }
}

function buildHistoryNote({ source, requestedStatus, currentStatus, note }) {
  const normalizedNote = String(note ?? "").trim();
  const internalNote = `source=${source}; businessStatus=${currentStatus}->${requestedStatus}`;
  return normalizedNote ? `${internalNote}; ${normalizedNote}` : internalNote;
}

function toOrderDetailResponseDto(order) {
  const history = Array.isArray(order?.statusHistories)
    ? order.statusHistories.map((item) => ({
        id: item.id,
        oldStatus: String(item.fromStatus ?? ""),
        newStatus: String(item.toStatus ?? ""),
        updatedBy: item.changedBy,
        createdAt: item.createdAt,
        note: item.note ?? null,
      }))
    : [];

  return {
    order: {
      id: order.id,
      userId: order.userId,
      customer: order.user,
      status: deriveCurrentBusinessStatus(order),
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      totalAmount: Number(order.totalAmount ?? 0),
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    },
    statusHistory: history,
  };
}

function emitOrderStatusUpdatedEvent(payload) {
  const io = globalThis?.io;

  if (io && typeof io.emit === "function") {
    io.emit("order_status_updated", payload);
    return;
  }

  console.info("[Realtime] Websocket not configured, skip order_status_updated emit");
}
