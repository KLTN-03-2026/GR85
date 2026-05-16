import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { profileApi } from "@/client/features/profile/data/profile.api";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(null);

export function NotificationProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    try {
      setIsLoading(true);
      const response = await profileApi.getNotifications(20);
      const items = Array.isArray(response) ? response : response.data || [];
      setNotifications(items);
      setUnreadCount(items.filter((n) => !n.isRead).length);
    } catch (error) {
      // Silently fail if notifications can't be loaded (e.g., backend not running)
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch notifications on mount and when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();

      // Poll for new notifications every 30 seconds
      const interval = setInterval(fetchNotifications, 30000);
      // Listen for realtime notifications forwarded from socket
      const handler = (e) => {
        try {
          const payload = e?.detail;
          if (!payload) return;

          setNotifications((prev) => {
            const next = Array.isArray(prev) ? [...prev] : [];
            next.unshift({
              id: payload.id ?? `ntf_${Date.now()}`,
              type: payload.type ?? "SYSTEM",
              title: payload.title ?? "",
              message: payload.message ?? "",
              payload: payload.payload ?? null,
              createdAt: payload.createdAt ?? new Date().toISOString(),
              isRead: false,
            });
            return next.slice(0, 100);
          });
          setUnreadCount((prev) => prev + 1);
        } catch (_err) { }
      };

      window.addEventListener("app:notification", handler);
      return () => {
        clearInterval(interval);
        window.removeEventListener("app:notification", handler);
      };
    }
  }, [isAuthenticated]);

  // Mark notification as read
  const markAsRead = async (notificationId) => {
    try {
      await profileApi.markNotificationAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, isRead: true, readAt: new Date() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Không thể đánh dấu thông báo là đã đọc:", error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      await profileApi.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Không thể đánh dấu tất cả thông báo là đã đọc:", error);
    }
  };

  const value = useMemo(
    () => ({
      notifications,
      isLoading,
      unreadCount,
      fetchNotifications,
      markAsRead,
      markAllAsRead,
    }),
    [notifications, isLoading, unreadCount]
  );

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification phải được sử dụng bên trong NotificationProvider");
  }
  return context;
}
