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
  const roomIdRef = useRef(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    roomIdRef.current = roomId;
  }, [roomId]);

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

  function stopTyping() {
    const activeRoomId = roomIdRef.current;
    const socket = getChatSocket();
    if (!socket || !activeRoomId || !isTypingRef.current) {
      return;
    }

    socket.emit("chat_typing", { roomId: activeRoomId, isTyping: false });
    isTypingRef.current = false;
  }

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        window.clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen || !roomId) {
      stopTyping();
      return;
    }

    const socket = getChatSocket();
    if (!socket) {
      return;
    }

    const hasDraft = messageText.trim().length > 0;

    if (!hasDraft) {
      stopTyping();
      return;
    }

    if (!isTypingRef.current) {
      socket.emit("chat_typing", { roomId, isTyping: true });
      isTypingRef.current = true;
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      stopTyping();
    }, 1200);
  }, [isOpen, roomId, messageText]);

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
      const activeRoomId = roomIdRef.current;
      if (socket && activeRoomId) {
        socket.emit("leave_room", { roomId: activeRoomId });
      }
      stopTyping();
      disconnectChatSocket();
      setRoomId(null);
      setMessages([]);
      setPresence({ viewers: [], typers: [] });
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
      stopTyping();
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
    <div className="fixed inset-x-3 bottom-3 z-[70] h-[72dvh] max-h-[560px] sm:right-5 sm:left-auto sm:h-[540px] sm:w-[380px]">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/70 bg-background shadow-[0_16px_48px_-20px_rgba(0,0,0,0.45)]">
        <div className="flex items-center justify-between border-b border-border/70 bg-primary px-4 py-2.5 text-primary-foreground">
          <div className="flex items-center gap-2.5">
            <Avatar className="h-8 w-8 border border-white/40">
              <AvatarFallback className="bg-white/20 text-primary-foreground">
                <MessageCircle className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <div>
              <div className="text-sm font-semibold leading-none">Hỗ trợ khách hàng</div>
              <div className="mt-1 text-[11px] text-primary-foreground/85">
                {adminTypingText || "Đang hoạt động"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={onClose}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="border-b border-border/60 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          {presence?.viewers?.some((item) => item?.isAdmin)
            ? "Nhân viên đang online"
            : "Đang chờ nhân viên hỗ trợ"}
        </div>

        <ScrollArea className="flex-1 bg-[radial-gradient(circle_at_1px_1px,hsl(var(--muted))_1px,transparent_0)] [background-size:14px_14px] p-3" ref={scrollRef}>
          <div className="space-y-3">
            {!isReady && isLoading ? (
              <div className="text-xs text-muted-foreground">Đang tải hội thoại...</div>
            ) : messages.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 bg-background/80 p-3 text-xs text-muted-foreground">
                Xin chào! Bạn cần hỗ trợ gì hôm nay?
              </div>
            ) : (
              messages.map((message) => {
                const isMine = Number(message.senderId) === Number(user?.id);
                return (
                  <div key={`${message.id}-${message.createdAt}`} className={`flex gap-2 ${isMine ? "flex-row-reverse" : ""}`}>
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
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-border/60 bg-background p-2.5">
          <div className="flex items-center gap-2 rounded-full border border-border bg-muted/20 px-2 py-1">
            <Input
              value={messageText}
              onChange={(event) => setMessageText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Aa"
              disabled={isLoading}
              className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
            />
            <Button
              type="button"
              size="icon"
              onClick={handleSend}
              disabled={isLoading || !messageText.trim()}
              className="h-9 w-9 rounded-full"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
