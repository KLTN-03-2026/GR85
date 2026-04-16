const API_ENDPOINT = "/api/ai/recommend-build";

export async function requestAiBuildRecommendation(input) {
  const response = await fetch(API_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      budget: Number(input?.budget ?? 0),
      usage: String(input?.usage ?? "general"),
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

  return {
    items,
    summary,
  };
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
    category,
    name,
    brand: String(item.brand ?? item.manufacturer ?? "TechBuiltAI"),
    price: normalizeNumber(item.price),
    usedPrice: item.usedPrice == null ? null : normalizeNumber(item.usedPrice),
  };
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
  ]);

  return allowed.has(normalized) ? normalized : "";
}

function normalizeNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}
