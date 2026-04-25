import { buildAiRecommendation, generateAiChatReply } from "./ai.service.js";
import {
  findProductsForSuggestion,
  findProductsForSuggestionByScope,
} from "../repositories/ai-advisor.repository.js";

const PC_CATEGORY_SLUGS = ["cpu", "mainboard", "ram", "vga", "ssd", "hdd", "psu", "case", "cooling"];
const GEAR_CATEGORY_SLUGS = ["mouse", "keyboard", "headset", "monitor", "speaker", "webcam", "microphone", "cable", "hub", "stand", "pad"];

const COMPONENT_KEYWORD_TO_SLUGS = [
  { keywords: ["cpu", "processor"], slug: "cpu" },
  { keywords: ["gpu", "vga", "card do hoa", "card đồ họa"], slug: "vga" },
  { keywords: ["ram", "memory"], slug: "ram" },
  { keywords: ["ssd"], slug: "ssd" },
  { keywords: ["hdd"], slug: "hdd" },
  { keywords: ["main", "mainboard", "motherboard"], slug: "mainboard" },
  { keywords: ["psu", "nguon", "nguồn"], slug: "psu" },
  { keywords: ["case", "vo", "vỏ"], slug: "case" },
  { keywords: ["cooling", "tan nhiet", "tản nhiệt"], slug: "cooling" },
  { keywords: ["chuot", "chuột", "mouse"], slug: "mouse" },
  { keywords: ["ban phim", "bàn phím", "keyboard"], slug: "keyboard" },
  { keywords: ["tai nghe", "headset"], slug: "headset" },
  { keywords: ["man hinh", "màn hình", "monitor"], slug: "monitor" },
];

class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
  }
}

export async function askAiAdvisor({ question, scope = "BOTH" }) {
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
  const normalizedScope = resolveScope(scope, cleanedQuestion);
  const requestedComponentSlug = detectRequestedComponentSlug(cleanedQuestion);

  if (requestedComponentSlug) {
    const componentProducts = await findProductsForSuggestionByScope({
      limit: 5,
      includeCategorySlugs: [requestedComponentSlug],
    });

    return {
      mode: "COMPONENT_ONLY",
      scope: normalizedScope,
      componentType: requestedComponentSlug,
      suggestions: componentProducts.map((item) => ({
        name: item.name,
        price: Number(item.salePrice ?? item.price ?? 0),
        reason: `Phù hợp cho mục tiêu ${usage}. Danh mục ${String(item.category?.name ?? requestedComponentSlug)}.`,
      })),
    };
  }

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
      const scopedSuggestions = filterSuggestionsByScope(suggestions, normalizedScope);
      return {
        mode: "FULL_BUILD",
        scope: normalizedScope,
        suggestions: scopedSuggestions,
      };
    }
  } catch (error) {
    console.error("[AIAdvisor] buildAiRecommendation fallback", error);
  }

  const [chatReply, fallbackProducts] = await Promise.all([
    generateAiChatReply({ message: cleanedQuestion, history: [] }),
    loadFallbackByScope(normalizedScope),
  ]);

  const suggestions = fallbackProducts.map((product) => ({
    name: product.name,
    price: Number(product.salePrice ?? product.price ?? 0),
    reason: `Goi y fallback theo ton kho danh muc ${String(product.category?.name ?? "linh kien")}. ${String(chatReply?.reply ?? "")}`.trim(),
  }));

  return {
    mode: "FALLBACK",
    scope: normalizedScope,
    suggestions,
  };
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

function resolveScope(scopeInput, question) {
  const raw = String(scopeInput ?? "").trim().toUpperCase();
  if (["PC", "GEAR", "BOTH"].includes(raw)) {
    return raw;
  }

  const normalizedQuestion = String(question ?? "").toLowerCase();
  if (/gear|phu kien|phụ kiện|chuot|chuột|ban phim|bàn phím|tai nghe|monitor|man hinh|màn hình/.test(normalizedQuestion)) {
    if (/pc|linh kien|linh kiện|build/.test(normalizedQuestion)) {
      return "BOTH";
    }
    return "GEAR";
  }

  if (/pc|linh kien|linh kiện|build/.test(normalizedQuestion)) {
    return "PC";
  }

  return "BOTH";
}

function detectRequestedComponentSlug(question) {
  const normalized = String(question ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

  for (const item of COMPONENT_KEYWORD_TO_SLUGS) {
    if (item.keywords.some((keyword) => normalized.includes(keyword))) {
      return item.slug;
    }
  }

  return null;
}

function filterSuggestionsByScope(suggestions, scope) {
  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    return [];
  }

  if (scope === "BOTH") {
    return suggestions;
  }

  const allowed = scope === "PC" ? PC_CATEGORY_SLUGS : GEAR_CATEGORY_SLUGS;
  return suggestions.filter((item) => {
    const reason = String(item?.reason ?? "").toLowerCase();
    const name = String(item?.name ?? "").toLowerCase();
    return allowed.some((slug) => reason.includes(slug) || name.includes(slug));
  });
}

async function loadFallbackByScope(scope) {
  if (scope === "PC") {
    return findProductsForSuggestionByScope({
      limit: 5,
      includeCategorySlugs: PC_CATEGORY_SLUGS,
    });
  }

  if (scope === "GEAR") {
    return findProductsForSuggestionByScope({
      limit: 5,
      includeCategorySlugs: GEAR_CATEGORY_SLUGS,
    });
  }

  return findProductsForSuggestion(5);
}
