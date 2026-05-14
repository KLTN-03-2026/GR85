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
  // If customNeeds provided, detect usage from it; otherwise use provided usage
  let detectedUsage = input.usage;
  if (String(input.customNeeds ?? "").trim().length > 0) {
    const customNeeds = String(input.customNeeds).toLowerCase();
    if (/render|thiet ke|workstation|edit|dung do hoa|video|3d|design/.test(customNeeds)) {
      detectedUsage = "workstation";
    } else if (/game|gaming|fps|esport/.test(customNeeds)) {
      detectedUsage = "gaming";
    }
    console.log(`[AI Recommendation] Detected usage from customNeeds: ${detectedUsage}`, {
      customNeeds: input.customNeeds.substring(0, 100),
    });
  }
  
  const usage = normalizeUsage(detectedUsage);
  const budget = Number(input.budget);
  const targetCategories = Array.isArray(input.targetCategories) && input.targetCategories.length > 0
    ? input.targetCategories.map((item) => String(item).trim()).filter(Boolean)
    : null;
  const preferredBrands = Array.isArray(input.preferredBrands)
    ? input.preferredBrands.map((item) => String(item).trim()).filter(Boolean)
    : [];
  const pcComponentsOnly = input.pcComponentsOnly === true;

  const ratioMap = USAGE_BUDGET_RATIO[usage] || USAGE_BUDGET_RATIO.general;

  // Nếu pcComponentsOnly = true, chỉ lấy các linh kiện core, không lấy gear
  const defaultCategories = pcComponentsOnly ? CORE_CATEGORY_SLUGS : REQUIRED_CATEGORY_SLUGS;
  const categoriesToBuild = targetCategories || defaultCategories;

  console.log(`[AI Recommendation] Building recommendation:`, {
    usage,
    budget,
    pcComponentsOnly,
    categories: categoriesToBuild,
    timestamp: new Date().toISOString(),
  });

  const targetBudgetMap = buildTargetBudgetMap({
    budget,
    ratioMap,
    requiredSlugs: categoriesToBuild,
  });

  const productsByCategory = await Promise.all(
    categoriesToBuild.map(async (categorySlug) => {
      const categoryBudget = Number(targetBudgetMap[categorySlug] ?? 0);

      const candidates = await prisma.product.findMany({
        where: {
          category: {
            slug: categorySlug,
          },
          stockQuantity: {
            gt: 0,
          },
          status: "ACTIVE",
        },
        orderBy: [{ price: "asc" }, { createdAt: "desc" }],
        include: {
          category: true,
          supplier: true,
        },
        take: 80,
      });

      console.log(`[AI Recommendation] Found ${candidates.length} products in category: ${categorySlug}`);

      const priceList = candidates.map((item) => Number(item.price));
      const minPrice = priceList.length > 0 ? Math.min(...priceList) : 0;
      const maxPrice = priceList.length > 0 ? Math.max(...priceList) : 0;

      const products = candidates
        .map((item) => {
          const price = Number(item.price);
          const brand =
            item.supplier?.name || extractBrand(item.specifications) || "TechBuildAi";
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
    const index = selectedIndexByCategory.get(group.categorySlug);
    const selected = Number.isInteger(index) ? group.products[index] : null;
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
    expectedCount: categoriesToBuild.length,
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
    requiredCategorySlugs: categoriesToBuild,
  });

  const recommendations = deriveRecommendations({
    items,
    weaknesses,
    usage,
    requiredCategorySlugs: categoriesToBuild,
  });

  const fullCatalog = productsByCategory.map((group) => ({
    category: group.category,
    categorySlug: group.categorySlug,
    targetBudget: Math.round(group.categoryBudget),
    products: group.products,
  }));

  // Generate AI analysis summary if customNeeds provided
  let aiAnalysis = "";
  if (String(input.customNeeds ?? "").trim().length > 0 && items.length > 0) {
    try {
      const itemNames = items.map(i => `${i.category}: ${i.name}`).join(", ");
      const analysisPrompt = `Phân tích ngắn gọn (2-3 câu) tại sao cấu hình này phù hợp với nhu cầu: "${input.customNeeds}".\nCấu hình gồm: ${itemNames}.\nTổng giá: ${new Intl.NumberFormat("vi-VN").format(totalPrice)} VND.`;
      const analysis = await generateAiChatReply({ message: analysisPrompt, history: [] }).catch(() => null);
      aiAnalysis = analysis?.reply || "";
    } catch (err) {
      console.error("[AI Recommendation] Error generating AI analysis:", err);
    }
  }

  const result = serializeData({
    items,
    aiAnalysis,
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
    dataSource: "DATABASE",
    generatedAt: new Date().toISOString(),
  });

  console.log(`[AI Recommendation] Completed recommendation:`, {
    itemsCount: items.length,
    totalPrice,
    dataSource: "DATABASE",
    timestamp: new Date().toISOString(),
  });

  return result;
}

export async function generateAiChatReply(input, userId = null) {
  const message = String(input.message ?? "").trim();
  const history = Array.isArray(input.history) ? input.history : [];

  if (!message) {
    throw new Error("Message is required");
  }

  // Load settings from DB
  let settings = await prisma.aiSetting.findUnique({ where: { id: 1 } });
  if (!settings) {
    const defaultModel = process.env.GROQ_API_KEY
      ? (process.env.GROQ_MODEL || "llama-3.3-70b-versatile")
      : (process.env.AI_MODEL || "gpt-4o-mini");

    settings = {
      isEnabled: true,
      model: defaultModel,
      temperature: 0.6,
      maxToken: 500,
      systemPrompt: "Bạn là chuyên gia tư vấn build PC. Hãy trả lời NGẮN GỌN, TRỌNG TÂM và DỄ HIỂU bằng Tiếng Việt. Tập trung vào ý chính và lựa chọn tốt nhất cho người dùng. Tránh giải thích dông dài kỹ thuật không cần thiết. Thêm 🛒 ở cuối nếu có gợi ý sản phẩm."
    };
  }

  if (!settings.isEnabled) {
    throw new Error("Hệ thống trợ lý AI hiện đang được tắt bởi quản trị viên.");
  }

  const apiKey = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("API Key bị thiếu trong file .env (cần thêm GROQ_API_KEY hoặc OPENAI_API_KEY)");
  }

  const systemMessage = {
    role: "system",
    content: settings.systemPrompt
  };

  const productContext = await buildProductContextForMessage(message);
  const contextualUserMessage = productContext.contextText
    ? `${productContext.contextText}\n\n[Yêu cầu của người dùng]\n${message}`
    : message;

  const contextInstructionMessage = productContext.contextText
    ? {
      role: "system",
      content: [
        "Bạn phải dùng dữ liệu ngữ cảnh từ Database để tư vấn sản phẩm.",
        "Khi có danh sách sản phẩm liên quan, hãy so sánh 1-2 lựa chọn tốt nhất, nêu lý do cụ thể, và nhắc tên sản phẩm chính xác.",
        "Nếu câu trả lời đề cập đến sản phẩm, hãy ưu tiên phản hồi ngắn gọn, có thông tin sản phẩm, danh mục, giá và link nếu có.",
      ].join(" "),
    }
    : null;

  const messages = [
    systemMessage,
    ...(contextInstructionMessage ? [contextInstructionMessage] : []),
    ...history.map((msg) => ({
      role: msg.role === "user" ? "user" : "assistant",
      content: String(msg.content ?? ""),
    })),
    { role: "user", content: contextualUserMessage },
  ];

  try {
    const isGroq = Boolean(process.env.GROQ_API_KEY);
    const endpoint = isGroq
      ? "https://api.groq.com/openai/v1/chat/completions"
      : "https://api.openai.com/v1/chat/completions";

    const configuredModel = settings.model || process.env.AI_MODEL;
    const openAiDefaultModel = process.env.AI_MODEL || "gpt-4o-mini";
    const groqDefaultModel = process.env.GROQ_MODEL || "llama-3.3-70b-versatile";

    let modelName = configuredModel || (isGroq ? groqDefaultModel : openAiDefaultModel);

    // Prevent provider mismatch (for example: gpt-* model sent to Groq endpoint).
    if (isGroq && /^gpt-/i.test(String(modelName))) {
      modelName = groqDefaultModel;
    }

    if (!isGroq && /llama|mixtral|gemma/i.test(String(modelName))) {
      modelName = openAiDefaultModel;
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: messages,
        max_tokens: settings.maxToken || 800,
        temperature: settings.temperature !== undefined ? settings.temperature : 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || "";
      if (response.status === 429 || errorMessage.toLowerCase().includes("quota")) {
        throw new Error("Hệ thống AI hiện đã hết lượt sử dụng (quota exceeded) hoặc quá tải. Vui lòng kiểm tra lại API key.");
      }
      throw new Error(errorMessage || "Lỗi kết nối tới AI provider");
    }

    const data = await response.json();
    let reply = data.choices?.[0]?.message?.content || "Không thể trả lời.";

    // Giữ định dạng sạch sẽ & Ngắn gọn
    reply = reply.trim();
    if (reply.length > 300) {
      let cutPoint = reply.lastIndexOf(".", 300) || reply.lastIndexOf(" ", 300) || 300;
      reply = reply.substring(0, cutPoint) + "... (Hỏi thêm nếu cần chi tiết)";
    }

    // Thêm icon nếu cần
    if (reply.length > 0 && !reply.includes("🛒")) {
      reply = reply + " 🛒";
    }

    // Calculate token usage and cost
    const promptTokens = data.usage?.prompt_tokens || 0;
    const completionTokens = data.usage?.completion_tokens || 0;
    const totalTokens = data.usage?.total_tokens || 0;

    // Cost estimation based on typical gpt-4o-mini rates
    const inputCostPer1K = isGroq ? 0.0005 : 0.00015;
    const outputCostPer1K = isGroq ? 0.0008 : 0.0006;
    const cost = (promptTokens / 1000) * inputCostPer1K + (completionTokens / 1000) * outputCostPer1K;

    // Extract mentioned product names from the reply
    const mentionedProducts = await extractAndFindMentionedProducts(reply);

    // Save log asynchronously
    prisma.aiRequestLog.create({
      data: {
        userId: userId,
        endpoint: "chat",
        prompt: message,
        response: reply,
        modelUsed: modelName,
        promptTokens,
        completionTokens,
        totalTokens,
        cost,
      }
    }).catch(err => console.error("Error logging AI request", err));

    return serializeData({
      reply,
      mentionedProducts: mentionedProducts || [],
      relatedProducts: productContext.relatedProducts || [],
    });
  } catch (error) {
    if (error.message.includes("quota exceeded")) {
      throw error;
    }
    throw new Error(`Lỗi kết nối AI: ${error.message}`);
  }
}

// Helper function to extract and find product mentions
async function extractAndFindMentionedProducts(reply) {
  try {
    // Common product name patterns - extract words that might be product names
    // Look for words after common keywords like "chip", "CPU", "GPU", "SSD", "RAM", etc.
    const productKeywords = /(Core i\d|Ryzen \d|RTX \d|RX \d|Samsung|Kingston|Corsair|ASUS|Gigabyte|MSI)/gi;
    const matches = reply.match(productKeywords);

    if (!matches || matches.length === 0) {
      return [];
    }

    // Get unique product names
    const uniqueNames = [...new Set(matches)];

    // Search for these products in database
    const products = await Promise.all(
      uniqueNames.map(async (name) => {
        try {
          const product = await prisma.product.findFirst({
            where: {
              OR: [
                { name: { contains: name, mode: "insensitive" } },
                { slug: { contains: name.toLowerCase().replace(/\s+/g, "-"), mode: "insensitive" } },
              ],
              status: "ACTIVE",
              stockQuantity: { gt: 0 },
            },
            select: {
              id: true,
              name: true,
              slug: true,
              price: true,
              salePrice: true,
              brand: true,
              category: { select: { name: true, slug: true } },
            },
          });

          return product ? {
            ...product,
            productUrl: `/components/${product.slug}`,
            displayPrice: product.salePrice || product.price,
          } : null;
        } catch (err) {
          console.error(`Error finding product "${name}":`, err);
          return null;
        }
      })
    );

    // Filter out null values and return
    return products.filter(Boolean).slice(0, 3); // Limit to 3 products
  } catch (error) {
    console.error("Error extracting mentioned products:", error);
    return [];
  }
}

async function buildProductContextForMessage(message) {
  const normalizedMessage = normalizeSearchText(message);
  if (!normalizedMessage) {
    return { contextText: "", relatedProducts: [] };
  }

  const keywords = extractProductKeywords(normalizedMessage);
  const fallbackTerms = keywords.length > 0
    ? keywords
    : normalizedMessage.split(" ").filter((word) => word.length >= 4).slice(0, 5);
  const searchTerms = [...new Set(fallbackTerms)].slice(0, 5);

  if (searchTerms.length === 0) {
    return { contextText: "", relatedProducts: [] };
  }

  const categorySlugs = [...new Set(searchTerms.map((term) => mapTermToCategorySlug(term)).filter(Boolean))];
  const categories = categorySlugs.length > 0
    ? await prisma.category.findMany({
      where: {
        slug: { in: categorySlugs },
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    })
    : [];
  const categoryIds = categories.map((category) => category.id);

  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      stockQuantity: { gt: 0 },
      OR: [
        ...searchTerms.map((term) => ({ name: { contains: term } })),
        ...searchTerms.map((term) => ({ slug: { contains: term.replace(/\s+/g, "-") } })),
        ...(categoryIds.length > 0 ? [{ categoryId: { in: categoryIds } }] : []),
      ],
    },
    include: {
      category: true,
      supplier: true,
    },
    orderBy: [
      { salePrice: "asc" },
      { price: "asc" },
      { createdAt: "desc" },
    ],
    take: 5,
  });

  const relatedProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    slug: product.slug,
    category: product.category?.name ?? null,
    categorySlug: product.category?.slug ?? null,
    price: Number(product.salePrice ?? product.price ?? 0),
    brand: product.supplier?.name || extractBrand(product.specifications) || null,
    productUrl: `/components/${product.slug}`,
  }));

  if (relatedProducts.length === 0) {
    return { contextText: "", relatedProducts: [] };
  }

  const productLines = relatedProducts.map((product, index) => {
    const purpose = buildProductPurpose(product.categorySlug, product.category);
    const features = buildProductFeatureSummary(product);
    return `${index + 1}. Sản phẩm ${String.fromCharCode(65 + index)}: {Tên: "${product.name}", Danh mục: "${product.category ?? ""}", Mục đích phù hợp: "${purpose}", Đặc điểm: "${features}", Giá: "${new Intl.NumberFormat("vi-VN").format(product.price)} VND", Link: "${product.productUrl}"}`;
  });

  const contextText = [
    "[Dữ liệu ngữ cảnh từ Database hiện tại]",
    "Danh sách các sản phẩm có thể liên quan:",
    ...productLines,
  ].join("\n");

  return { contextText, relatedProducts };
}

