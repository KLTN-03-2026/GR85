import { buildAiRecommendation, generateAiChatReply } from "./ai.service.js";
import { findProductsForSuggestion } from "../repositories/ai-advisor.repository.js";

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

export async function askAiAdvisor({ question }) {
  const normalizedQuestion = String(question ?? "").trim();
  if (!normalizedQuestion) {
    throw new AppError("question is required", 400);
  }

  if (normalizedQuestion.length > 500) {
    throw new AppError("question length must be <= 500", 400);
  }

  const cleanedQuestion = sanitizeQuestion(normalizedQuestion);
  console.info(`[AIAdvisor] incoming question: ${cleanedQuestion}`);

  const budget = extractBudgetFromQuestion(cleanedQuestion) ?? 20_000_000;
  const usage = detectUsage(cleanedQuestion);

  try {
    const recommendation = await buildAiRecommendation({
      budget,
      usage,
      preferredBrands: [],
      allowUsed: false,
    });

    const suggestions = Array.isArray(recommendation?.items)
      ? recommendation.items.slice(0, 5).map((item) => ({
          name: item.name,
          price: Number(item.price ?? 0),
          reason: `Phu hop nhu cau ${usage}, danh muc ${String(item.category ?? "component")}, diem ${Number(item?.score?.total ?? 0)}/100`,
        }))
      : [];

    if (suggestions.length > 0) {
      return { suggestions };
    }
  } catch (error) {
    console.error("[AIAdvisor] buildAiRecommendation fallback", error);
  }

  const [chatReply, fallbackProducts] = await Promise.all([
    generateAiChatReply({ message: cleanedQuestion, history: [] }),
    findProductsForSuggestion(5),
  ]);

  const suggestions = fallbackProducts.map((product) => ({
    name: product.name,
    price: Number(product.salePrice ?? product.price ?? 0),
    reason: `Goi y fallback theo ton kho danh muc ${String(product.category?.name ?? "linh kien")}. ${String(chatReply?.reply ?? "")}`.trim(),
  }));

  return { suggestions };
}

export function mapAiAdvisorError(error) {
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

function sanitizeQuestion(input) {
  return input
    .replace(/\s+/g, " ")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim();
}

function extractBudgetFromQuestion(question) {
  const millionMatch = String(question).toLowerCase().match(/(\d+(?:[\.,]\d+)?)\s*(tr|trieu|m)\b/i);
  if (millionMatch) {
    const value = Number(String(millionMatch[1]).replace(",", "."));
    if (Number.isFinite(value)) {
      return Math.round(value * 1_000_000);
    }
  }

  const numberMatch = String(question).match(/(\d{7,11})/);
  if (numberMatch) {
    const value = Number(numberMatch[1]);
    if (Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function detectUsage(question) {
  const normalized = String(question ?? "").toLowerCase();
  if (/render|thiet ke|workstation|edit|dung do hoa/.test(normalized)) {
    return "workstation";
  }

  if (/game|gaming|fps|esport/.test(normalized)) {
    return "gaming";
  }

  return "general";
}
