import { useEffect, useMemo, useRef, useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { BadgeCheck, Loader2, Send, User, UserRoundCog, MessageSquareMore } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  listRoomMessages,
  markRoomRead,
  openChatRoom,
  sendRoomMessage,
  voteRoom,
} from "@/client/features/chat/data/chat.api.js";
import {
  connectChatSocket,
  disconnectChatSocket,
  getChatSocket,
} from "@/client/features/chat/data/chat.socket.js";

export default function ChatPage() {
  const { token, user } = useAuth();
  const { toast } = useToast();
  const [roomId, setRoomId] = useState(null);
  const [roomStatus, setRoomStatus] = useState("OPEN");
  const [roomMeta, setRoomMeta] = useState({ resolvedBy: null, customerVote: null });
  const [presence, setPresence] = useState({ viewers: [], typers: [] });
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const scrollRef = useRef(null);

  const adminTypingText = useMemo(() => {
    const admins = (presence?.typers ?? []).filter((item) => item?.isAdmin);
    if (admins.length === 0) {
      return "";
    }
    return `${admins.map((item) => item.fullName).join(", ")} đang phản hồi`;
  }, [presence]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!token || !user?.id) {
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
        setRoomStatus(room.status || "OPEN");

        const messagePayload = await listRoomMessages(token, room.roomId, 1, 100);
        if (cancelled) {
          return;
        }

        setMessages(Array.isArray(messagePayload?.items) ? [...messagePayload.items].reverse() : []);
        setRoomMeta({
          resolvedBy: messagePayload?.room?.resolvedBy ?? null,
          customerVote: messagePayload?.room?.customerVote ?? null,
        });
        setPresence(messagePayload?.room?.presence ?? { viewers: [], typers: [] });
        setRoomStatus(messagePayload?.room?.status ?? "OPEN");

        await markRoomRead(token, room.roomId);

        const socket = connectChatSocket(token);
        if (socket) {
          socket.emit("join_room", { roomId: room.roomId });

          socket.on("new_message", (payload) => {
            if (Number(payload?.conversationId) === Number(room.roomId)) {
              setMessages((prev) => [...prev, payload]);
              markRoomRead(token, room.roomId).catch(() => null);
            }
          });

          socket.on("messages_read", (payload) => {
            if (Number(payload?.roomId) === Number(room.roomId)) {
              const messageIds = Array.isArray(payload?.messageIds) ? payload.messageIds : [];
              if (messageIds.length > 0) {
                setMessages((prev) =>
                  prev.map((msg) =>
                    messageIds.includes(msg.id)
                      ? { ...msg, readByUserIds: [...(msg.readByUserIds || []), payload.userId] }
                      : msg
                  )
                );
              }
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

          socket.on("chat_room_done", (payload) => {
            if (Number(payload?.roomId) === Number(room.roomId)) {
              setRoomStatus("CLOSED");
              setRoomMeta({
                resolvedBy: payload?.resolvedBy ?? null,
                customerVote: payload?.customerVote ?? null,
              });
            }
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Không mở được phòng chat",
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
    };
  }, [token, user?.id]);

  const handleSend = async () => {
    if (!input.trim() || isLoading || !token || !user?.id || !roomId) return;

    setIsLoading(true);

    try {
      await sendRoomMessage(token, {
        conversationId: roomId,
        senderId: user.id,
        content: input.trim(),
        type: "TEXT",
      });
      setInput("");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Không gửi được tin nhắn",
        description: error instanceof Error ? error.message : "Lỗi không xác định",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVote = async (vote) => {
    if (!token || !roomId || isVoting) {
      return;
    }

    setIsVoting(true);
    try {
      const payload = await voteRoom(token, roomId, vote);
      setRoomMeta((prev) => ({
        ...prev,
        customerVote: payload?.customerVote ?? vote,
      }));
      toast({ title: "Đã gửi đánh giá" });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Không gửi được đánh giá",
        description: error instanceof Error ? error.message : "Lỗi không xác định",
      });
    } finally {
      setIsVoting(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-12 h-screen flex flex-col">
        <div className="container mx-auto px-4 flex-1 flex flex-col max-h-[calc(100vh-6rem)]">
          {/* Header */}
          <div className="mb-4">
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <MessageSquareMore className="w-6 h-6 text-primary" />
              Chat <span className="text-gradient-primary">Hỗ trợ Admin</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Trao đổi trực tiếp với đội hỗ trợ kỹ thuật
            </p>
          </div>

          {/* Chat Area */}
          <Card className="flex-1 glass border-border/50 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      Number(message.senderId) === Number(user?.id) ? "flex-row-reverse" : ""
                    }`}
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback
                        className={
                          Number(message.senderId) === Number(user?.id)
                            ? "bg-accent text-accent-foreground"
                            : "bg-primary text-primary-foreground"
                        }
                      >
                        {Number(message.senderId) === Number(user?.id) ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <UserRoundCog className="w-4 h-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        Number(message.senderId) === Number(user?.id)
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-secondary rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm font-medium opacity-80">
                        {message.sender?.fullName || message.sender?.email || `User ${message.senderId}`}
                      </p>
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p className="text-xs opacity-60 mt-1">
                        {new Date(message.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {Number(message.senderId) === Number(user?.id)
                          ? message.readByUserIds?.length > 0
                            ? " • Đã xem"
                            : " • Chưa xem"
                          : ""}
                      </p>
                    </div>
                  </div>
                ))}

                {adminTypingText ? (
                  <div className="text-xs text-muted-foreground">{adminTypingText}</div>
                ) : null}

                {isLoading && (
                  <div className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3 text-sm">
                      Đang gửi...
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {String(roomStatus).toUpperCase() === "CLOSED" ? (
              <div className="border-t border-border/50 p-4">
                <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <BadgeCheck className="h-4 w-4 text-emerald-500" />
                  Phiên hỗ trợ đã hoàn thành
                </div>
                <p className="text-xs text-muted-foreground">
                  {roomMeta?.resolvedBy
                    ? `Người xử lý: ${roomMeta.resolvedBy.fullName || roomMeta.resolvedBy.email}`
                    : "Đã được đội hỗ trợ xử lý."}
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm">Đánh giá:</span>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Button
                      key={star}
                      size="sm"
                      variant={Number(roomMeta?.customerVote) === star ? "default" : "outline"}
                      onClick={() => handleVote(star)}
                      disabled={isVoting}
                    >
                      {star}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 border-t border-border/50">
                <div className="flex gap-2">
                  <Input
                    placeholder="Nhập tin nhắn..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    disabled={isLoading}
                    className="flex-1"
                    onFocus={() => {
                      const socket = getChatSocket();
                      if (socket && roomId) {
                        socket.emit("chat_typing", { roomId, isTyping: true });
                      }
                    }}
                    onBlur={() => {
                      const socket = getChatSocket();
                      if (socket && roomId) {
                        socket.emit("chat_typing", { roomId, isTyping: false });
                      }
                    }}
                  />

                  <Button
                    variant="default"
                    size="icon"
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Trạng thái: {(presence?.viewers ?? []).some((item) => item?.isAdmin) ? "Đang có admin hoạt động" : "Đang chờ admin"}
                </p>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  );
}
