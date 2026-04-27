import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { User, UserRoundCog } from "lucide-react";

export function FloatingChatMessageItem({ message, userId }) {
  const isMine = Number(message.senderId) === Number(userId);

  return (
    <div className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
      <Avatar className="mt-0.5 h-7 w-7">
        <AvatarFallback className={isMine ? "bg-accent" : "bg-primary text-primary-foreground"}>
          {isMine ? <User className="h-3.5 w-3.5" /> : <UserRoundCog className="h-3.5 w-3.5" />}
        </AvatarFallback>
      </Avatar>
      <div className={`max-w-[78%] ${isMine ? "items-end" : "items-start"} flex flex-col`}>
        <div
          className={`rounded-2xl px-3 py-2 text-sm shadow-sm ${
            isMine
              ? "rounded-br-md bg-primary text-primary-foreground"
              : "rounded-bl-md bg-background text-foreground"
          }`}
        >
          <div className="break-words whitespace-pre-wrap">{message.content}</div>
        </div>
        <div className="mt-1 px-1 text-[11px] text-muted-foreground">
          {new Date(message.createdAt).toLocaleTimeString("vi-VN", {
            hour: "2-digit",
            minute: "2-digit",
          })}
          {isMine ? (message.readByUserIds?.length > 0 ? " • Đã xem" : " • Chưa xem") : ""}
        </div>
      </div>
    </div>
  );
}