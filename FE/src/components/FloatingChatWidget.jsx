import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { FloatingChatComposer } from "@/components/floating-chat/FloatingChatComposer.jsx";
import { FloatingChatHeader } from "@/components/floating-chat/FloatingChatHeader.jsx";
import { FloatingChatMessageList } from "@/components/floating-chat/FloatingChatMessageList.jsx";
import { formatChatSupportStatus } from "@/components/floating-chat/formatChatSupportStatus.js";
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
        <FloatingChatHeader adminTypingText={adminTypingText} onClose={onClose} />

        <div className="border-b border-border/60 bg-muted/30 px-4 py-2 text-xs text-muted-foreground">
          {formatChatSupportStatus(presence)}
        </div>

        <FloatingChatMessageList
          isLoading={isLoading}
          isReady={isReady}
          messages={messages}
          scrollRef={scrollRef}
          userId={user?.id}
        />

        <FloatingChatComposer
          isLoading={isLoading}
          messageText={messageText}
          onChangeText={setMessageText}
          onSend={handleSend}
        />
      </div>
    </div>
  );
}
