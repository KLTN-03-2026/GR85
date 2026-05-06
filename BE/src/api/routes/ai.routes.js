import { Router } from "express";
import { z } from "zod";
import {
  buildAiRecommendation,
  generateAiChatReply,
} from "../../services/ai.service.js";
import { askAiAdvisorHandler } from "../controllers/ai-advisor.controller.js";
import { optionalAuth } from "../../middleware/auth.js";
import { isAiEnabled } from "../../services/ai-admin.service.js";
import { prisma } from "../../db/prisma.js";

const router = Router();

const recommendSchema = z.object({
  budget: z.number().positive(),
  usage: z.string().min(1),
  targetCategories: z.array(z.string()).optional().nullable(),
  preferredBrands: z.array(z.string()).optional().default([]),
  allowUsed: z.boolean().optional().default(false),
});

const chatSchema = z.object({
  message: z.string().min(1),
  history: z
    .array(
      z.object({
        role: z.string(),
        content: z.string(),
      }),
    )
    .optional()
    .default([]),
});

async function ensureAiEnabled(req, res, next) {
  try {
    const enabled = await isAiEnabled();
    if (!enabled) {
      return res.status(503).json({
        message: "Tính năng AI hiện đang tắt bởi quản trị viên.",
      });
    }
    return next();
  } catch (error) {
    return res.status(500).json({
      message: "Không thể kiểm tra trạng thái hệ thống AI.",
    });
  }
}

router.post("/recommend-build", optionalAuth, ensureAiEnabled, async (req, res) => {
  try {
    const payload = recommendSchema.parse(req.body);
    const data = await buildAiRecommendation(payload);

    prisma.aiRequestLog
      .create({
        data: {
          userId: req.auth ? Number(req.auth.sub) : null,
          endpoint: "recommend-build",
          prompt: JSON.stringify(payload),
          response: String(data?.summary ?? "Recommend build generated"),
          modelUsed: "RULE_BASED",
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          cost: 0,
        },
      })
      .catch((err) => {
        console.error("Error logging recommend-build request", err);
      });

    return res.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Dữ liệu AI gợi ý build không hợp lệ",
        issues: error.flatten(),
      });
    }

    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
  }
});

router.post("/ask", optionalAuth, ensureAiEnabled, askAiAdvisorHandler);

router.post("/chat-build", optionalAuth, ensureAiEnabled, async (req, res) => {
  try {
    const payload = chatSchema.parse(req.body);
    const userId = req.auth ? Number(req.auth.sub) : null;
    const data = await generateAiChatReply(payload, userId);
    return res.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Dữ liệu AI chat không hợp lệ",
        issues: error.flatten(),
      });
    }

    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
  }
});

export { router as aiRouter };
