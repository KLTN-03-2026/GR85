import { prisma } from "../db/prisma.js";
import { serializeData } from "../utils/serialize.js";

const REQUIRED_CATEGORY_SLUGS = [
  "cable",
  "cpu",
  "headset",
  "hub",
  "keyboard",
  "mainboard",
  "microphone",
  "monitor",
  "mouse",
  "pad",
  "ram",
  "speaker",
  "ssd",
  "stand",
  "vga",
  "webcam",
];

const CORE_CATEGORY_SLUGS = [
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
    cpu: 0.16,
    vga: 0.28,
    mainboard: 0.08,
    ram: 0.1,
    ssd: 0.08,
    psu: 0.06,
    case: 0.04,
    cooling: 0.03,
  },
  workstation: {
    cpu: 0.22,
    vga: 0.16,
    mainboard: 0.09,
    ram: 0.14,
    ssd: 0.1,
    psu: 0.06,
    case: 0.04,
    cooling: 0.03,
  },
  general: {
    cpu: 0.16,
    vga: 0.18,
    mainboard: 0.1,
    ram: 0.1,
    ssd: 0.1,
    psu: 0.06,
    case: 0.04,
    cooling: 0.03,
  },
};

export async function buildAiRecommendation(input) {
  const usage = normalizeUsage(input.usage);
  const budget = Number(input.budget);
  const preferredBrands = Array.isArray(input.preferredBrands)
    ? input.preferredBrands.map((item) => String(item).trim()).filter(Boolean)
    : [];

  const ratioMap = USAGE_BUDGET_RATIO[usage] || USAGE_BUDGET_RATIO.general;
  const targetBudgetMap = buildTargetBudgetMap({
    budget,
    ratioMap,
    requiredSlugs: REQUIRED_CATEGORY_SLUGS,
  });

  const productsByCategory = await Promise.all(
    REQUIRED_CATEGORY_SLUGS.map(async (categorySlug) => {
      const categoryBudget = Number(targetBudgetMap[categorySlug] ?? 0);

      const candidates = await prisma.product.findMany({
        where: {
          category: {
            slug: categorySlug,
          },
          stockQuantity: {
            gt: 0,
          },
        },
        orderBy: [{ price: "asc" }, { createdAt: "desc" }],
        include: {
          category: true,
          supplier: true,
        },
        take: 80,
      });

      const priceList = candidates.map((item) => Number(item.price));
      const minPrice = priceList.length > 0 ? Math.min(...priceList) : 0;
      const maxPrice = priceList.length > 0 ? Math.max(...priceList) : 0;

      const products = candidates
        .map((item) => {
          const price = Number(item.price);
          const brand =
            item.supplier?.name || extractBrand(item.specifications) || "PC Perfect";
          const specCount = Object.keys(item.specifications ?? {}).length;

          const performanceScore = normalizePriceScore(price, minPrice, maxPrice);
          const budgetFitScore = scoreBudgetFit(price, categoryBudget);
          const stockScore = Math.min(100, Math.max(25, Number(item.stockQuantity) * 4));
          const infoScore = Math.min(100, 45 + specCount * 9);
          const preferredBrandScore = isPreferredBrand(item, preferredBrands) ? 100 : 55;

          const totalScore = Math.round(
            performanceScore * 0.34 +
            budgetFitScore * 0.3 +
            stockScore * 0.14 +
            infoScore * 0.12 +
            preferredBrandScore * 0.1,
          );

          return {
            id: item.id,
            slug: item.slug,
            name: item.name,
            categorySlug,
            category: mapCategorySlugForFrontend(item.category?.slug),
            brand,
            price,
            stockQuantity: Number(item.stockQuantity ?? 0),
            specCount,
            score: {
              total: totalScore,
              performance: Math.round(performanceScore),
              budgetFit: Math.round(budgetFitScore),
              stock: Math.round(stockScore),
              information: Math.round(infoScore),
              preferredBrand: Math.round(preferredBrandScore),
            },
            supplierName: item.supplier?.name || null,
          };
        })
        .sort((a, b) => a.price - b.price || b.score.total - a.score.total);

      return {
        categorySlug,
        category: mapCategorySlugForFrontend(categorySlug),
        categoryBudget,
        products,
      };
    }),
  );

  const selectedIndexByCategory = new Map();
  for (const group of productsByCategory) {
    if (group.products.length > 0) {
      selectedIndexByCategory.set(group.categorySlug, 0);
    }
  }

  let totalPrice = productsByCategory.reduce((sum, group) => {
    const index = selectedIndexByCategory.get(group.categorySlug);
    if (!Number.isInteger(index)) {
      return sum;
    }
    return sum + Number(group.products[index]?.price ?? 0);
  }, 0);

  let remainingBudget = Math.max(0, budget - totalPrice);

  while (remainingBudget > 0) {
    let bestUpgrade = null;

    for (const group of productsByCategory) {
      const currentIndex = selectedIndexByCategory.get(group.categorySlug);
      if (!Number.isInteger(currentIndex)) {
        continue;
      }

      const current = group.products[currentIndex];
      const next = group.products[currentIndex + 1];
      if (!next) {
        continue;
      }

      const priceDiff = Number(next.price) - Number(current.price);
      if (priceDiff <= 0 || priceDiff > remainingBudget) {
        continue;
      }

      const scoreDiff = Math.max(0, Number(next.score?.total ?? 0) - Number(current.score?.total ?? 0));
      const categoryPriority = getCategoryUpgradePriority(usage, group.categorySlug);
      const upgradeScore = (scoreDiff + 1) * categoryPriority / priceDiff;

      if (!bestUpgrade || upgradeScore > bestUpgrade.upgradeScore) {
        bestUpgrade = {
          categorySlug: group.categorySlug,
          nextIndex: currentIndex + 1,
          priceDiff,
          upgradeScore,
        };
      }
    }

    if (!bestUpgrade) {
      break;
    }

    selectedIndexByCategory.set(bestUpgrade.categorySlug, bestUpgrade.nextIndex);
    totalPrice += bestUpgrade.priceDiff;
    remainingBudget = Math.max(0, budget - totalPrice);
  }

  const items = productsByCategory
    .map((group) => {
      const index = selectedIndexByCategory.get(group.categorySlug);
      if (!Number.isInteger(index)) {
        return null;
      }
      const selected = group.products[index];
      return {
        id: selected.id,
        slug: selected.slug,
        name: selected.name,
        category: selected.category,
        categorySlug: selected.categorySlug,
        brand: selected.brand,
        price: selected.price,
        usedPrice: null,
        stockQuantity: selected.stockQuantity,
        score: selected.score,
        specCount: selected.specCount,
      };
    })
    .filter(Boolean);

  const categoryAnalysis = productsByCategory.map((group) => {
    const selected = group.selected;
    const selectedPrice = Number(selected?.price ?? 0);
    const budgetFitPercent =
      group.categoryBudget > 0
        ? Math.max(0, 100 - Math.abs(selectedPrice - group.categoryBudget) / group.categoryBudget * 100)
        : 0;

    return {
      category: group.category,
      categorySlug: group.categorySlug,
      targetBudget: Math.round(group.categoryBudget),
      selectedPrice,
      budgetFitPercent: Math.round(Math.min(100, budgetFitPercent)),
      selectedProductId: selected?.id ?? null,
      selectedProductName: selected?.name ?? null,
      selectedScore: selected?.score?.total ?? 0,
      productCount: group.products.length,
    };
  });

  totalPrice = items.reduce((sum, item) => sum + Number(item.price ?? 0), 0);

  const buildScore = buildConfigurationScore({
    items,
    categoryAnalysis,
    budget,
    expectedCount: REQUIRED_CATEGORY_SLUGS.length,
  });

  const strengths = deriveStrengths({
    items,
    categoryAnalysis,
    budget,
    totalPrice,
    buildScore,
  });

  const weaknesses = deriveWeaknesses({
    items,
    categoryAnalysis,
    budget,
    totalPrice,
    buildScore,
    requiredCategorySlugs: REQUIRED_CATEGORY_SLUGS,
  });

  const recommendations = deriveRecommendations({
    items,
    weaknesses,
    usage,
    requiredCategorySlugs: REQUIRED_CATEGORY_SLUGS,
  });

  const fullCatalog = productsByCategory.map((group) => ({
    category: group.category,
    categorySlug: group.categorySlug,
    targetBudget: Math.round(group.categoryBudget),
    products: group.products,
  }));

  return serializeData({
    items,
    summary:
      items.length > 0
        ? `Đã gợi ý ${items.length} linh kiện đầy đủ danh mục cho nhu cầu ${usage}. Tổng giá dự kiến ${new Intl.NumberFormat("vi-VN").format(totalPrice)} VND (không vượt ngân sách). Điểm tổng thể ${buildScore.overall}/100.`
        : "Chua tim thay linh kien phu hop voi bo loc hien tai. Thu bo trong bo loc hang hoac tang ngan sach.",
    usage,
    budget,
    totalPrice,
    buildScore,
    categoryAnalysis,
    strengths,
    weaknesses,
    recommendations,
    fullCatalog,
    staysWithinBudget: totalPrice <= budget,
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

function normalizePriceScore(price, minPrice, maxPrice) {
  if (!Number.isFinite(price) || maxPrice <= minPrice) {
    return 70;
  }

  const ratio = (price - minPrice) / (maxPrice - minPrice);
  return Math.max(40, Math.min(100, 40 + ratio * 60));
}

function scoreBudgetFit(price, targetBudget) {
  if (!Number.isFinite(price) || targetBudget <= 0) {
    return 45;
  }

  const delta = Math.abs(price - targetBudget) / targetBudget;
  return Math.max(15, Math.min(100, 100 - delta * 110));
}

function isPreferredBrand(product, preferredBrands) {
  if (!Array.isArray(preferredBrands) || preferredBrands.length === 0) {
    return false;
  }

  const tokens = [
    String(product?.name ?? "").toLowerCase(),
    String(product?.supplier?.name ?? "").toLowerCase(),
    String(extractBrand(product?.specifications) ?? "").toLowerCase(),
  ];

  return preferredBrands.some((brand) => {
    const needle = String(brand ?? "").trim().toLowerCase();
    if (!needle) {
      return false;
    }
    return tokens.some((token) => token.includes(needle));
  });
}

function buildTargetBudgetMap({ budget, ratioMap, requiredSlugs }) {
  const targets = {};
  const normalizedBudget = Math.max(0, Number(budget ?? 0));

  const coreSlugs = requiredSlugs.filter((slug) => CORE_CATEGORY_SLUGS.includes(slug));
  const peripheralSlugs = requiredSlugs.filter((slug) => !CORE_CATEGORY_SLUGS.includes(slug));

  let allocatedCoreRatio = 0;
  for (const slug of coreSlugs) {
    const ratio = Number(ratioMap?.[slug] ?? 0);
    targets[slug] = normalizedBudget * Math.max(0, ratio);
    allocatedCoreRatio += Math.max(0, ratio);
  }

  const usedCoreBudget = normalizedBudget * Math.min(1, allocatedCoreRatio);
  const remainBudget = Math.max(0, normalizedBudget - usedCoreBudget);
  const perPeripheralBudget =
    peripheralSlugs.length > 0 ? remainBudget / peripheralSlugs.length : 0;

  for (const slug of peripheralSlugs) {
    targets[slug] = perPeripheralBudget;
  }

  return targets;
}

function getCategoryUpgradePriority(usage, categorySlug) {
  const basePriority = {
    cpu: 1.2,
    vga: usage === "gaming" ? 1.4 : 1.1,
    mainboard: 1.0,
    ram: usage === "workstation" ? 1.3 : 1.05,
    ssd: 1.0,
    monitor: usage === "gaming" ? 1.15 : 1.0,
    mouse: 0.8,
    keyboard: 0.8,
    headset: 0.8,
    speaker: 0.75,
    microphone: 0.8,
    webcam: 0.8,
    hub: 0.7,
    cable: 0.65,
    stand: 0.7,
    pad: 0.65,
  };

  return Number(basePriority[categorySlug] ?? 0.75);
}

function buildConfigurationScore({ items, categoryAnalysis, budget, expectedCount }) {
  const targetCount = Math.max(1, Number(expectedCount ?? 1));
  const coverageScore = Math.round((items.length / targetCount) * 100);
  const totalPrice = items.reduce((sum, item) => sum + Number(item.price ?? 0), 0);

  const budgetScore =
    budget > 0
      ? Math.round(Math.max(0, Math.min(100, 100 - (Math.abs(totalPrice - budget) / budget) * 100)))
      : 0;

  const avgCategoryFit =
    categoryAnalysis.length > 0
      ? Math.round(
        categoryAnalysis.reduce((sum, row) => sum + Number(row.budgetFitPercent ?? 0), 0) /
        categoryAnalysis.length,
      )
      : 0;

  const avgProductScore =
    items.length > 0
      ? Math.round(
        items.reduce((sum, item) => sum + Number(item.score?.total ?? 0), 0) / items.length,
      )
      : 0;

  const compatibilityScore = Math.round(
    Math.min(100, Math.max(35, coverageScore * 0.55 + avgCategoryFit * 0.45)),
  );

  const overall = Math.round(
    coverageScore * 0.25 +
    budgetScore * 0.2 +
    avgCategoryFit * 0.18 +
    avgProductScore * 0.22 +
    compatibilityScore * 0.15,
  );

  return {
    overall,
    coverage: coverageScore,
    budget: budgetScore,
    balance: avgCategoryFit,
    productQuality: avgProductScore,
    compatibility: compatibilityScore,
  };
}

function deriveStrengths({ items, categoryAnalysis, budget, totalPrice, buildScore }) {
  const output = [];

  if (buildScore.coverage >= 90) {
    output.push("Danh sach linh kien co do phu cao, gan nhu day du cac nhom quan trong.");
  }

  if (budget > 0 && totalPrice <= budget) {
    output.push("Tong chi phi nam trong ngan sach dat ra.");
  }

  const strongCategories = categoryAnalysis
    .filter((row) => Number(row.selectedScore) >= 78)
    .map((row) => row.category?.toUpperCase())
    .slice(0, 4);
  if (strongCategories.length > 0) {
    output.push(`Cac nhom linh kien co diem tot: ${strongCategories.join(", ")}.`);
  }

  if (buildScore.compatibility >= 75) {
    output.push("Can bang cau hinh o muc on, phu hop cho su dung hang ngay.");
  }

  return output;
}

function deriveWeaknesses({ items, categoryAnalysis, budget, totalPrice, buildScore, requiredCategorySlugs }) {
  const output = [];

  const missing = requiredCategorySlugs.filter(
    (slug) => !items.some((item) => String(item.categorySlug) === slug),
  );
  if (missing.length > 0) {
    output.push(`Con thieu nhom linh kien: ${missing.join(", ")}.`);
  }

  if (budget > 0 && totalPrice > budget) {
    output.push(
      `Tong gia vuot ngan sach khoang ${new Intl.NumberFormat("vi-VN").format(totalPrice - budget)} VND.`,
    );
  }

  const weakCategories = categoryAnalysis
    .filter((row) => Number(row.selectedScore) < 65)
    .map((row) => row.category?.toUpperCase())
    .slice(0, 4);
  if (weakCategories.length > 0) {
    output.push(`Mot so nhom dang diem thap: ${weakCategories.join(", ")}.`);
  }

  if (buildScore.balance < 60) {
    output.push("Ty le phan bo ngan sach giua cac nhom chua that su can doi.");
  }

  return output;
}

function deriveRecommendations({ items, weaknesses, usage, requiredCategorySlugs }) {
  const output = [];

  if (requiredCategorySlugs.includes("cooling") && !items.some((item) => item.categorySlug === "cooling")) {
    output.push("Nen bo sung tan nhiet tot hon de giu nhiet do on dinh khi tai cao.");
  }

  if (requiredCategorySlugs.includes("psu") && !items.some((item) => item.categorySlug === "psu")) {
    output.push("Nen bo sung PSU chat luong de dam bao do on dinh he thong.");
  }

  if (usage === "gaming") {
    output.push("Neu choi game AAA, can uu tien VGA va RAM co xung/bo nho cao hon.");
  }

  if (usage === "workstation") {
    output.push("Cho workload nang, can nhac nang CPU va tang dung luong RAM.");
  }

  if (weaknesses.length === 0) {
    output.push("Cau hinh hien tai can bang tot, co the giu nguyen va theo doi gia de mua.");
  }

  return output;
}
