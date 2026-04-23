import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import {
  createModerationTermHandler,
  deleteModerationTermHandler,
  getMessagesHandler,
  listAdminRoomsHandler,
  listModerationTermsHandler,
  markDoneHandler,
  markReadHandler,
  openMyConversationHandler,
  sendMessageHandler,
  voteRoomHandler,
} from "../controllers/chat.controller.js";

const router = Router();

router.post("/room/open", requireAuth, openMyConversationHandler);
router.post("/send", requireAuth, sendMessageHandler);

router.get("/admin/rooms", requireAuth, requireAdminRole, listAdminRoomsHandler);
router.post("/admin/rooms/:conversationId/done", requireAuth, requireAdminRole, markDoneHandler);
router.get("/admin/moderation/terms", requireAuth, requireAdminRole, listModerationTermsHandler);
router.post("/admin/moderation/terms", requireAuth, requireAdminRole, createModerationTermHandler);
router.delete("/admin/moderation/terms/:termId", requireAuth, requireAdminRole, deleteModerationTermHandler);

router.get("/:conversationId", requireAuth, getMessagesHandler);
router.post("/:conversationId/read", requireAuth, markReadHandler);
router.post("/:conversationId/vote", requireAuth, voteRoomHandler);

function requireAdminRole(req, res, next) {
  const normalizedRole = String(req.auth?.role ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

  const isAdmin = normalizedRole.includes("admin") || normalizedRole.includes("quan tri");
  if (!isAdmin) {
    return res.status(403).json({ message: "Only admin can access this endpoint" });
  }

  return next();
}

export { router as chatRouter };
