import { Router } from "express";
import { z } from "zod";
import {
  buildAiRecommendation,
  generateAiChatReply,
} from "../../services/ai.service.js";

const router = Router();

const recommendSchema = z.object({
  budget: z.number().positive(),
  usage: z.string().min(1),
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

router.post("/recommend-build", async (req, res) => {
  try {
    const payload = recommendSchema.parse(req.body);
    const data = await buildAiRecommendation(payload);
    return res.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Invalid AI recommend payload",
        issues: error.flatten(),
      });
    }

    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Unexpected server error" });
  }
});

router.post("/chat-build", async (req, res) => {
  try {
    const payload = chatSchema.parse(req.body);
    const data = await generateAiChatReply(payload);
    return res.json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Invalid AI chat payload",
        issues: error.flatten(),
      });
    }

    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Unexpected server error" });
  }
});

export { router as aiRouter };
