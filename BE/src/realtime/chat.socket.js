import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "../db/prisma.js";
import { env } from "../config/env.js";

const roomState = new Map();
let ioInstance = null;

export function initializeChatSocket(httpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
    path: "/socket.io",
  });

  io.use(async (socket, next) => {
    try {
      const token = extractBearerToken(socket);
      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const payload = jwt.verify(token, env.JWT_SECRET);
      const userId = Number(payload?.sub);
      if (!Number.isFinite(userId) || userId <= 0) {
        return next(new Error("Unauthorized"));
      }

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          role: true,
        },
      });

      if (!user) {
        return next(new Error("Unauthorized"));
      }

      socket.data.user = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role?.name ?? "User",
        isAdmin: isAdminRole(user.role?.name),
      };

      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    const connectedUser = socket.data.user;
    if (connectedUser?.isAdmin) {
      socket.join("admin_chat_monitor");
    }

    socket.on("join_room", (payload) => {
      const roomId = Number(payload?.roomId);
      if (!Number.isFinite(roomId) || roomId <= 0) {
        return;
      }

      const roomKey = getRoomKey(roomId);
      socket.join(roomKey);
      addViewer(roomId, connectedUser, false);
      emitPresence(roomId);
    });

    socket.on("leave_room", (payload) => {
      const roomId = Number(payload?.roomId);
      if (!Number.isFinite(roomId) || roomId <= 0) {
        return;
      }

      const roomKey = getRoomKey(roomId);
      socket.leave(roomKey);
      removeViewer(roomId, connectedUser.id);
      removeTyper(roomId, connectedUser.id);
      emitPresence(roomId);
    });

    socket.on("chat_typing", (payload) => {
      const roomId = Number(payload?.roomId);
      const isTyping = Boolean(payload?.isTyping);

      if (!Number.isFinite(roomId) || roomId <= 0) {
        return;
      }

      if (isTyping) {
        addTyper(roomId, connectedUser);
      } else {
        removeTyper(roomId, connectedUser.id);
      }

      emitPresence(roomId);
    });

    socket.on("admin_room_viewing", (payload) => {
      const roomId = Number(payload?.roomId);
      const isViewing = Boolean(payload?.isViewing);

      if (!connectedUser?.isAdmin) {
        return;
      }

      if (!Number.isFinite(roomId) || roomId <= 0) {
        return;
      }

      if (isViewing) {
        addViewer(roomId, connectedUser, true);
      } else {
        removeViewer(roomId, connectedUser.id);
      }

      emitPresence(roomId);
    });

    socket.on("disconnect", () => {
      for (const [roomId, state] of roomState.entries()) {
        if (state.viewers.has(connectedUser.id) || state.typers.has(connectedUser.id)) {
          state.viewers.delete(connectedUser.id);
          state.typers.delete(connectedUser.id);
          emitPresence(roomId);
        }
      }
    });
  });

  ioInstance = io;
  console.info("[Socket] chat realtime initialized");

  return io;
}

export function emitNewMessage(roomId, payload) {
  const io = ioInstance;
  if (!io) {
    return;
  }

  io.to(getRoomKey(roomId)).emit("new_message", payload);
  io.to("admin_chat_monitor").emit("admin_room_changed", {
    roomId,
    type: "message",
    time: new Date().toISOString(),
  });
}

export function emitRoomDone(roomId, payload) {
  const io = ioInstance;
  if (!io) {
    return;
  }

  io.to(getRoomKey(roomId)).emit("chat_room_done", payload);
  io.to("admin_chat_monitor").emit("admin_room_changed", {
    roomId,
    type: "done",
    time: new Date().toISOString(),
  });
}

export function emitMessagesRead(roomId, messageIds, userId) {
  const io = ioInstance;
  if (!io || !messageIds || messageIds.length === 0) {
    return;
  }

  io.to(getRoomKey(roomId)).emit("messages_read", {
    roomId: Number(roomId),
    messageIds: Array.isArray(messageIds) ? messageIds : [],
    userId: Number(userId),
    time: new Date().toISOString(),
  });
}

export function getRoomPresence(roomId) {
  const state = roomState.get(Number(roomId));
  if (!state) {
    return {
      viewers: [],
      typers: [],
      activeCount: 0,
    };
  }

  const viewers = Array.from(state.viewers.values());
  const typers = Array.from(state.typers.values());

  return {
    viewers,
    typers,
    activeCount: viewers.length,
  };
}

function emitPresence(roomId) {
  const io = ioInstance;
  if (!io) {
    return;
  }

  const payload = {
    roomId: Number(roomId),
    ...getRoomPresence(roomId),
    time: new Date().toISOString(),
  };

  io.to(getRoomKey(roomId)).emit("chat_room_presence", payload);
  io.to("admin_chat_monitor").emit("chat_room_presence", payload);
}

function addViewer(roomId, user, isViewingResponse) {
  const state = ensureRoomState(roomId);
  state.viewers.set(user.id, {
    userId: user.id,
    fullName: user.fullName,
    role: user.role,
    isAdmin: Boolean(user.isAdmin),
    isViewingResponse: Boolean(isViewingResponse),
  });
}

function removeViewer(roomId, userId) {
  const state = ensureRoomState(roomId);
  state.viewers.delete(userId);
}

function addTyper(roomId, user) {
  const state = ensureRoomState(roomId);
  state.typers.set(user.id, {
    userId: user.id,
    fullName: user.fullName,
    role: user.role,
    isAdmin: Boolean(user.isAdmin),
  });
}

function removeTyper(roomId, userId) {
  const state = ensureRoomState(roomId);
  state.typers.delete(userId);
}

function ensureRoomState(roomId) {
  const normalizedRoomId = Number(roomId);
  if (!roomState.has(normalizedRoomId)) {
    roomState.set(normalizedRoomId, {
      viewers: new Map(),
      typers: new Map(),
    });
  }
  return roomState.get(normalizedRoomId);
}

function getRoomKey(roomId) {
  return `chat_room_${Number(roomId)}`;
}

function extractBearerToken(socket) {
  const fromAuth = String(socket.handshake?.auth?.token ?? "").trim();
  if (fromAuth) {
    return fromAuth.replace(/^Bearer\s+/i, "");
  }

  const fromHeader = String(socket.handshake?.headers?.authorization ?? "").trim();
  if (fromHeader.toLowerCase().startsWith("bearer ")) {
    return fromHeader.slice(7);
  }

  return "";
}

function isAdminRole(role) {
  const normalizedRole = String(role ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

  return normalizedRole.includes("admin") || normalizedRole.includes("quan tri");
}
