import {
  countMessagesByConversation,
  countUnreadForAdmin,
  createMessage,
  createModerationTerm,
  deleteModerationTermById,
  findConversationById,
  findOrCreateOpenConversationByUserId,
  listActiveModerationTerms,
  listAdminRooms,
  listMessagesByConversation,
  listModerationTerms,
  markMessagesReadByUser,
  markRoomDone,
  saveCustomerVote,
  updateRoomStatus,
} from "../repositories/chat.repository.js";
import { emitNewMessage, emitRoomDone, emitMessagesRead, getRoomPresence } from "../realtime/chat.socket.js";

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

export async function sendChatMessage({
  conversationId,
  senderId,
  content,
  type,
  authUserId,
  isAdmin,
}) {
  const normalizedConversationId = normalizePositiveInteger(conversationId, "Invalid conversationId");
  const normalizedSenderId = normalizePositiveInteger(senderId, "Invalid senderId");
  const normalizedContent = String(content ?? "").trim();
  const normalizedType = String(type ?? "TEXT").trim().toUpperCase();

  if (!normalizedContent) {
    throw new AppError("Message content is required", 400);
  }

  if (normalizedContent.length > 4000) {
    throw new AppError("Message content is too long", 400);
  }

  if (!isAdmin && Number(authUserId) !== normalizedSenderId) {
    throw new AppError("You cannot send message on behalf of another user", 401);
  }

  const conversation = await findConversationById(normalizedConversationId);
  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  if (!isAdmin && Number(conversation.userId) !== Number(authUserId)) {
    throw new AppError("Forbidden", 403);
  }

  if (String(conversation.status ?? "").toUpperCase() === "CLOSED") {
    if (!isAdmin) {
      throw new AppError("Chat room has been completed", 400);
    }

    await updateRoomStatus({ roomId: normalizedConversationId, status: "OPEN" });
  }

  const bannedTerms = await listActiveModerationTerms();
  const blockedTerm = detectBlockedTerm(normalizedContent, bannedTerms.map((item) => item.term));
  if (blockedTerm) {
    throw new AppError(`Message contains blocked term: ${blockedTerm}`, 400);
  }

  const message = await createMessage({
    conversationId: normalizedConversationId,
    senderId: normalizedSenderId,
    content: normalizedContent,
  });

  const responseDto = {
    id: message.id,
    conversationId: normalizedConversationId,
    senderId: message.senderId,
    sender: message.sender,
    content: message.content,
    type: normalizedType,
    status: "SENT",
    isRead: false,
    readByUserIds: [],
    createdAt: message.createdAt,
  };

  emitNewMessage(normalizedConversationId, responseDto);
  emitNewMessageEvent(responseDto);

  console.info(
    `[Chat] message=${message.id} conversation=${normalizedConversationId} sender=${normalizedSenderId}`,
  );

  return responseDto;
}

export async function getConversationMessages({
  conversationId,
  page,
  pageSize,
  requesterId,
  isAdmin,
}) {
  const normalizedConversationId = normalizePositiveInteger(conversationId, "Invalid conversationId");
  const normalizedPage = normalizePage(page);
  const normalizedPageSize = normalizePageSize(pageSize);

  const conversation = await findConversationById(normalizedConversationId);
  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  if (!isAdmin && Number(conversation.userId) !== Number(requesterId)) {
    throw new AppError("Forbidden", 403);
  }

  const skip = (normalizedPage - 1) * normalizedPageSize;
  const [total, messages] = await Promise.all([
    countMessagesByConversation(normalizedConversationId),
    listMessagesByConversation({
      conversationId: normalizedConversationId,
      skip,
      take: normalizedPageSize,
    }),
  ]);

  return {
    conversationId: normalizedConversationId,
    room: {
      id: conversation.id,
      status: conversation.status,
      customer: conversation.user,
      resolvedBy: conversation.meta?.resolver ?? null,
      resolvedAt: conversation.meta?.resolvedAt ?? null,
      customerVote: conversation.meta?.customerVote ?? null,
      presence: getRoomPresence(normalizedConversationId),
    },
    pagination: {
      page: normalizedPage,
      pageSize: normalizedPageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / normalizedPageSize)),
    },
    items: messages.map((item) => ({
      id: item.id,
      conversationId: normalizedConversationId,
      senderId: item.senderId,
      sender: item.sender,
      content: item.content,
      type: "TEXT",
      status: "SENT",
      isRead: item.reads.some((read) => Number(read.userId) === Number(requesterId)),
      readByUserIds: item.reads.map((read) => read.userId),
      createdAt: item.createdAt,
    })),
  };
}

export async function openMyConversation({ userId }) {
  const normalizedUserId = normalizePositiveInteger(userId, "Invalid user id");
  const room = await findOrCreateOpenConversationByUserId(normalizedUserId);

  return {
    roomId: room.id,
    status: room.status,
  };
}

