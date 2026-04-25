import { z } from "zod";
import { askAiAdvisor, mapAiAdvisorError } from "../../services/ai-advisor.service.js";

const askSchema = z.object({
  question: z.string().min(1).max(500),
  scope: z.enum(["PC", "GEAR", "BOTH"]).optional(),
});

export async function askAiAdvisorHandler(req, res) {
  try {
    const parsed = askSchema.parse(req.body ?? {});
    const data = await askAiAdvisor(parsed);
    return res.status(200).json(data);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Invalid request payload",
        issues: error.flatten(),
      });
    }

    const mapped = mapAiAdvisorError(error);
    if (mapped.statusCode >= 500) {
      console.error("[AIAdvisorAPI]", error);
    }

    return res.status(mapped.statusCode).json({ message: mapped.message });
  }
}
