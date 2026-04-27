import { Clock } from "lucide-react";

export function NotificationBellItem({ notification, onMarkAsRead, typeMeta, createdAtLabel }) {
  return (
    <div
      className={`px-4 py-3 transition hover:bg-muted/50 cursor-pointer ${
        !notification.isRead ? "bg-blue-50/50" : ""
      }`}
      onClick={() =>
        !notification.isRead && onMarkAsRead(notification.id, { stopPropagation: () => {} })
      }
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-2">
            <h3 className="line-clamp-1 text-sm font-semibold">{notification.title}</h3>
            <span
              className={`inline-block whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${typeMeta.color}`}
            >
              {typeMeta.label}
            </span>
          </div>

          <p className="mb-2 line-clamp-2 text-xs text-muted-foreground">{notification.message}</p>

          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {createdAtLabel}
          </div>
        </div>

        {!notification.isRead && (
          <div className="flex-shrink-0">
            <div className="h-2 w-2 rounded-full bg-blue-500" />
          </div>
        )}
      </div>
    </div>
  );
}