import { useEffect, useMemo, useRef, useState } from "react";
import { MessageCircle, Minus, Send, User, UserRoundCog, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  listRoomMessages,
  markRoomRead,
  openChatRoom,
  sendRoomMessage,
} from "@/client/features/chat/data/chat.api.js";
import {
  connectChatSocket,
  disconnectChatSocket,
  getChatSocket,
} from "@/client/features/chat/data/chat.socket.js";

export function FloatingChatWidget({ isOpen, onClose }) {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [roomId, setRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [presence, setPresence] = useState({ viewers: [], typers: [] });
  const [messageText, setMessageText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const scrollRef = useRef(null);

  const adminTypingText = useMemo(() => {
    const admins = (presence?.typers ?? []).filter((item) => item?.isAdmin);
    if (admins.length === 0) {
      return "";
    }
    return `${admins.map((item) => item.fullName).join(", ")} đang trả lời`;
  }, [presence]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!isOpen || !token || !user?.id) {
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      setIsLoading(true);
      try {
        const room = await openChatRoom(token);
        if (cancelled) {
          return;
        }

        setRoomId(room.roomId);

        const messagePayload = await listRoomMessages(token, room.roomId, 1, 100);
        if (cancelled) {
          return;
        }

        const initialMessages = Array.isArray(messagePayload?.items)
          ? [...messagePayload.items].reverse()
          : [];

        setMessages(initialMessages);
        setPresence(messagePayload?.room?.presence ?? { viewers: [], typers: [] });

        await markRoomRead(token, room.roomId).catch(() => null);

        const socket = connectChatSocket(token);
        if (socket) {
          socket.emit("join_room", { roomId: room.roomId });

          socket.on("new_message", (payload) => {
            if (Number(payload?.conversationId) === Number(room.roomId)) {
              setMessages((prev) => [...prev, payload]);
              markRoomRead(token, room.roomId).catch(() => null);
            }
          });

          socket.on("chat_room_presence", (payload) => {
            if (Number(payload?.roomId) === Number(room.roomId)) {
              setPresence({
                viewers: Array.isArray(payload?.viewers) ? payload.viewers : [],
                typers: Array.isArray(payload?.typers) ? payload.typers : [],
              });
            }
          });
        }

        setIsReady(true);
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Không mở được chat",
          description: error instanceof Error ? error.message : "Lỗi không xác định",
        });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
      const socket = getChatSocket();
      if (socket && roomId) {
        socket.emit("leave_room", { roomId });
      }
      disconnectChatSocket();
      setIsReady(false);
    };
  }, [isOpen, token, user?.id]);

  async function handleSend() {
    if (!token || !user?.id || !roomId || !messageText.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      await sendRoomMessage(token, {
        conversationId: roomId,
        senderId: user.id,
        content: messageText.trim(),
        type: "TEXT",
      });
      setMessageText("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Không gửi được tin nhắn",
        description: error instanceof Error ? error.message : "Lỗi không xác định",
      });
    } finally {
      setIsLoading(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed bottom-6 right-6 z-[70] hidden h-[520px] w-[360px] md:flex md:flex-col">
      <div className="flex items-center justify-between rounded-t-xl border border-border bg-primary px-3 py-2 text-primary-foreground">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <MessageCircle className="h-4 w-4" />
          Chat hỗ trợ
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={onClose}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col rounded-b-xl border border-t-0 border-border bg-background shadow-2xl">
        <div className="border-b border-border/60 px-3 py-2 text-xs text-muted-foreground">
          {adminTypingText || "Kết nối với đội hỗ trợ kỹ thuật"}
        </div>

        <ScrollArea className="flex-1 p-3" ref={scrollRef}>
          <div className="space-y-2">
            {!isReady && isLoading ? (
              <div className="text-xs text-muted-foreground">Đang tải hội thoại...</div>
            ) : messages.length === 0 ? (
              <div className="text-xs text-muted-foreground">Xin chào! Bạn cần hỗ trợ gì hôm nay?</div>
            ) : (
              messages.map((message) => {
                const isMine = Number(message.senderId) === Number(user?.id);
                return (
                  <div
                    key={message.id}
                    className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarFallback className={isMine ? "bg-accent" : "bg-primary text-primary-foreground"}>
                        {isMine ? <User className="h-3.5 w-3.5" /> : <UserRoundCog className="h-3.5 w-3.5" />}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`max-w-[76%] rounded-xl px-3 py-2 text-sm ${
                        isMine
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground"
                      }`}
                    >
                      <div className="break-words">{message.content}</div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border/60 p-2">
          <div className="flex items-center gap-2">
            <Input
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Nhập tin nhắn..."
              disabled={isLoading}
              className="h-9"
            />
            <Button
              type="button"
              size="icon"
              onClick={handleSend}
              disabled={isLoading || !messageText.trim()}
              className="h-9 w-9"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