function mapTermToCategorySlug(term) {
  const normalized = String(term ?? "").trim().toLowerCase();
  const map = {
    cpu: "cpu",
    processor: "cpu",
    ryzen: "cpu",
    intel: "cpu",
    vga: "vga",
    gpu: "vga",
    "card do hoa": "vga",
    "card đồ họa": "vga",
    ram: "ram",
    memory: "ram",
    ssd: "ssd",
    hdd: "hdd",
    storage: "ssd",
    "o cung": "ssd",
    "ổ cứng": "ssd",
    mainboard: "mainboard",
    motherboard: "mainboard",
    main: "mainboard",
    psu: "psu",
    nguon: "psu",
    "nguồn": "psu",
    case: "case",
    vo: "case",
    "vỏ": "case",
    cooling: "cooling",
    "tan nhiet": "cooling",
    "tản nhiệt": "cooling",
    monitor: "monitor",
    "man hinh": "monitor",
    "màn hình": "monitor",
    mouse: "mouse",
    chuot: "mouse",
    "chuột": "mouse",
    keyboard: "keyboard",
    "ban phim": "keyboard",
    "bàn phím": "keyboard",
    headset: "headset",
    "tai nghe": "headset",
  };

  return map[normalized] || null;
}

function normalizeSearchText(input) {
  return String(input ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractProductKeywords(message) {
  const keywords = [];
  const patterns = [
    /\b(cpu|processor|ryzen|core i\d|intel)\b/g,
    /\b(vga|gpu|rtx|rx|card do hoa|card đồ họa)\b/g,
    /\b(ram|memory|ddr[345])\b/g,
    /\b(ssd|hdd|storage|o cung|ổ cứng)\b/g,
    /\b(mainboard|motherboard|main)\b/g,
    /\b(psu|nguon|nguồn)\b/g,
    /\b(case|vo|vỏ)\b/g,
    /\b(cooling|tan nhiet|tản nhiệt|fan)\b/g,
    /\b(monitor|man hinh|màn hình)\b/g,
    /\b(mouse|chuot|chuột|keyboard|ban phim|bàn phím|headset|tai nghe)\b/g,
  ];

  for (const pattern of patterns) {
    const matches = message.match(pattern);
    if (matches) {
      keywords.push(...matches);
    }
  }

  return [...new Set(keywords.map((item) => item.trim()).filter(Boolean))];
}

function buildProductPurpose(categorySlug, categoryName) {
  const normalized = String(categorySlug ?? categoryName ?? "").toLowerCase();

  if (normalized.includes("cpu")) return "Xử lý tác vụ chính, gaming, làm việc đa nhiệm";
  if (normalized.includes("vga") || normalized.includes("gpu")) return "Tăng hiệu năng đồ họa, chơi game, render";
  if (normalized.includes("ram")) return "Hỗ trợ đa nhiệm và tăng độ mượt hệ thống";
  if (normalized.includes("ssd") || normalized.includes("hdd") || normalized.includes("storage")) return "Lưu trữ dữ liệu, tăng tốc khởi động và tải ứng dụng";
  if (normalized.includes("mainboard") || normalized.includes("motherboard")) return "Kết nối và tương thích toàn hệ thống";
  if (normalized.includes("psu") || normalized.includes("nguon") || normalized.includes("nguồn")) return "Cung cấp điện ổn định cho toàn bộ cấu hình";
  if (normalized.includes("case")) return "Bảo vệ linh kiện, tối ưu không gian và luồng gió";
  if (normalized.includes("cooling")) return "Giữ nhiệt độ ổn định, tăng độ bền và hiệu năng";
  if (normalized.includes("monitor")) return "Hiển thị hình ảnh cho gaming, làm việc và giải trí";
  if (normalized.includes("mouse")) return "Điều khiển chính xác khi thao tác và chơi game";
  if (normalized.includes("keyboard")) return "Nhập liệu, thao tác nhanh và hỗ trợ công việc";
  if (normalized.includes("headset")) return "Nghe rõ âm thanh, gọi họp, chơi game, giải trí";
  return `Phù hợp với nhu cầu sử dụng liên quan đến ${categoryName || categorySlug || "sản phẩm"}`;
}

function buildProductFeatureSummary(product) {
  const features = [];
  if (product.brand) {
    features.push(`Hãng ${product.brand}`);
  }
  if (product.category) {
    features.push(`Danh mục ${product.category}`);
  }
  if (Number.isFinite(product.price)) {
    features.push(`Giá hiện tại ${new Intl.NumberFormat("vi-VN").format(product.price)} VND`);
  }
  return features.join(", ");
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

  let totalCoreRatio = 0;
  for (const slug of coreSlugs) {
    totalCoreRatio += Math.max(0, Number(ratioMap?.[slug] ?? 0));
  }

  // Allocate 15% per peripheral, up to max 50%
  const perPeripheralRatio = peripheralSlugs.length > 0 ? 0.15 : 0;
  const peripheralTotalRatio = Math.min(0.5, perPeripheralRatio * peripheralSlugs.length);

  const coreTotalBudget = coreSlugs.length > 0 ? normalizedBudget * (1 - peripheralTotalRatio) : 0;
  const peripheralTotalBudget = coreSlugs.length > 0 ? normalizedBudget * peripheralTotalRatio : normalizedBudget;

  for (const slug of coreSlugs) {
    const ratio = Math.max(0, Number(ratioMap?.[slug] ?? 0));
    targets[slug] = totalCoreRatio > 0 ? (ratio / totalCoreRatio) * coreTotalBudget : 0;
  }

  const perPeripheralBudget = peripheralSlugs.length > 0 ? peripheralTotalBudget / peripheralSlugs.length : 0;
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
