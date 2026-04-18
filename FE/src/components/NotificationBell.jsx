import { Bell, Check, Clock, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNotification } from "@/contexts/NotificationContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";

const NotificationTypeBadgeMap = {
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

export function NotificationBell() {
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useNotification();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);

  const handleMarkAsRead = async (notificationId, e) => {
    e.stopPropagation();
    try {
      await markAsRead(notificationId);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.message || "Không thể đánh dấu thông báo",
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      toast({
        title: "Thành công",
        description: "Tất cả thông báo đã được đánh dấu là đã đọc",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Lỗi",
        description: error.message || "Không thể đánh dấu tất cả thông báo",
      });
    }
  };

  const getNotificationBadgeClass = (notificationType) => {
    const badge = NotificationTypeBadgeMap[notificationType] || NotificationTypeBadgeMap.SYSTEM;
    return badge.color;
  };

  const getNotificationLabel = (notificationType) => {
    const badge = NotificationTypeBadgeMap[notificationType] || NotificationTypeBadgeMap.SYSTEM;
    return badge.label;
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          title="Thông báo"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">Thông báo</h2>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto px-2 py-1 text-xs"
              onClick={handleMarkAllAsRead}
            >
              Đánh dấu tất cả
            </Button>
          )}
        </div>

        <ScrollArea className="h-96">
          {isLoading && (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!isLoading && notifications.length === 0 && (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
              <Bell className="h-8 w-8" />
              <p className="text-sm">Không có thông báo</p>
            </div>
          )}

          {!isLoading && notifications.length > 0 && (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`px-4 py-3 hover:bg-muted/50 transition cursor-pointer ${
                    !notification.isRead ? "bg-blue-50/50" : ""
                  }`}
                  onClick={() =>
                    !notification.isRead &&
                    handleMarkAsRead(notification.id, { stopPropagation: () => {} })
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-sm line-clamp-1">
                          {notification.title}
                        </h3>
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap ${getNotificationBadgeClass(
                            notification.type
                          )}`}
                        >
                          {getNotificationLabel(notification.type)}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {notification.message}
                      </p>

                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(new Date(notification.createdAt))}
                      </div>
                    </div>

                    {!notification.isRead && (
                      <div className="flex-shrink-0">
                        <div className="h-2 w-2 rounded-full bg-blue-500" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function formatTimeAgo(date) {
  if (!date) return "Vừa xong";

  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString("vi-VN");
}