export async function markRoomRead({ roomId, userId, isAdmin }) {
  const normalizedRoomId = normalizePositiveInteger(roomId, "Invalid conversationId");
  const normalizedUserId = normalizePositiveInteger(userId, "Invalid user id");

  const conversation = await findConversationById(normalizedRoomId);
  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  if (!isAdmin && Number(conversation.userId) !== normalizedUserId) {
    throw new AppError("Forbidden", 403);
  }

  const result = await markMessagesReadByUser({
    conversationId: normalizedRoomId,
    userId: normalizedUserId,
  });

  // Emit socket event for real-time updates
  if (result.messageIds && result.messageIds.length > 0) {
    emitMessagesRead(normalizedRoomId, result.messageIds, normalizedUserId);
  }

  return {
    roomId: normalizedRoomId,
    marked: result.count,
  };
}

export async function listChatRoomsForAdmin({ adminUserId }) {
  const rooms = await listAdminRooms();

  const output = [];
  for (const room of rooms) {
    const unreadCount = await countUnreadForAdmin(room.id, adminUserId);
    output.push({
      id: room.id,
      status: room.status,
      customer: room.user,
      lastMessage: room.messages[0]
        ? {
            id: room.messages[0].id,
            content: room.messages[0].content,
            sender: room.messages[0].sender,
            createdAt: room.messages[0].createdAt,
          }
        : null,
      unreadCount,
      presence: getRoomPresence(room.id),
      resolvedBy: room.meta?.resolver ?? null,
      resolvedAt: room.meta?.resolvedAt ?? null,
      customerVote: room.meta?.customerVote ?? null,
      updatedAt: room.updatedAt,
    });
  }

  return output;
}

export async function completeRoomByAdmin({ roomId, adminUserId }) {
  const normalizedRoomId = normalizePositiveInteger(roomId, "Invalid conversationId");
  const normalizedAdminUserId = normalizePositiveInteger(adminUserId, "Invalid admin user id");

  const conversation = await findConversationById(normalizedRoomId);
  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  const updated = await markRoomDone({
    roomId: normalizedRoomId,
    adminUserId: normalizedAdminUserId,
  });

  const payload = {
    roomId: normalizedRoomId,
    status: updated.status,
    resolvedBy: updated.meta?.resolver ?? null,
    resolvedAt: updated.meta?.resolvedAt ?? null,
    customerVote: updated.meta?.customerVote ?? null,
    time: new Date().toISOString(),
  };

  emitRoomDone(normalizedRoomId, payload);

  return payload;
}

export async function voteRoomByCustomer({ roomId, customerUserId, vote }) {
  const normalizedRoomId = normalizePositiveInteger(roomId, "Invalid conversationId");
  const normalizedCustomerUserId = normalizePositiveInteger(customerUserId, "Invalid user id");
  const normalizedVote = Number(vote);

  if (!Number.isFinite(normalizedVote) || normalizedVote < 1 || normalizedVote > 5) {
    throw new AppError("Vote must be between 1 and 5", 400);
  }

  const conversation = await findConversationById(normalizedRoomId);
  if (!conversation) {
    throw new AppError("Conversation not found", 404);
  }

  if (Number(conversation.userId) !== normalizedCustomerUserId) {
    throw new AppError("Forbidden", 403);
  }

  if (String(conversation.status ?? "").toUpperCase() !== "CLOSED") {
    throw new AppError("Only completed rooms can be rated", 400);
  }

  const meta = await saveCustomerVote({
    roomId: normalizedRoomId,
    vote: Math.trunc(normalizedVote),
  });

  return {
    roomId: normalizedRoomId,
    customerVote: meta.customerVote,
    resolvedBy: meta.resolver ?? null,
    resolvedAt: meta.resolvedAt ?? null,
  };
}

export async function getModerationTerms() {
  return listModerationTerms();
}

export async function addModerationTerm(term) {
  const normalized = String(term ?? "").trim().toLowerCase();
  if (!normalized) {
    throw new AppError("Term is required", 400);
  }

  if (normalized.length > 100) {
    throw new AppError("Term is too long", 400);
  }

  return createModerationTerm(normalized);
}

export async function removeModerationTerm(termId) {
  const normalizedTermId = normalizePositiveInteger(termId, "Invalid term id");
  return deleteModerationTermById(normalizedTermId);
}

export function mapChatServiceError(error) {
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      message: error.message,
    };
  }

  return {
    statusCode: 500,
    message: "Internal server error",
  };
}

function normalizePositiveInteger(value, message) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    throw new AppError(message, 400);
  }
  return Math.trunc(normalized);
}

function detectBlockedTerm(content, terms) {
  const normalizedContent = String(content ?? "").toLowerCase();
  for (const term of terms) {
    const normalizedTerm = String(term ?? "").trim().toLowerCase();
    if (!normalizedTerm) {
      continue;
    }

    if (normalizedContent.includes(normalizedTerm)) {
      return normalizedTerm;
    }
  }

  return "";
}

function normalizePage(value) {
  const normalized = Number(value ?? 1);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return 1;
  }
  return Math.trunc(normalized);
}

function normalizePageSize(value) {
  const normalized = Number(value ?? 20);
  if (!Number.isFinite(normalized) || normalized <= 0) {
    return 20;
  }

  return Math.min(100, Math.trunc(normalized));
}

function emitNewMessageEvent(payload) {
  const io = globalThis?.io;

  if (io && typeof io.emit === "function") {
    io.emit("new_message", payload);
    return;
  }

  console.info("[Realtime] Websocket not configured, skip new_message emit");
}
