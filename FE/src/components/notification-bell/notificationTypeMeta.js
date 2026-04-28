const notificationTypeMetaMap = {
  WISHLIST_PRICE_DROP: {
    label: "Giảm giá wishlist",
    color: "bg-red-100 text-red-800",
  },
  WISHLIST_NEW_COUPON: {
    label: "Coupon mới",
    color: "bg-blue-100 text-blue-800",
  },
  ORDER_STATUS_CHANGED: {
    label: "Cập nhật đơn hàng",
    color: "bg-green-100 text-green-800",
  },
  SYSTEM: {
    label: "Thông báo hệ thống",
    color: "bg-gray-100 text-gray-800",
  },
};

export function getNotificationTypeMeta(notificationType) {
  return notificationTypeMetaMap[notificationType] || notificationTypeMetaMap.SYSTEM;
}