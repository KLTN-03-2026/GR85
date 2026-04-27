import { Bell, Loader2 } from "lucide-react";
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
import { NotificationBellItem } from "@/components/notification-bell/NotificationBellItem.jsx";
import { formatNotificationTimeAgo } from "@/components/notification-bell/formatNotificationTimeAgo.js";
import { getNotificationTypeMeta } from "@/components/notification-bell/notificationTypeMeta.js";

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
                <NotificationBellItem
                  key={notification.id}
                  notification={notification}
                  onMarkAsRead={handleMarkAsRead}
                  typeMeta={getNotificationTypeMeta(notification.type)}
                  createdAtLabel={formatNotificationTimeAgo(notification.createdAt)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
