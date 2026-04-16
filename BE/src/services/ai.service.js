import { prisma } from "../db/prisma.js";
import { serializeData } from "../utils/serialize.js";

const CATEGORY_ORDER = [
  "cpu",
  "vga",
  "mainboard",
  "ram",
  "ssd",
  "psu",
  "case",
  "cooling",
];

const USAGE_BUDGET_RATIO = {
  gaming: {
    cpu: 0.2,
    vga: 0.35,
    mainboard: 0.1,
    ram: 0.1,
    ssd: 0.09,
    psu: 0.08,
    case: 0.04,
    cooling: 0.04,
  },
  workstation: {
    cpu: 0.3,
    vga: 0.2,
    mainboard: 0.1,
    ram: 0.15,
    ssd: 0.1,
    psu: 0.07,
    case: 0.04,
    cooling: 0.04,
  },
  general: {
    cpu: 0.2,
    vga: 0.25,
    mainboard: 0.12,
    ram: 0.12,
    ssd: 0.12,
    psu: 0.09,
    case: 0.05,
    cooling: 0.05,
  },
};

export async function buildAiRecommendation(input) {
  const usage = normalizeUsage(input.usage);
  const budget = Number(input.budget);
  const preferredBrands = Array.isArray(input.preferredBrands)
    ? input.preferredBrands.map((item) => String(item).trim()).filter(Boolean)
    : [];

  const ratioMap = USAGE_BUDGET_RATIO[usage] || USAGE_BUDGET_RATIO.general;

  const productsByCategory = await Promise.all(
    CATEGORY_ORDER.map(async (categorySlug) => {
      const categoryBudget = budget * (ratioMap[categorySlug] ?? 0.125);
      const where = {
        category: {
          slug: categorySlug,
        },
        stockQuantity: {
          gt: 0,
        },
      };

      if (preferredBrands.length > 0) {
        where.OR = preferredBrands.map((brand) => ({
          OR: [
            {
              supplier: {
                name: {
                  contains: brand,
                },
              },
            },
            {
              name: {
                contains: brand,
              },
            },
          ],
        }));
      }

      const candidates = await prisma.product.findMany({
        where,
        orderBy: [{ price: "desc" }, { createdAt: "desc" }],
        include: {
          category: true,
          supplier: true,
        },
        take: 30,
      });

      const budgetWithTolerance = categoryBudget * 1.2;
      const selectedWithinBudget = candidates.find(
        (item) => Number(item.price) <= budgetWithTolerance,
      );

      const selected =
        selectedWithinBudget || candidates[candidates.length - 1] || null;

      return selected
        ? {
            id: selected.id,
            name: selected.name,
            category: mapCategorySlugForFrontend(selected.category?.slug),
            brand:
              selected.supplier?.name ||
              extractBrand(selected.specifications) ||
              "PC Perfect",
            price: Number(selected.price),
            usedPrice: null,
          }
        : null;
    }),
  );

  const items = productsByCategory.filter(Boolean);
  const totalPrice = items.reduce(
    (sum, item) => sum + Number(item.price ?? 0),
    0,
  );

  return serializeData({
    items,
    summary:
      items.length > 0
        ? `Da goi y ${items.length} linh kien cho nhu cau ${usage}. Tong gia du kien ${new Intl.NumberFormat("vi-VN").format(totalPrice)} VND.`
        : "Chua tim thay linh kien phu hop voi bo loc hien tai. Thu bo trong bo loc hang hoac tang ngan sach.",
    usage,
    budget,
    totalPrice,
    allowUsed: Boolean(input.allowUsed),
  });
}

export async function generateAiChatReply(input) {
  const message = String(input.message ?? "").trim();
  if (!message) {
    throw new Error("Message is required");
  }

  const budget = extractBudgetFromText(message);

  const replyParts = [
    "Minh da nhan cau hoi ve build PC.",
    budget
      ? `Voi ngan sach khoang ${new Intl.NumberFormat("vi-VN").format(budget)} VND, ban nen uu tien GPU va CPU truoc.`
      : "Ban co the cho minh biet ngan sach va muc dich su dung (gaming, workstation, hoc tap) de tu van chinh xac hon.",
    "Neu ban muon, hay vao trang AI goi y cau hinh de nhan danh sach linh kien chi tiet.",
  ];

  return serializeData({
    reply: replyParts.join(" "),
  });
}

function normalizeUsage(value) {
  const usage = String(value ?? "general")
    .trim()
    .toLowerCase();
  if (usage === "gaming" || usage === "workstation") {
    return usage;
  }
  return "general";
}

function mapCategorySlugForFrontend(categorySlug) {
  const normalized = String(categorySlug ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "vga") {
    return "gpu";
  }

  if (normalized === "mainboard") {
    return "motherboard";
  }

  if (normalized === "ssd") {
    return "storage";
  }

  return normalized;
}

function extractBudgetFromText(text) {
  const normalized = String(text ?? "").toLowerCase();

  const millionMatch = normalized.match(/(\d+(?:[\.,]\d+)?)\s*(tr|trieu|m)/i);
  if (millionMatch) {
    const value = Number(millionMatch[1].replace(",", "."));
    if (Number.isFinite(value)) {
      return Math.round(value * 1_000_000);
    }
  }

  const rawNumberMatch = normalized.match(/(\d{7,11})/);
  if (rawNumberMatch) {
    const value = Number(rawNumberMatch[1]);
    if (Number.isFinite(value)) {
      return value;
    }
  }

  return null;
}

function extractBrand(specifications) {
  if (!specifications || typeof specifications !== "object") {
    return "";
  }

  const brand = specifications.brand;
  return String(brand ?? "").trim();
}
