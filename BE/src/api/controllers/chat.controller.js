import { z } from "zod";
import {
  addModerationTerm,
  completeRoomByAdmin,
  getConversationMessages,
  getModerationTerms,
  listChatRoomsForAdmin,
  mapChatServiceError,
  markRoomRead,
  openMyConversation,
  removeModerationTerm,
  sendChatMessage,
  voteRoomByCustomer,
} from "../../services/chat.service.js";

const sendMessageSchema = z.object({
  conversationId: z.number().int().positive(),
  senderId: z.number().int().positive(),
  content: z.string().min(1).max(4000),
  type: z.string().max(30).optional().default("TEXT"),
});

const voteSchema = z.object({
  vote: z.number().int().min(1).max(5),
});

const moderationTermSchema = z.object({
  term: z.string().min(1).max(100),
});

export async function openMyConversationHandler(req, res) {
  try {
    const data = await openMyConversation({
      userId: Number(req.auth?.sub ?? 0),
    });

    return res.status(200).json(data);
  } catch (error) {
    return handleError(error, res);
  }
}

export async function sendMessageHandler(req, res) {
  try {
    const parsed = sendMessageSchema.parse(req.body ?? {});

    console.info(
      `[ChatAPI] send conversation=${parsed.conversationId} sender=${parsed.senderId}`,
    );

    const data = await sendChatMessage({
      ...parsed,
      authUserId: Number(req.auth?.sub ?? 0),
      isAdmin: isAdminRole(req.auth?.role),
    });

    return res.status(200).json(data);
  } catch (error) {
    return handleError(error, res);
  }
}

export async function getMessagesHandler(req, res) {
  try {
    const data = await getConversationMessages({
      conversationId: Number(req.params.conversationId),
      page: Number(req.query.page ?? 1),
      pageSize: Number(req.query.pageSize ?? 20),
      requesterId: Number(req.auth?.sub ?? 0),
      isAdmin: isAdminRole(req.auth?.role),
    });

    return res.status(200).json(data);
  } catch (error) {
    return handleError(error, res);
  }
}

export async function markReadHandler(req, res) {
  try {
    const data = await markRoomRead({
      roomId: Number(req.params.conversationId),
      userId: Number(req.auth?.sub ?? 0),
      isAdmin: isAdminRole(req.auth?.role),
    });

    return res.status(200).json(data);
  } catch (error) {
    return handleError(error, res);
  }
}

export async function listAdminRoomsHandler(req, res) {
  try {
    const data = await listChatRoomsForAdmin({
      adminUserId: Number(req.auth?.sub ?? 0),
    });
    return res.status(200).json(data);
  } catch (error) {
    return handleError(error, res);
  }
}

export async function markDoneHandler(req, res) {
  try {
    const data = await completeRoomByAdmin({
      roomId: Number(req.params.conversationId),
      adminUserId: Number(req.auth?.sub ?? 0),
    });

    return res.status(200).json(data);
  } catch (error) {
    return handleError(error, res);
  }
}

export async function voteRoomHandler(req, res) {
  try {
    const parsed = voteSchema.parse(req.body ?? {});
    const data = await voteRoomByCustomer({
      roomId: Number(req.params.conversationId),
      customerUserId: Number(req.auth?.sub ?? 0),
      vote: parsed.vote,
    });

    return res.status(200).json(data);
  } catch (error) {
    return handleError(error, res);
  }
}

export async function listModerationTermsHandler(_req, res) {
  try {
    const data = await getModerationTerms();
    return res.status(200).json(data);
  } catch (error) {
    return handleError(error, res);
  }
}

export async function createModerationTermHandler(req, res) {
  try {
    const parsed = moderationTermSchema.parse(req.body ?? {});
    const data = await addModerationTerm(parsed.term);
    return res.status(201).json(data);
  } catch (error) {
    return handleError(error, res);
  }
}

export async function deleteModerationTermHandler(req, res) {
  try {
    await removeModerationTerm(Number(req.params.termId));
    return res.status(200).json({ ok: true });
  } catch (error) {
    return handleError(error, res);
  }
}

function handleError(error, res) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      message: "Invalid chat payload",
      issues: error.flatten(),
    });
  }

  const mapped = mapChatServiceError(error);
  if (mapped.statusCode >= 500) {
    console.error("[ChatAPI]", error);
  }

  return res.status(mapped.statusCode).json({ message: mapped.message });
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
