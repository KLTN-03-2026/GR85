import { useEffect, useMemo, useRef, useState } from "react";
import {
  BadgeCheck,
  CheckCheck,
  Circle,
  Filter,
  Loader2,
  Search,
  Send,
  Star,
  Users2,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  const [searchKeyword, setSearchKeyword] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [responderFilter, setResponderFilter] = useState("all");
  const [starFilter, setStarFilter] = useState("all");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [priorityQuickFilter, setPriorityQuickFilter] = useState(false);
  const selectedRoomIdRef = useRef(null);
  const messageViewportRef = useRef(null);
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef(null);

  useEffect(() => {
    selectedRoomIdRef.current = selectedRoomId;
  }, [selectedRoomId]);

  useEffect(() => {
    if (messageViewportRef.current) {
      messageViewportRef.current.scrollTop = messageViewportRef.current.scrollHeight;
    }
  }, [messages]);

  function stopAdminTyping() {
    const activeRoomId = selectedRoomIdRef.current;
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
      stopAdminTyping();
    };
  }, []);

  useEffect(() => {
    if (!selectedRoomId) {
      stopAdminTyping();
      return;
    }

    const socket = getChatSocket();
    if (!socket) {
      return;
    }

    const hasDraft = newMessage.trim().length > 0;
    if (!hasDraft) {
      stopAdminTyping();
      return;
    }

    if (!isTypingRef.current) {
      socket.emit("chat_typing", { roomId: selectedRoomId, isTyping: true });
      isTypingRef.current = true;
    }

    if (typingTimeoutRef.current) {
      window.clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = window.setTimeout(() => {
      stopAdminTyping();
    }, 1200);
  }, [selectedRoomId, newMessage]);

  const selectedRoom = useMemo(
    () => rooms.find((item) => Number(item.id) === Number(selectedRoomId)) ?? null,
    [rooms, selectedRoomId],
  );

  const responderOptions = useMemo(() => {
    const map = new Map();
    for (const room of rooms) {
      if (!room?.resolvedBy?.id) {
        continue;
      }

      map.set(room.resolvedBy.id, {
        id: room.resolvedBy.id,
        label: room.resolvedBy.fullName || room.resolvedBy.email || `Admin #${room.resolvedBy.id}`,
      });
    }

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, "vi"));
  }, [rooms]);

  const filteredRooms = useMemo(() => {
    const normalizedKeyword = normalizeVietnameseText(searchKeyword);

    return rooms.filter((room) => {
      const isDone = String(room?.status ?? "").toUpperCase() === "CLOSED";

      if (statusFilter === "done" && !isDone) {
        return false;
      }

      if (statusFilter === "active" && isDone) {
        return false;
      }

      if (responderFilter !== "all") {
        const responderId = room?.resolvedBy?.id ? String(room.resolvedBy.id) : "none";
        if (responderId !== responderFilter) {
          return false;
        }
      }

      if (starFilter !== "all") {
        const expected = Number(starFilter);
        if (!Number.isFinite(expected) || Number(room?.customerVote ?? 0) !== expected) {
          return false;
        }
      }

      if (unreadOnly && Number(room?.unreadCount ?? 0) <= 0) {
        return false;
      }

      if (!normalizedKeyword) {
        return true;
      }

      const haystack = normalizeVietnameseText([
        room?.customer?.fullName,
        room?.customer?.email,
        room?.resolvedBy?.fullName,
        room?.resolvedBy?.email,
        room?.lastMessage?.content,
        `room ${room?.id}`,
      ].filter(Boolean).join(" "));

      return haystack.includes(normalizedKeyword);
    });
  }, [rooms, searchKeyword, statusFilter, responderFilter, starFilter, unreadOnly]);

  const prioritizedRooms = useMemo(() => {
    return [...filteredRooms].sort((a, b) => {
      const aIsSelected = Number(a?.id) === Number(selectedRoomId);
      const bIsSelected = Number(b?.id) === Number(selectedRoomId);
      if (aIsSelected !== bIsSelected) {
        return aIsSelected ? -1 : 1;
      }

      const aIsUnreplied = !a?.resolvedBy?.id;
      const bIsUnreplied = !b?.resolvedBy?.id;
      const aHasUnread = Number(a?.unreadCount ?? 0) > 0;
      const bHasUnread = Number(b?.unreadCount ?? 0) > 0;

      // Highest priority: rooms that are both unreplied and unread.
      const aPriorityHot = aIsUnreplied && aHasUnread;
      const bPriorityHot = bIsUnreplied && bHasUnread;
      if (aPriorityHot !== bPriorityHot) {
        return aPriorityHot ? -1 : 1;
      }

      // Then keep all unreplied rooms higher for faster triage.
      if (aIsUnreplied !== bIsUnreplied) {
        return aIsUnreplied ? -1 : 1;
      }

      const aIsDone = String(a?.status ?? "").toUpperCase() === "CLOSED";
      const bIsDone = String(b?.status ?? "").toUpperCase() === "CLOSED";
      if (aIsDone !== bIsDone) {
        return aIsDone ? 1 : -1;
      }

      const unreadA = Number(a?.unreadCount ?? 0);
      const unreadB = Number(b?.unreadCount ?? 0);
      if (unreadA !== unreadB) {
        return unreadB - unreadA;
      }

      const updatedA = Date.parse(a?.lastMessage?.createdAt || a?.updatedAt || a?.createdAt || 0);
      const updatedB = Date.parse(b?.lastMessage?.createdAt || b?.updatedAt || b?.createdAt || 0);

      return updatedB - updatedA;
    });
  }, [filteredRooms, selectedRoomId]);

  const visibleRooms = useMemo(() => {
    return prioritizedRooms.filter((room) => {
      const content = String(room?.lastMessage?.content ?? "").trim();
      return content.length > 0;
    });
  }, [prioritizedRooms]);

  useEffect(() => {
    if (!visibleRooms.length) {
      if (selectedRoomId !== null) {
        setSelectedRoomId(null);
      }
      return;
    }

    const exists = visibleRooms.some((room) => Number(room.id) === Number(selectedRoomId));
    if (!exists) {
      setSelectedRoomId(visibleRooms[0].id);
    }
  }, [visibleRooms, selectedRoomId]);

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
      stopAdminTyping();
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
      stopAdminTyping();
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
    <div className="space-y-4">
      {/* Phần lọc - full width trên cùng */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-base font-semibold">Messenger Hỗ Trợ</h4>
          <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            {visibleRooms.length} hội thoại
          </span>
        </div>

        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={statusFilter === "active" ? "default" : "outline"}
            className="h-8 rounded-full px-3"
            onClick={() => setStatusFilter((prev) => (prev === "active" ? "all" : "active"))}
          >
            Active
          </Button>
          <Button
            size="sm"
            variant={statusFilter === "done" ? "default" : "outline"}
            className="h-8 rounded-full px-3"
            onClick={() => setStatusFilter((prev) => (prev === "done" ? "all" : "done"))}
          >
            Done
          </Button>
          <Button
            size="sm"
            variant={starFilter === "5" ? "default" : "outline"}
            className="h-8 rounded-full px-3"
            onClick={() => setStarFilter((prev) => (prev === "5" ? "all" : "5"))}
          >
            5 Sao
          </Button>
          <Button
            size="sm"
            variant={responderFilter === "none" ? "default" : "outline"}
            className="h-8 rounded-full px-3"
            onClick={() => {
              setResponderFilter((prev) => (prev === "none" ? "all" : "none"));
              setPriorityQuickFilter(false);
            }}
          >
            Chưa Có Rep
          </Button>
          <Button
            size="sm"
            variant={unreadOnly ? "default" : "outline"}
            className="h-8 rounded-full px-3"
            onClick={() => {
              setUnreadOnly((prev) => !prev);
              setPriorityQuickFilter(false);
            }}
          >
            Chưa đọc
          </Button>
          <Button
            size="sm"
            variant={priorityQuickFilter ? "default" : "outline"}
            className="h-8 rounded-full px-3"
            onClick={() => {
              setPriorityQuickFilter((prev) => {
                const next = !prev;
                if (next) {
                  setStatusFilter("active");
                  setResponderFilter("none");
                  setUnreadOnly(true);
                } else {
                  setStatusFilter("all");
                  setResponderFilter("all");
                  setUnreadOnly(false);
                }
                return next;
              });
            }}
          >
            Ưu Tiên Xử Lý
          </Button>
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              className="pl-9"
              placeholder="Tìm khách, tin nhắn, người rep (lọc không dấu)..."
            />
          </div>

          <label className="grid gap-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 font-medium text-foreground">
              <Filter className="h-3.5 w-3.5" />
              Trạng thái
            </span>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value);
                setPriorityQuickFilter(false);
              }}
            >
              <option value="all">Tất cả</option>
              <option value="active">Đang xử lý</option>
              <option value="done">Đã done</option>
            </select>
          </label>

          <label className="grid gap-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Người rep</span>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={responderFilter}
              onChange={(event) => {
                setResponderFilter(event.target.value);
                setPriorityQuickFilter(false);
              }}
            >
              <option value="all">Tất cả</option>
              <option value="none">Chưa có</option>
              {responderOptions.map((item) => (
                <option key={item.id} value={String(item.id)}>{item.label}</option>
              ))}
            </select>
          </label>

          <label className="grid gap-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Số sao</span>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={starFilter}
              onChange={(event) => {
                setStarFilter(event.target.value);
                setPriorityQuickFilter(false);
              }}
            >
              <option value="all">Tất cả</option>
              <option value="5">5 sao</option>
              <option value="4">4 sao</option>
              <option value="3">3 sao</option>
              <option value="2">2 sao</option>
              <option value="1">1 sao</option>
            </select>
          </label>
        </div>
      </Card>

      {/* Phần nội dung 2 cột: danh sách room + khung chat */}
      <div className="grid gap-4 lg:grid-cols-[380px_minmax(0,1fr)]">
      <Card className="p-4">
        {loadingRooms ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang tải danh sách hội thoại...
          </div>
        ) : visibleRooms.length === 0 ? (
          <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
            Chưa có hội thoại nào có tin nhắn.
          </div>
        ) : (
          <div className="space-y-2">
            {visibleRooms.map((room) => {
              const isDone = String(room.status || "OPEN").toUpperCase() === "CLOSED";
              const isSelected = Number(selectedRoomId) === Number(room.id);
              const isUnreplied = !room?.resolvedBy?.id;
              const hasUnread = Number(room?.unreadCount ?? 0) > 0;

              return (
                <button
                  key={room.id}
                  type="button"
                  onClick={() => setSelectedRoomId(room.id)}
                  className={`w-full rounded-2xl border px-3 py-2 text-left transition ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-sm"
                      : isUnreplied
                        ? "border-amber-300 bg-amber-50/60 hover:border-amber-400"
                        : hasUnread
                          ? "border-sky-300 bg-sky-50/60 hover:border-sky-400"
                          : "border-border hover:border-primary/40 hover:bg-secondary/50"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <Avatar className="mt-0.5 h-9 w-9">
                      <AvatarFallback className="bg-primary/15 text-primary">
                        {(room.customer?.fullName || room.customer?.email || "U").slice(0, 1).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-sm font-semibold">
                          {room.customer?.fullName || room.customer?.email || `Room #${room.id}`}
                        </div>
                        <div className="shrink-0 text-[11px] text-muted-foreground">
                          {formatRoomTime(room?.lastMessage?.createdAt || room?.updatedAt || room?.createdAt)}
                        </div>
                      </div>

                      <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {room.lastMessage?.content || "Chưa có tin nhắn"}
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                        {hasUnread ? (
                          <span className="rounded-full bg-primary px-2 py-0.5 font-medium text-primary-foreground">
                            {room.unreadCount} mới
                          </span>
                        ) : null}
                        {isUnreplied ? (
                          <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-medium text-amber-700">
                            Chưa rep
                          </span>
                        ) : (
                          <span className="rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                            Rep: {room.resolvedBy?.fullName || "Admin"}
                          </span>
                        )}

                        {isDone ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-600">
                            <CheckCheck className="h-3 w-3" />
                            Done
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-600">
                            <Circle className="h-2.5 w-2.5 fill-current" />
                            Active
                          </span>
                        )}

                        {room.customerVote ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-muted-foreground">
                            <Star className="h-3 w-3 fill-current text-amber-500" />
                            {room.customerVote}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 text-[11px] text-muted-foreground">
                    Room #{room.id}
                    </div>
                </button>
              );
            })}
          </div>
        )}
      </Card>

      <div className="space-y-4">
        <Card className="p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold">Khung Chat</h4>
              <p className="text-xs text-muted-foreground">
                {selectedRoom
                  ? `${selectedRoom.customer?.fullName || selectedRoom.customer?.email || "Khách"} • Room #${selectedRoom.id}`
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
            <div className="flex flex-wrap gap-1">
              {adminViewers.length > 0 ? (
                adminViewers.map((item) => (
                  <span key={item.userId} className="rounded-full bg-background px-2 py-0.5">
                    {item.fullName || item.role}
                  </span>
                ))
              ) : (
                <span className="text-muted-foreground">Không có admin đang xem</span>
              )}
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

          <div
            ref={messageViewportRef}
            className="max-h-[420px] space-y-2 overflow-auto rounded-xl border bg-[radial-gradient(circle_at_1px_1px,hsl(var(--muted))_1px,transparent_0)] [background-size:14px_14px] p-3"
          >
            {loadingMessages ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Đang tải tin nhắn...
              </div>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Chưa có tin nhắn</p>
            ) : (
              messages.map((message) => {
                const isMine = Number(message.senderId) === Number(currentUser?.id);
                return (
                  <div key={`${message.id}-${message.createdAt}`} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[82%]">
                      <div className={`rounded-2xl px-3 py-2 text-sm shadow-sm ${isMine ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md bg-background"}`}>
                        {!isMine ? (
                          <div className="mb-1 text-[11px] text-muted-foreground">
                            {message.sender?.fullName || message.sender?.email || `User ${message.senderId}`}
                          </div>
                        ) : null}
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      </div>
                      <div className={`mt-1 px-1 text-[11px] ${isMine ? "text-right text-primary/80" : "text-muted-foreground"}`}>
                        {new Date(message.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {isMine ? (message.readByUserIds?.length > 0 ? " • Đã xem" : " • Đã gửi") : ""}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="mt-3 flex gap-2">
            <Input
              value={newMessage}
              onChange={(event) => setNewMessage(event.target.value)}
              placeholder="Nhập phản hồi cho khách..."
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  handleSendMessage();
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
    </div>
  );
}

function normalizeVietnameseText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function formatRoomTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();
  const isSameDay =
    now.getFullYear() === date.getFullYear() &&
    now.getMonth() === date.getMonth() &&
    now.getDate() === date.getDate();

  if (isSameDay) {
    return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
}
