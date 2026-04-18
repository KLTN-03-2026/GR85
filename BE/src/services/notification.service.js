import { prisma } from "../db/prisma.js";
import { serializeData } from "../utils/serialize.js";

export async function listNotificationsForUser(userId, input = {}) {
  const normalizedUserId = Number(userId);
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    throw new Error("Invalid user id");
  }

  const limit = Math.min(100, Math.max(1, Number(input.limit ?? 20)));

  const items = await prisma.notification.findMany({
    where: { userId: normalizedUserId },
    orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
    take: limit,
  });

  return serializeData(items.map(mapNotification));
}

export async function markNotificationAsRead(userId, notificationId) {
  const normalizedUserId = Number(userId);
  const normalizedNotificationId = Number(notificationId);

  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    throw new Error("Invalid user id");
  }

  if (!Number.isFinite(normalizedNotificationId) || normalizedNotificationId <= 0) {
    throw new Error("Invalid notification id");
  }

  const found = await prisma.notification.findFirst({
    where: { id: normalizedNotificationId, userId: normalizedUserId },
    select: { id: true },
  });

  if (!found) {
    throw new Error("Notification not found");
  }

  const updated = await prisma.notification.update({
    where: { id: normalizedNotificationId },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return serializeData(mapNotification(updated));
}

export async function markAllNotificationsAsRead(userId) {
  const normalizedUserId = Number(userId);
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    throw new Error("Invalid user id");
  }

  const result = await prisma.notification.updateMany({
    where: {
      userId: normalizedUserId,
      isRead: false,
    },
    data: {
      isRead: true,
      readAt: new Date(),
    },
  });

  return serializeData({
    updatedCount: Number(result.count ?? 0),
  });
}

export async function createWishlistPriceDropNotifications(product, oldPrice, newPrice) {
  const productId = Number(product?.id);
  if (!Number.isFinite(productId) || productId <= 0) {
    return;
  }

  const previous = Number(oldPrice);
  const current = Number(newPrice);
  if (!Number.isFinite(previous) || !Number.isFinite(current) || current >= previous) {
    return;
  }

  const watchers = await prisma.wishlistItem.findMany({
    where: { productId },
    select: { userId: true },
  });

  if (watchers.length === 0) {
    return;
  }

  await prisma.notification.createMany({
    data: watchers.map((watcher) => ({
      userId: watcher.userId,
      type: "WISHLIST_PRICE_DROP",
      title: "Sản phẩm trong wishlist vừa giảm giá",
      message: `${String(product.name ?? "Sản phẩm")} đã giảm từ ${formatPrice(previous)} xuống ${formatPrice(current)}.`,
      payload: {
        productId,
        productSlug: String(product.slug ?? ""),
        oldPrice: previous,
        newPrice: current,
      },
    })),
  });
}

export async function createWishlistCouponNotifications(coupon, productIds = []) {
  const normalizedProductIds = Array.from(
    new Set(
      (Array.isArray(productIds) ? productIds : [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  );

  if (normalizedProductIds.length === 0) {
    return;
  }

  const watchers = await prisma.wishlistItem.findMany({
    where: {
      productId: {
        in: normalizedProductIds,
      },
    },
    select: {
      userId: true,
      productId: true,
      product: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  });

  if (watchers.length === 0) {
    return;
  }

  await prisma.notification.createMany({
    data: watchers.map((watcher) => ({
      userId: watcher.userId,
      type: "WISHLIST_NEW_COUPON",
      title: "Có voucher mới cho sản phẩm theo dõi",
      message: `Mã ${String(coupon?.code ?? "")}: ${String(watcher.product?.name ?? "Sản phẩm")} có thể áp dụng ưu đãi mới.`,
      payload: {
        couponCode: String(coupon?.code ?? ""),
        productId: watcher.productId,
        productSlug: String(watcher.product?.slug ?? ""),
      },
    })),
  });
}

export async function createOrderStatusChangeNotification(orderId, userId, newStatus) {
  const normalizedOrderId = Number(orderId);
  const normalizedUserId = Number(userId);

  if (!Number.isFinite(normalizedOrderId) || normalizedOrderId <= 0) {
    return;
  }

  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    return;
  }

  const statusMessages = {
    PENDING: { title: "Đơn hàng chờ xác nhận", message: "Đơn hàng của bạn đang chờ xác nhận từ cửa hàng." },
    PROCESSING: { title: "Đơn hàng đang chuẩn bị", message: "Đơn hàng của bạn đang được chuẩn bị để gửi đi." },
    SHIPPING: { title: "Đơn hàng đang vận chuyển", message: "Đơn hàng của bạn đang được vận chuyển đến địa chỉ của bạn." },
    DELIVERED: { title: "Đơn hàng đã giao", message: "Đơn hàng của bạn đã được giao thành công." },
    CANCELLED: { title: "Đơn hàng đã hủy", message: "Đơn hàng của bạn đã được hủy." },
  };

  const statusMessage = statusMessages[newStatus] || { title: "Cập nhật đơn hàng", message: "Đơn hàng của bạn có cập nhật mới." };

  try {
    await prisma.notification.create({
      data: {
        userId: normalizedUserId,
        type: "ORDER_STATUS_CHANGED",
        title: statusMessage.title,
        message: statusMessage.message,
        payload: {
          orderId: normalizedOrderId,
          newStatus,
        },
      },
    });
  } catch (error) {
    console.error("Failed to create order status notification:", error);
  }
}

function mapNotification(item) {
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    message: item.message,
    payload: item.payload,
    isRead: Boolean(item.isRead),
    createdAt: item.createdAt,
    readAt: item.readAt,
  };
}

function formatPrice(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}
