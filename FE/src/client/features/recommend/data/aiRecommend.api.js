const API_ENDPOINT = "/api/ai/recommend-build";
const ADVISOR_ASK_ENDPOINT = "/api/ai/ask";
const ADVISOR_CHAT_ENDPOINT = "/api/ai/chat-build";

export async function requestAiBuildRecommendation(input) {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      budget: Number(input?.budget ?? 0),
      usage: String(input?.usage ?? "general"),
      targetCategories: input?.targetCategories || null,
      preferredBrands: Array.isArray(input?.preferredBrands)
        ? input.preferredBrands.map((brand) => String(brand))
        : [],
      allowUsed: Boolean(input?.allowUsed),
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload?.message || "Backend không xử lý được yêu cầu AI build PC",
    );
  }

  const rawItems = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.recommendation)
      ? payload.recommendation
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

  const items = rawItems.map(normalizeRecommendedItem).filter(Boolean);
  const summary = String(
    payload?.summary ?? payload?.message ?? payload?.advice ?? "",
  ).trim();

  const buildScore = normalizeBuildScore(payload?.buildScore);
  const categoryAnalysis = Array.isArray(payload?.categoryAnalysis)
    ? payload.categoryAnalysis.map(normalizeCategoryAnalysisItem).filter(Boolean)
    : [];
  const strengths = normalizeStringList(payload?.strengths);
  const weaknesses = normalizeStringList(payload?.weaknesses);
  const recommendations = normalizeStringList(payload?.recommendations);
  const fullCatalog = Array.isArray(payload?.fullCatalog)
    ? payload.fullCatalog.map(normalizeCatalogCategory).filter(Boolean)
    : [];

  return {
    items,
    summary,
    budget: normalizeNumber(payload?.budget),
    usage: String(payload?.usage ?? "general"),
    totalPrice: normalizeNumber(payload?.totalPrice),
    buildScore,
    categoryAnalysis,
    strengths,
    weaknesses,
    recommendations,
    fullCatalog,
  };
}

export async function requestAiAdvisorRecommendation({ question, scope = "BOTH" }) {
  const response = await fetch(ADVISOR_ASK_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question: String(question ?? "").trim(),
      scope,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || "Không thể lấy tư vấn AI");
  }

  return payload;
}

export async function requestAiAdvisorChat({ message, history = [] }) {
  const response = await fetch(ADVISOR_CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: String(message ?? "").trim(),
      history: Array.isArray(history)
        ? history.map((item) => ({
          role: String(item?.role ?? "user"),
          content: String(item?.content ?? ""),
        }))
        : [],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.message || "Không thể chat với AI");
  }

  return payload;
}

function normalizeRecommendedItem(item, index) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const category = normalizeCategory(
    item.category || item.categorySlug || item.type,
  );
  if (!category) {
    return null;
  }

  const name = String(item.name ?? item.productName ?? "").trim();
  if (!name) {
    return null;
  }

  return {
    id: item.id ?? `${category}-${index}`,
    slug: String(item.slug ?? ""),
    categorySlug: String(item.categorySlug ?? category),
    category,
    name,
    brand: String(item.brand ?? item.manufacturer ?? "TechBuiltAI"),
    price: normalizeNumber(item.price),
    usedPrice: item.usedPrice == null ? null : normalizeNumber(item.usedPrice),
    stockQuantity: normalizeNumber(item.stockQuantity),
    specCount: normalizeNumber(item.specCount),
    score: normalizeItemScore(item.score),
  };
}

function normalizeBuildScore(value) {
  if (!value || typeof value !== "object") {
    return {
      overall: 0,
      coverage: 0,
      budget: 0,
      balance: 0,
      productQuality: 0,
      compatibility: 0,
    };
  }

  return {
    overall: normalizeNumber(value.overall),
    coverage: normalizeNumber(value.coverage),
    budget: normalizeNumber(value.budget),
    balance: normalizeNumber(value.balance),
    productQuality: normalizeNumber(value.productQuality),
    compatibility: normalizeNumber(value.compatibility),
  };
}

function normalizeItemScore(value) {
  if (!value || typeof value !== "object") {
    return {
      total: 0,
      performance: 0,
      budgetFit: 0,
      stock: 0,
      information: 0,
      preferredBrand: 0,
    };
  }

  return {
    total: normalizeNumber(value.total),
    performance: normalizeNumber(value.performance),
    budgetFit: normalizeNumber(value.budgetFit),
    stock: normalizeNumber(value.stock),
    information: normalizeNumber(value.information),
    preferredBrand: normalizeNumber(value.preferredBrand),
  };
}

function normalizeCategoryAnalysisItem(item) {
  if (!item || typeof item !== "object") {
    return null;
  }

  const category = normalizeCategory(item.category || item.categorySlug);
  if (!category) {
    return null;
  }

  return {
    category,
    categorySlug: String(item.categorySlug ?? category),
    targetBudget: normalizeNumber(item.targetBudget),
    selectedPrice: normalizeNumber(item.selectedPrice),
    budgetFitPercent: normalizeNumber(item.budgetFitPercent),
    selectedProductId: item.selectedProductId ?? null,
    selectedProductName: String(item.selectedProductName ?? ""),
    selectedScore: normalizeNumber(item.selectedScore),
    productCount: normalizeNumber(item.productCount),
  };
}

function normalizeCatalogCategory(categoryItem) {
  if (!categoryItem || typeof categoryItem !== "object") {
    return null;
  }

  const category = normalizeCategory(categoryItem.category || categoryItem.categorySlug);
  if (!category) {
    return null;
  }

  const products = Array.isArray(categoryItem.products)
    ? categoryItem.products.map((product, index) => normalizeCatalogProduct(product, index)).filter(Boolean)
    : [];

  return {
    category,
    categorySlug: String(categoryItem.categorySlug ?? category),
    targetBudget: normalizeNumber(categoryItem.targetBudget),
    products,
  };
}

function normalizeCatalogProduct(item, index) {
  if (!item || typeof item !== "object") {
    return null;
  }

  return {
    id: item.id ?? `catalog-item-${index}`,
    slug: String(item.slug ?? ""),
    name: String(item.name ?? "").trim(),
    brand: String(item.brand ?? "PC Perfect"),
    price: normalizeNumber(item.price),
    stockQuantity: normalizeNumber(item.stockQuantity),
    specCount: normalizeNumber(item.specCount),
    score: normalizeItemScore(item.score),
  };
}

function normalizeStringList(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function normalizeCategory(value) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "vga") {
    return "gpu";
  }

  if (normalized === "ssd") {
    return "storage";
  }

  if (normalized === "mainboard") {
    return "motherboard";
  }

  const allowed = new Set([
    "cpu",
    "gpu",
    "ram",
    "storage",
    "motherboard",
    "psu",
    "case",
    "cooling",
    "mouse",
    "keyboard",
    "headset",
    "hub",
    "microphone",
    "webcam",
    "monitor",
    "speaker",
    "cable",
    "stand",
    "pad",
  ]);

  return allowed.has(normalized) ? normalized : "";
}

function normalizeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}
