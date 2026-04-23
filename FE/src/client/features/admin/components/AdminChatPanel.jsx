import { useEffect, useMemo, useRef, useState } from "react";
import { BadgeCheck, Loader2, Send, Users2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  createModerationTerm,
  deleteModerationTerm,
  listAdminRooms,
  listModerationTerms,
  listRoomMessages,
  markAdminDone,
  markRoomRead,
  sendRoomMessage,
} from "@/client/features/chat/data/chat.api.js";
import {
  connectChatSocket,
  disconnectChatSocket,
  getChatSocket,
} from "@/client/features/chat/data/chat.socket.js";

export function AdminChatPanel({ token, currentUser, toast }) {
  const [rooms, setRooms] = useState([]);
  const [selectedRoomId, setSelectedRoomId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [presence, setPresence] = useState({ viewers: [], typers: [] });
  const [newMessage, setNewMessage] = useState("");
  const [loadingRooms, setLoadingRooms] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [terms, setTerms] = useState([]);
  const [newTerm, setNewTerm] = useState("");
  const selectedRoomIdRef = useRef(null);

  useEffect(() => {
    selectedRoomIdRef.current = selectedRoomId;
  }, [selectedRoomId]);

  const selectedRoom = useMemo(
    () => rooms.find((item) => Number(item.id) === Number(selectedRoomId)) ?? null,
    [rooms, selectedRoomId],
  );

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    async function bootstrap() {
      setLoadingRooms(true);
      try {
        const [roomPayload, termPayload] = await Promise.all([
          listAdminRooms(token),
          listModerationTerms(token),
        ]);

        if (!cancelled) {
          setRooms(Array.isArray(roomPayload) ? roomPayload : []);
          setTerms(Array.isArray(termPayload) ? termPayload : []);
          if (!selectedRoomId && Array.isArray(roomPayload) && roomPayload[0]) {
            setSelectedRoomId(roomPayload[0].id);
          }
        }
      } catch (error) {
        if (!cancelled) {
          toast?.({
            variant: "destructive",
            title: "Không tải được phòng chat",
            description: error instanceof Error ? error.message : "Lỗi không xác định",
          });
        }
      } finally {
        if (!cancelled) {
          setLoadingRooms(false);
        }
      }
    }

    bootstrap();

    const socket = connectChatSocket(token);
    if (socket) {
      const handleNewMessage = (payload) => {
        if (Number(payload?.conversationId) === Number(selectedRoomIdRef.current)) {
          setMessages((prev) => [...prev, payload]);
          if (selectedRoomIdRef.current) {
            markRoomRead(token, selectedRoomIdRef.current).catch(() => null);
          }
        }
      };

      const handlePresence = (payload) => {
        if (Number(payload?.roomId) === Number(selectedRoomIdRef.current)) {
          setPresence({
            viewers: Array.isArray(payload?.viewers) ? payload.viewers : [],
            typers: Array.isArray(payload?.typers) ? payload.typers : [],
          });
        }
      };

      const handleRoomChanged = () => {
        listAdminRooms(token)
          .then((payload) => setRooms(Array.isArray(payload) ? payload : []))
          .catch(() => null);
      };

      socket.on("new_message", handleNewMessage);
      socket.on("chat_room_presence", handlePresence);
      socket.on("admin_room_changed", handleRoomChanged);
      socket.on("chat_room_done", handleRoomChanged);

      return () => {
        cancelled = true;
        socket.off("new_message", handleNewMessage);
        socket.off("chat_room_presence", handlePresence);
        socket.off("admin_room_changed", handleRoomChanged);
        socket.off("chat_room_done", handleRoomChanged);
        disconnectChatSocket();
      };
    }

    return () => {
      cancelled = true;
    };
  }, [token, toast]);

  useEffect(() => {
    if (!token || !selectedRoomId) {
      return;
    }

    let cancelled = false;
    const socket = getChatSocket();

    async function loadMessages() {
      setLoadingMessages(true);
      try {
        const payload = await listRoomMessages(token, selectedRoomId, 1, 100);
        if (!cancelled) {
          setMessages(Array.isArray(payload?.items) ? [...payload.items].reverse() : []);
          setPresence(payload?.room?.presence ?? { viewers: [], typers: [] });
        }
        await markRoomRead(token, selectedRoomId);
      } catch (error) {
        if (!cancelled) {
          toast?.({
            variant: "destructive",
            title: "Không tải được tin nhắn",
            description: error instanceof Error ? error.message : "Lỗi không xác định",
          });
        }
      } finally {
        if (!cancelled) {
          setLoadingMessages(false);
        }
      }
    }

    loadMessages();

    if (socket) {
      socket.emit("join_room", { roomId: selectedRoomId });
      socket.emit("admin_room_viewing", { roomId: selectedRoomId, isViewing: true });
    }

    return () => {
      cancelled = true;
      if (socket) {
        socket.emit("admin_room_viewing", { roomId: selectedRoomId, isViewing: false });
        socket.emit("leave_room", { roomId: selectedRoomId });
      }
    };
  }, [token, selectedRoomId, toast]);

  async function handleSendMessage() {
    if (!token || !selectedRoomId || !newMessage.trim() || !currentUser?.id || isSending) {
      return;
    }

    setIsSending(true);
    try {
      await sendRoomMessage(token, {
        conversationId: selectedRoomId,
        senderId: currentUser.id,
        content: newMessage.trim(),
        type: "TEXT",
      });
      setNewMessage("");
    } catch (error) {
      toast?.({
        variant: "destructive",
        title: "Không gửi được tin nhắn",
        description: error instanceof Error ? error.message : "Lỗi không xác định",
      });
    } finally {
      setIsSending(false);
    }
  }

  async function handleDoneRoom() {
    if (!token || !selectedRoomId) {
      return;
    }

    try {
      await markAdminDone(token, selectedRoomId);
      const payload = await listAdminRooms(token);
      setRooms(Array.isArray(payload) ? payload : []);
      toast?.({ title: "Đã hoàn thành phiên chat" });
    } catch (error) {
      toast?.({
        variant: "destructive",
        title: "Không thể đóng phiên",
        description: error instanceof Error ? error.message : "Lỗi không xác định",
      });
    }
  }

  async function handleCreateTerm() {
    if (!token || !newTerm.trim()) {
      return;
    }

    try {
      await createModerationTerm(token, newTerm.trim());
      const payload = await listModerationTerms(token);
      setTerms(Array.isArray(payload) ? payload : []);
      setNewTerm("");
    } catch (error) {
      toast?.({
        variant: "destructive",
        title: "Không thêm được từ cấm",
        description: error instanceof Error ? error.message : "Lỗi không xác định",
      });
    }
  }

  async function handleDeleteTerm(termId) {
    if (!token) {
      return;
    }

    try {
      await deleteModerationTerm(token, termId);
      const payload = await listModerationTerms(token);
      setTerms(Array.isArray(payload) ? payload : []);
    } catch (error) {
      toast?.({
        variant: "destructive",
        title: "Không xóa được từ cấm",
        description: error instanceof Error ? error.message : "Lỗi không xác định",
      });
    }
  }

  const adminViewers = (presence?.viewers ?? []).filter((item) => item?.isAdmin);
  const typingAdmins = (presence?.typers ?? []).filter((item) => item?.isAdmin);

  return (
    <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      <Card className="p-4">
        <h4 className="mb-3 text-sm font-semibold">Phòng chat</h4>
        {loadingRooms ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải...
          </div>
        ) : (
          <div className="space-y-2">
            {rooms.map((room) => (
              <button
                key={room.id}
                type="button"
                onClick={() => setSelectedRoomId(room.id)}
                className={`w-full rounded-md border px-3 py-2 text-left text-sm ${
                  Number(selectedRoomId) === Number(room.id)
                    ? "border-primary bg-primary/10"
                    : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <strong>Room #{room.id}</strong>
                  <span className="text-xs">{room.unreadCount} chưa đọc</span>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {room.customer?.fullName || room.customer?.email}
                </div>
                <div className="mt-1 line-clamp-2 text-xs">{room.lastMessage?.content || "Chưa có tin"}</div>
                <div className="mt-2 text-xs">
                  {String(room.status || "OPEN").toUpperCase() === "CLOSED" ? "Đã hoàn thành" : "Đang hoạt động"}
                </div>
              </button>
            ))}
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold">Hội thoại</h4>
              <p className="text-xs text-muted-foreground">
                {selectedRoom
                  ? `${selectedRoom.customer?.fullName || selectedRoom.customer?.email || "Khách"}`
                  : "Chọn một room để bắt đầu"}
              </p>
            </div>
            {selectedRoom ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleDoneRoom}
                disabled={String(selectedRoom.status || "").toUpperCase() === "CLOSED"}
              >
                <BadgeCheck className="mr-2 h-4 w-4" />
                Done
              </Button>
            ) : null}
          </div>

          <div className="mb-3 rounded-md border bg-secondary/40 p-2 text-xs">
            <div className="mb-1 flex items-center gap-1 font-medium">
              <Users2 className="h-3.5 w-3.5" />
              Tài khoản đang xem trả lời
            </div>
            <div>
              {adminViewers.length > 0
                ? adminViewers.map((item) => item.fullName || item.role).join(", ")
                : "Không có admin đang xem"}
            </div>
            <div className="mt-1 text-muted-foreground">
              {typingAdmins.length > 0
                ? `Đang gõ: ${typingAdmins.map((item) => item.fullName).join(", ")}`
                : "Không có admin đang gõ"}
            </div>
            {selectedRoom?.resolvedBy ? (
              <div className="mt-1">
                Người xử lý: <strong>{selectedRoom.resolvedBy.fullName || selectedRoom.resolvedBy.email}</strong>
                {selectedRoom.customerVote ? ` • Vote khách: ${selectedRoom.customerVote}/5` : ""}
              </div>
            ) : null}
          </div>

          <div className="max-h-[360px] space-y-2 overflow-auto rounded-md border p-3">
            {loadingMessages ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải tin nhắn...
              </div>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có tin nhắn</p>
            ) : (
              messages.map((message) => (
                <div key={message.id} className="rounded-md border bg-background p-2 text-sm">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{message.sender?.fullName || message.sender?.email || `User ${message.senderId}`}</span>
                    <span>{new Date(message.createdAt).toLocaleTimeString("vi-VN")}</span>
                  </div>
                  <div className="mt-1 whitespace-pre-wrap">{message.content}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {message.readByUserIds?.length > 0 ? "Đã xem" : "Chưa xem"}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <Input
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              placeholder="Nhập phản hồi cho khách..."
              onFocus={() => {
                const socket = getChatSocket();
                if (socket && selectedRoomId) {
                  socket.emit("chat_typing", { roomId: selectedRoomId, isTyping: true });
                }
              }}
              onBlur={() => {
                const socket = getChatSocket();
                if (socket && selectedRoomId) {
                  socket.emit("chat_typing", { roomId: selectedRoomId, isTyping: false });
                }
              }}
            />
            <Button onClick={handleSendMessage} disabled={!newMessage.trim() || isSending || !selectedRoomId}>
              <Send className="mr-2 h-4 w-4" />
              Gửi
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="mb-3 text-sm font-semibold">Danh sách từ không được nhắn</h4>
          <div className="mb-3 flex gap-2">
            <Input
              value={newTerm}
              onChange={(event) => setNewTerm(event.target.value)}
              placeholder="Nhập từ cấm"
            />
            <Button onClick={handleCreateTerm} disabled={!newTerm.trim()}>
              Thêm
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {terms.map((term) => (
              <button
                key={term.id}
                type="button"
                onClick={() => handleDeleteTerm(term.id)}
                className="rounded-full border px-3 py-1 text-xs hover:bg-destructive/10"
              >
                {term.term} ×
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
