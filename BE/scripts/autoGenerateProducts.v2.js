#!/usr/bin/env node
/**
 * AUTO GENERATE PRODUCTS V2
 *
 * Mục tiêu:
 * - Tạo sản phẩm AI theo schema hiện có
 * - Mỗi category tạo 7-8 sản phẩm real-looking
 * - Mỗi sản phẩm có 3-5 ảnh unique, tải local uploads/products/
 * - Không trùng URL/hash/filename giữa các sản phẩm
 * - Không đụng schema hay API hiện tại
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

const UPLOADS_DIR = path.resolve(__dirname, "..", "uploads", "products");
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODELS = [
  process.env.GROQ_MODEL,
  "llama-3.3-70b-versatile",
  "llama-3.1-405b-reasoning",
].filter(Boolean);

const CATEGORY_LIMIT = Number(process.env.GENERATOR_CATEGORY_LIMIT || 0);
const PRODUCTS_PER_CATEGORY = clampInt(
  Number(process.env.GENERATOR_PRODUCTS_PER_CATEGORY || 8),
  7,
  10,
);
const MIN_IMAGES_PER_PRODUCT = clampInt(
  Number(process.env.GENERATOR_MIN_IMAGES_PER_PRODUCT || 3),
  3,
  5,
);
const MAX_IMAGES_PER_PRODUCT = clampInt(
  Number(process.env.GENERATOR_MAX_IMAGES_PER_PRODUCT || 5),
  MIN_IMAGES_PER_PRODUCT,
  5,
);
const MAX_PRODUCT_RETRIES = clampInt(
  Number(process.env.GENERATOR_PRODUCT_RETRIES || 6),
  1,
  12,
);
const MAX_IMAGE_SEARCH_ROUNDS = clampInt(
  Number(process.env.GENERATOR_IMAGE_SEARCH_ROUNDS || 5),
  1,
  8,
);
const REQUEST_TIMEOUT = Number(process.env.GENERATOR_REQUEST_TIMEOUT || 30000);
const PEXELS_PER_PAGE = clampInt(
  Number(process.env.GENERATOR_PEXELS_PER_PAGE || 80),
  20,
  120,
);
const IMAGE_WIDTH_MIN = Number(process.env.GENERATOR_IMAGE_MIN_WIDTH || 500);
const IMAGE_HEIGHT_MIN = Number(process.env.GENERATOR_IMAGE_MIN_HEIGHT || 500);
const RATE_LIMIT_MS = Number(process.env.GENERATOR_RATE_LIMIT_MS || 350);
const CATEGORY_GAP_MS = Number(process.env.GENERATOR_CATEGORY_GAP_MS || 1500);

const logger = {
  info: (prefix, message) => console.log(`[INFO] [${prefix}] ${message}`),
  ok: (prefix, message) => console.log(`[OK] [${prefix}] ${message}`),
  warn: (prefix, message) => console.log(`[WARN] [${prefix}] ${message}`),
  skip: (prefix, message) => console.log(`[SKIP] [${prefix}] ${message}`),
  retry: (prefix, message) => console.log(`[RETRY] [${prefix}] ${message}`),
  error: (prefix, message) => console.error(`[ERROR] [${prefix}] ${message}`),
};

const CATEGORY_PROFILES = {
  cable: {
    categoryLabel: "Cable",
    imageSearch: "computer cable product photo ecommerce",
    nameHints: [
      "USB-C 100W braided charging cable",
      "HDMI 2.1 ultra high speed cable",
      "DisplayPort 1.4 premium cable",
      "USB 3.2 Gen 2 data cable",
      "Lightning braided fast charge cable",
      "Thunderbolt 4 cable",
    ],
    brands: ["Anker", "Baseus", "UGREEN", "Belkin", "Aukey", "Satechi"],
    specKeys: ["Length", "Connector", "Power", "Material", "Compatibility"],
  },
  case: {
    categoryLabel: "Case",
    imageSearch: "computer case product photo ecommerce",
    nameHints: [
      "Lian Li O11 Dynamic Evo",
      "NZXT H6 Flow",
      "Corsair 4000D Airflow",
      "Fractal Design North",
      "Montech Sky Two",
      "DeepCool CH560",
    ],
    brands: ["Lian Li", "NZXT", "Corsair", "Fractal", "Montech", "DeepCool"],
    specKeys: ["Form Factor", "Motherboard Support", "Front Panel", "Glass Side", "Fan Support"],
  },
  cooling: {
    categoryLabel: "Cooling",
    imageSearch: "cpu cooler product photo ecommerce",
    nameHints: [
      "Noctua NH-D15 chromax.black",
      "DeepCool AK620 digital",
      "Arctic Liquid Freezer III 360",
      "Thermalright Peerless Assassin 120 SE",
      "Corsair iCUE H150i Elite",
    ],
    brands: ["Noctua", "DeepCool", "Arctic", "Thermalright", "Corsair"],
    specKeys: ["Type", "Fan Size", "RPM", "Noise", "Socket Support"],
  },
  cpu: {
    categoryLabel: "CPU",
    imageSearch: "processor product photo ecommerce",
    nameHints: [
      "Intel Core i5-14600K",
      "Intel Core i7-14700K",
      "AMD Ryzen 5 7600X",
      "AMD Ryzen 7 7800X3D",
      "Intel Core Ultra 7 265K",
      "AMD Ryzen 9 7950X3D",
    ],
    brands: ["Intel", "AMD"],
    specKeys: ["Cores", "Threads", "Base Clock", "Boost Clock", "Socket"],
  },
  hdd: {
    categoryLabel: "HDD",
    imageSearch: "hard drive product photo ecommerce",
    nameHints: [
      "WD Blue 1TB HDD",
      "Seagate Barracuda 2TB",
      "Toshiba P300 4TB",
      "WD Red Plus 6TB",
      "Seagate IronWolf 4TB",
    ],
    brands: ["WD", "Seagate", "Toshiba"],
    specKeys: ["Capacity", "RPM", "Cache", "Interface", "Use Case"],
  },
  headset: {
    categoryLabel: "Headset",
    imageSearch: "gaming headset product photo ecommerce",
    nameHints: [
      "HyperX Cloud III Wireless",
      "Razer BlackShark V2 Pro",
      "SteelSeries Arctis Nova 7",
      "Logitech G Pro X 2 Lightspeed",
      "Corsair HS80 Max",
    ],
    brands: ["HyperX", "Razer", "SteelSeries", "Logitech", "Corsair"],
    specKeys: ["Driver", "Microphone", "Connectivity", "Battery", "Weight"],
  },
  hub: {
    categoryLabel: "Hub",
    imageSearch: "usb hub product photo ecommerce",
    nameHints: [
      "UGREEN 7-in-1 USB-C Hub",
      "Anker PowerExpand 8-in-1",
      "Satechi Slim Multi-Port Adapter",
      "Baseus Metal Gleam Hub",
      "Lention 6-in-1 USB-C Hub",
    ],
    brands: ["UGREEN", "Anker", "Satechi", "Baseus", "Lention"],
    specKeys: ["Ports", "Video Output", "Power Delivery", "Material", "Compatibility"],
  },
  keyboard: {
    categoryLabel: "Keyboard",
    imageSearch: "mechanical keyboard product photo ecommerce",
    nameHints: [
      "Keychron K8 Pro",
      "Akko 5075S VIA",
      "Wooting 60HE",
      "Razer BlackWidow V4",
      "Leopold FC750R",
      "MonsGeek M1 W",
    ],
    brands: ["Keychron", "Akko", "Wooting", "Razer", "Leopold", "MonsGeek"],
    specKeys: ["Layout", "Switch", "Keycaps", "Connectivity", "Hot Swap"],
  },
  mainboard: {
    categoryLabel: "Mainboard",
    imageSearch: "motherboard product photo ecommerce",
    nameHints: [
      "ASUS TUF Gaming B760-Plus WiFi",
      "MSI MPG B650 Tomahawk WiFi",
      "Gigabyte B760 AORUS Elite AX",
      "ASRock X670E Steel Legend",
      "MSI PRO Z790-P WiFi",
    ],
    brands: ["ASUS", "MSI", "Gigabyte", "ASRock"],
    specKeys: ["Chipset", "Socket", "Memory Support", "M.2 Slots", "WiFi"],
  },
  microphone: {
    categoryLabel: "Microphone",
    imageSearch: "microphone product photo ecommerce",
    nameHints: [
      "Elgato Wave:3",
      "Rode NT-USB+",
      "Shure MV7",
      "Blue Yeti X",
      "Audio-Technica AT2020USB-X",
    ],
    brands: ["Elgato", "Rode", "Shure", "Blue", "Audio-Technica"],
    specKeys: ["Polar Pattern", "Connection", "Sample Rate", "Mount", "Use Case"],
  },
  monitor: {
    categoryLabel: "Monitor",
    imageSearch: "computer monitor product photo ecommerce",
    nameHints: [
      "LG UltraGear 27GR75Q",
      "ASUS ROG Swift PG27AQDM",
      "Dell G2724D",
      "BenQ MOBIUZ EX2710Q",
      "AOC Q27G3XMN",
    ],
    brands: ["LG", "ASUS", "Dell", "BenQ", "AOC"],
    specKeys: ["Size", "Panel", "Refresh Rate", "Resolution", "Response Time"],
  },
  mouse: {
    categoryLabel: "Mouse",
    imageSearch: "gaming mouse product photo ecommerce",
    nameHints: [
      "Logitech G Pro X Superlight 2",
      "Razer DeathAdder V3 Pro",
      "Pulsar X2V2",
      "Lamzu Atlantis Mini",
      "SteelSeries Aerox 5 Wireless",
      "Zowie EC2-CW",
    ],
    brands: ["Logitech", "Razer", "Pulsar", "Lamzu", "SteelSeries", "Zowie"],
    specKeys: ["Sensor", "DPI", "Connection", "Weight", "Battery"],
  },
  pad: {
    categoryLabel: "Pad",
    imageSearch: "mouse pad product photo ecommerce",
    nameHints: [
      "SteelSeries QcK Heavy",
      "Logitech G640",
      "Razer Gigantus V2",
      "Artisan Zero Soft",
      "Corsair MM350 Pro",
    ],
    brands: ["SteelSeries", "Logitech", "Razer", "Artisan", "Corsair"],
    specKeys: ["Size", "Surface", "Base", "Thickness", "Use Case"],
  },
  psu: {
    categoryLabel: "PSU",
    imageSearch: "power supply product photo ecommerce",
    nameHints: [
      "Corsair RM850e",
      "Seasonic Focus GX-850",
      "MSI MAG A850GL",
      "be quiet! Pure Power 12 M",
      "ASUS TUF Gaming 750G",
    ],
    brands: ["Corsair", "Seasonic", "MSI", "be quiet!", "ASUS"],
    specKeys: ["Wattage", "Efficiency", "Modular", "Fan Size", "Certification"],
  },
  ram: {
    categoryLabel: "RAM",
    imageSearch: "memory ram product photo ecommerce",
    nameHints: [
      "Corsair Vengeance DDR5 6000",
      "G.SKILL Trident Z5 Neo",
      "Kingston Fury Beast DDR5",
      "TEAMGROUP T-Force Delta RGB",
      "Crucial Pro DDR5",
    ],
    brands: ["Corsair", "G.SKILL", "Kingston", "TEAMGROUP", "Crucial"],
    specKeys: ["Capacity", "Speed", "Latency", "Kit", "Voltage"],
  },
  speaker: {
    categoryLabel: "Speaker",
    imageSearch: "desktop speaker product photo ecommerce",
    nameHints: [
      "Edifier R1280DBs",
      "Creative Pebble Pro",
      "JBL Quantum Duo",
      "Bose Companion 2",
      "Logitech Z407",
    ],
    brands: ["Edifier", "Creative", "JBL", "Bose", "Logitech"],
    specKeys: ["Power", "Connectivity", "Channels", "Subwoofer", "Use Case"],
  },
  ssd: {
    categoryLabel: "SSD",
    imageSearch: "nvme ssd product photo ecommerce",
    nameHints: [
      "Samsung 990 PRO 1TB",
      "WD Black SN850X 2TB",
      "Crucial T500 1TB",
      "Kingston KC3000 2TB",
      "Seagate FireCuda 530 1TB",
    ],
    brands: ["Samsung", "WD Black", "Crucial", "Kingston", "Seagate"],
    specKeys: ["Capacity", "Form Factor", "Interface", "Read Speed", "Write Speed"],
  },
  stand: {
    categoryLabel: "Stand",
    imageSearch: "monitor stand product photo ecommerce",
    nameHints: [
      "Dual Monitor Stand Pro",
      "Aluminum Laptop Stand",
      "Adjustable Monitor Riser",
      "Ergonomic Desk Stand",
      "Foldable Tablet Stand",
    ],
    brands: ["Generic", "Satechi", "UGREEN", "Nulaxy", "Lamicall"],
    specKeys: ["Material", "Adjustability", "Load Capacity", "Compatibility", "Color"],
  },
  vga: {
    categoryLabel: "VGA",
    imageSearch: "graphics card product photo ecommerce",
    nameHints: [
      "ASUS TUF Gaming RTX 4070 SUPER",
      "MSI Ventus RTX 4060 Ti",
      "Gigabyte AORUS RTX 4080 SUPER",
      "Sapphire Pulse RX 7800 XT",
      "ZOTAC Trinity RTX 4070 Ti SUPER",
    ],
    brands: ["ASUS", "MSI", "Gigabyte", "Sapphire", "ZOTAC"],
    specKeys: ["Memory", "Cooling", "Boost Clock", "Power", "Outputs"],
  },
  webcam: {
    categoryLabel: "Webcam",
    imageSearch: "webcam product photo ecommerce",
    nameHints: [
      "Logitech Brio 500",
      "Elgato Facecam Pro",
      "Razer Kiyo Pro Ultra",
      "AverMedia PW513",
      "Dell UltraSharp Webcam",
    ],
    brands: ["Logitech", "Elgato", "Razer", "AverMedia", "Dell"],
    specKeys: ["Resolution", "Frame Rate", "Focus", "Mic", "Mount"],
  },
};

function clampInt(value, min, max) {
  if (!Number.isFinite(value)) return max;
  return Math.min(max, Math.max(min, Math.trunc(value)));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeText(text) {
  return String(text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

function slugify(text) {
  return normalizeText(text)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function uniqueArray(values) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()))];
}

function hashBuffer(buffer) {
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

function sanitizeJsonText(text) {
  return String(text || "")
    .replace(/```json\s*/gi, "")
    .replace(/```/g, "")
    .trim();
}

function stripHtml(text) {
  return String(text || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildCategoryProfile(category) {
  const normalizedSlug = normalizeText(category?.slug || category?.name || "general");
  return CATEGORY_PROFILES[normalizedSlug] || {
    categoryLabel: category?.name || "General",
    imageSearch: `${category?.name || "computer hardware"} product photo ecommerce`,
    nameHints: [],
    brands: ["Generic", "PC Parts Hub", "TechBuiltAI"],
    specKeys: ["Brand", "Model", "Color", "Material", "Compatibility"],
  };
}

function buildAiPrompt(category, count, existingNames, profile) {
  const negativeExamples = existingNames.slice(0, 24).join(" | ");
  const hintLines = profile.nameHints.length
    ? profile.nameHints.map((item) => `- ${item}`).join("\n")
    : "- Use real market-style names for this category";

  const brandHint = profile.brands.join(", ");
  const specHint = profile.specKeys.join(", ");

  return `
Bạn là merchandiser cho website bán linh kiện/máy tính ở Việt Nam.
Tạo đúng ${count} sản phẩm cho category "${category.name}".

Yêu cầu bắt buộc:
- Tên sản phẩm phải thật, có thể bán trên ecommerce, không generic kiểu "Mouse 1".
- Không được trùng với danh sách tên cấm.
- Không được dùng tên quá chung chung.
- Mỗi sản phẩm phải có mô tả khác nhau hoàn toàn.
- Specs phải hợp lý theo category.
- Search keywords phải ưu tiên full product name + ecommerce/product photo.
- fullDescription phải là HTML sạch, gồm 2-4 đoạn, có thể có <ul><li>.
- Không dùng markdown code block.
- Giá phải hợp lý theo sản phẩm, đơn vị VND.
- Chỉ trả về JSON array hợp lệ.

Gợi ý thương hiệu cho category này:
${brandHint}

Gợi ý tên thật:
${hintLines}

Gợi ý specs cần có:
${specHint}

Danh sách tên cấm (đã tồn tại hoặc đã dùng):
${negativeExamples || "(trống)"}

Output format chính xác:
[
  {
    "name": "Logitech G Pro X Superlight 2",
    "brand": "Logitech",
    "price": 2990000,
    "warrantyMonths": 24,
    "shortDescription": "Mô tả ngắn",
    "fullDescription": "<p>...</p><p>...</p>",
    "inTheBox": "Sản phẩm, cáp sạc, tài liệu",
    "searchKeywords": "logitech g pro x superlight 2 gaming mouse ecommerce product photo",
    "specifications": {
      "Model": "...",
      "Brand": "...",
      "Color": "...",
      "Material": "...",
      "Compatibility": "...",
      "Key Features": ["...", "..."]
    }
  }
]
`;
}

function extractProductTypeName(categoryName) {
  return String(categoryName || "product").trim();
}

function buildImageQueries(product, profile, categoryName) {
  const base = normalizeText(product.name);
  const brand = normalizeText(product.brand || "");
  const categoryText = normalizeText(profile.imageSearch || categoryName || "computer hardware");
  const searchKeywords = normalizeText(product.searchKeywords || "");

  return uniqueArray([
    `${product.name} ecommerce product photo`,
    `${product.name} product photo`,
    `${product.name} ${categoryText} ecommerce`,
    `${brand || base} ${categoryText} product photo`,
    `${searchKeywords || base} ecommerce product`,
    `${categoryText} product isolated ecommerce`,
  ]);
}

function cleanPositiveText(text) {
  return normalizeText(text)
    .replace(/\b(wallpaper|banner|background|meme|collage|poster|stock|mockup|template|instagram|facebook)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function isPhotoEligible(photo, queryTerms) {
  if (!photo || !photo.src) return false;
  const width = Number(photo.width || 0);
  const height = Number(photo.height || 0);
  if (width < IMAGE_WIDTH_MIN || height < IMAGE_HEIGHT_MIN) return false;

  const alt = cleanPositiveText(photo.alt || photo.description || "");
  if (!alt) return true;

  const bannedWords = ["banner", "background", "wallpaper", "collage", "poster", "meme", "group", "multiple", "people", "desk setup", "workspace"];
  if (bannedWords.some((word) => alt.includes(word))) return false;

  const queryTokens = queryTerms
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3)
    .slice(0, 8);

  if (queryTokens.length === 0) return true;
  const altTokens = new Set(alt.split(/\s+/));
  const matched = queryTokens.filter((token) => altTokens.has(token)).length;
  return matched >= 1 || alt.length > 0;
}

function scorePhoto(photo, query) {
  const width = Number(photo.width || 0);
  const height = Number(photo.height || 0);
  const areaScore = width * height;
  const alt = cleanPositiveText(photo.alt || "");
  const queryTokens = normalizeText(query).split(/\s+/).filter(Boolean);
  let matchScore = 0;
  for (const token of queryTokens) {
    if (token.length < 3) continue;
    if (alt.includes(token)) matchScore += 1;
  }
  return areaScore + matchScore * 2500000;
}

async function fetchJsonWithRetry(url, options, label, fallbackModels = []) {
  const attempts = fallbackModels.length > 0 ? fallbackModels : [null];
  let lastError = null;

  for (const model of attempts) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
      const body = JSON.parse(options.body);
      if (model) {
        body.model = model;
      }

      const response = await fetch(url, {
        ...options,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText.slice(0, 300)}`);
      }

      return await response.json();
    } catch (error) {
      lastError = error;
      logger.retry(label, `${model ? `model=${model} ` : ""}${error.message}`);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw lastError || new Error(`${label} failed`);
}

async function callGroqForProducts(category, count, existingNames) {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is not configured");
  }

  const profile = buildCategoryProfile(category);
  const prompt = buildAiPrompt(category, count, existingNames, profile);

  const payload = {
    model: GROQ_MODELS[0],
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 3500,
  };

  const response = await fetchJsonWithRetry(
    GROQ_ENDPOINT,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    },
    `GROQ ${category.name}`,
    GROQ_MODELS,
  );
  const rawContent = String(response?.choices?.[0]?.message?.content || "[]");
  // Try to sanitize and robustly parse JSON array returned by the model.
  const content = sanitizeJsonText(rawContent);
  let parsed = null;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    // Attempt to recover JSON array substring if possible
    const m = content.match(/\[\s*\{[\s\S]*\}\s*\]/m);
    if (m) {
      try {
        parsed = JSON.parse(m[0]);
      } catch (err) {
        throw new Error(`Groq returned unparsable JSON (recovery failed): ${err.message}`);
      }
    } else {
      throw new Error(`Groq returned unparsable JSON: ${e.message}`);
    }
  }
  if (!Array.isArray(parsed)) {
    throw new Error(`Groq returned non-array payload for ${category.name}`);
  }
  return parsed;
}

function normalizeGeneratedProduct(raw, category, usedNames, usedSlugs) {
  const name = String(raw?.name || "").trim();
  const brand = String(raw?.brand || "").trim();
  const price = Number(raw?.price || 0);
  const warrantyMonths = clampInt(Number(raw?.warrantyMonths || 12), 0, 60);
  const searchKeywords = String(raw?.searchKeywords || name).trim();
  const fullDescription = String(raw?.fullDescription || "").trim();
  const inTheBox = String(raw?.inTheBox || "").trim();
  const shortDescription = String(raw?.shortDescription || "").trim();
  const specifications = raw?.specifications && typeof raw.specifications === "object" ? raw.specifications : {};

  if (!name || price <= 0 || !fullDescription) {
    return null;
  }

  const baseSlug = slugify(name);
  if (!baseSlug) return null;

  let slug = baseSlug;
  let suffix = 2;
  while (usedSlugs.has(slug)) {
    slug = `${baseSlug}-${suffix++}`;
  }

  if (usedNames.has(normalizeText(name))) {
    return null;
  }

  const cleanSpecs = {
    Brand: brand || raw?.specifications?.Brand || category.name,
    Model: String(raw?.specifications?.Model || name).trim(),
    Category: category.name,
    ...specifications,
  };

  return {
    name,
    slug,
    brand: brand || String(cleanSpecs.Brand || category.name).trim(),
    price: Math.max(100000, Math.round(price)),
    warrantyMonths,
    searchKeywords,
    fullDescription,
    inTheBox: inTheBox || "Sản phẩm, tài liệu hướng dẫn",
    shortDescription: shortDescription || stripHtml(fullDescription).slice(0, 160),
    specifications: cleanSpecs,
  };
}

async function searchPexels(query) {
  if (!process.env.PEXELS_API_KEY) {
    throw new Error("PEXELS_API_KEY is not configured");
  }

  const url = new URL("https://api.pexels.com/v1/search");
  url.searchParams.set("query", query);
  url.searchParams.set("per_page", String(PEXELS_PER_PAGE));
  url.searchParams.set("orientation", "landscape");
  url.searchParams.set("size", "large");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: process.env.PEXELS_API_KEY,
        "User-Agent": "TechBuiltAI-Generator/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Pexels HTTP ${response.status}: ${errorText.slice(0, 300)}`);
    }

    const payload = await response.json();
    const photos = Array.isArray(payload.photos) ? payload.photos : [];
    const filtered = photos
      .filter((photo) => isPhotoEligible(photo, query))
      .sort((a, b) => scorePhoto(b, query) - scorePhoto(a, query));

    return filtered;
  } finally {
    clearTimeout(timeoutId);
  }
}

function generateFilename(productSlug, index) {
  const timestamp = Date.now();
  return `${productSlug}-${timestamp}-${index}.jpg`;
}

async function fileExists(filePath) {
  try {
    await fs.promises.access(filePath, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function downloadImage(photo, productSlug, index, usedUrls, usedHashes, usedFileNames) {
  const sourceUrl = photo?.src?.large2x || photo?.src?.large || photo?.src?.original;
  if (!sourceUrl) {
    return null;
  }

  if (usedUrls.has(sourceUrl)) {
    return { skipped: true, reason: "duplicate-url" };
  }

  const fileName = generateFilename(productSlug, index);
  const filePath = path.join(UPLOADS_DIR, fileName);

  if (usedFileNames.has(fileName) || (await fileExists(filePath))) {
    return { skipped: true, reason: "duplicate-filename" };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const response = await fetch(sourceUrl, {
      headers: {
        Referer: "https://www.pexels.com/",
        "User-Agent": "TechBuiltAI-Generator/1.0",
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      return { skipped: true, reason: `download-http-${response.status}` };
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return { skipped: true, reason: "invalid-content-type" };
    }

    const buffer = Buffer.from(await response.arrayBuffer());
    const hash = hashBuffer(buffer);
    if (usedHashes.has(hash)) {
      return { skipped: true, reason: "duplicate-hash" };
    }

    await fs.promises.writeFile(filePath, buffer);
    usedUrls.add(sourceUrl);
    usedHashes.add(hash);
    usedFileNames.add(fileName);

    return {
      skipped: false,
      sourceUrl,
      fileName,
      filePath,
      relativeUrl: `/uploads/products/${fileName}`,
      hash,
      width: Number(photo.width || 0),
      height: Number(photo.height || 0),
      photographer: photo.photographer || null,
      altText: String(photo.alt || "product image").trim(),
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

async function collectUniqueImages(product, category, usedUrls, usedHashes, usedFileNames) {
  const profile = buildCategoryProfile(category);
  const targetCount = clampInt(
    Number(process.env.GENERATOR_MAX_IMAGES_PER_PRODUCT || MAX_IMAGES_PER_PRODUCT),
    MIN_IMAGES_PER_PRODUCT,
    MAX_IMAGES_PER_PRODUCT,
  );
  const queries = buildImageQueries(product, profile, category.name);
  const selected = [];
  const seenPerProduct = new Set();
  const rejectedQueries = [];

  for (let round = 0; round < MAX_IMAGE_SEARCH_ROUNDS && selected.length < targetCount; round++) {
    for (const query of queries) {
      if (selected.length >= targetCount) break;

      logger.info("IMAGE", `Searching unique images... query="${query}"`);
      const photos = await searchPexels(query);

      if (photos.length === 0) {
        rejectedQueries.push(query);
        continue;
      }

      for (const photo of photos) {
        if (selected.length >= targetCount) break;
        const sourceUrl = photo?.src?.large2x || photo?.src?.large || photo?.src?.original;
        if (!sourceUrl || seenPerProduct.has(sourceUrl) || usedUrls.has(sourceUrl)) {
          logger.skip("IMAGE", "Duplicate image detected");
          continue;
        }

        const downloaded = await downloadImage(photo, product.slug, selected.length + 1, usedUrls, usedHashes, usedFileNames);
        if (!downloaded || downloaded.skipped) {
          if (downloaded?.reason === "duplicate-url") {
            logger.skip("IMAGE", "Duplicate URL detected");
          } else if (downloaded?.reason === "duplicate-hash") {
            logger.skip("IMAGE", "Duplicate hash detected");
          } else if (downloaded?.reason === "invalid-content-type") {
            logger.skip("IMAGE", "Invalid content-type, retrying");
          }
          continue;
        }

        seenPerProduct.add(sourceUrl);
        selected.push(downloaded);
      }
    }

    if (selected.length < targetCount) {
      await sleep(500);
    }
  }

  const finalImages = selected.slice(0, targetCount);
  if (finalImages.length < MIN_IMAGES_PER_PRODUCT) {
    return {
      ok: false,
      images: [],
      reason: `Only got ${finalImages.length} unique images`,
      rejectedQueries,
    };
  }

  return {
    ok: true,
    images: finalImages,
    reason: null,
    rejectedQueries,
  };
}

async function ensureUploadsDir() {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

async function loadRegistry() {
  const usedUrls = new Set();
  const usedHashes = new Set();
  const usedFileNames = new Set();
  const usedNames = new Set();
  const usedSlugs = new Set();

  const [products, fileNames] = await Promise.all([
    prisma.product.findMany({
      select: {
        name: true,
        slug: true,
        images: {
          select: { imageUrl: true },
        },
      },
    }),
    fs.promises.readdir(UPLOADS_DIR).catch(() => []),
  ]);

  for (const product of products) {
    usedNames.add(normalizeText(product.name));
    usedSlugs.add(String(product.slug || "").trim().toLowerCase());
    for (const image of product.images || []) {
      const imageUrl = String(image.imageUrl || "").trim();
      if (imageUrl) {
        usedUrls.add(imageUrl);
      }
    }
  }

  for (const fileName of fileNames) {
    usedFileNames.add(fileName);
    const filePath = path.join(UPLOADS_DIR, fileName);
    try {
      const buffer = await fs.promises.readFile(filePath);
      usedHashes.add(hashBuffer(buffer));
    } catch {
      // ignore unreadable files
    }
  }

  return { usedUrls, usedHashes, usedFileNames, usedNames, usedSlugs };
}

async function getCategories() {
  const categories = await prisma.category.findMany({
    where: {
      isActive: true,
      isDeleted: false,
    },
    orderBy: { name: "asc" },
  });

  if (categories.length === 0) {
    throw new Error("No active categories found");
  }

  return CATEGORY_LIMIT > 0 ? categories.slice(0, CATEGORY_LIMIT) : categories;
}

async function getDefaultSupplier() {
  return prisma.supplier.findFirst({ orderBy: { id: "asc" } });
}

async function createProductInTransaction(category, supplierId, product, images) {
  return prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        categoryId: category.id,
        supplierId: supplierId || null,
        name: product.name,
        slug: product.slug,
        price: product.price,
        salePrice: null,
        warrantyMonths: product.warrantyMonths,
        stockQuantity: Math.max(10, Math.floor(Math.random() * 40) + 15),
        lowStockThreshold: 5,
        isHomepageFeatured: false,
        displayOrder: 9999,
        specifications: product.specifications,
        status: "ACTIVE",
      },
    });

    await tx.productDetail.upsert({
      where: { productId: created.id },
      create: {
        productId: created.id,
        fullDescription: product.fullDescription,
        inTheBox: product.inTheBox,
        manualUrl: null,
        warrantyPolicy: `Bảo hành ${product.warrantyMonths} tháng theo chính sách chính hãng`,
      },
      update: {
        fullDescription: product.fullDescription,
        inTheBox: product.inTheBox,
        manualUrl: null,
        warrantyPolicy: `Bảo hành ${product.warrantyMonths} tháng theo chính sách chính hãng`,
      },
    });

    await tx.productImage.createMany({
      data: images.map((image, index) => ({
        productId: created.id,
        imageUrl: image.relativeUrl,
        isPrimary: index === 0,
        sortOrder: index,
        altText: `${product.name} - ${index === 0 ? "thumbnail" : `image ${index + 1}`}`,
      })),
    });

    return created;
  });
}

async function cleanupDownloadedFiles(images) {
  await Promise.all(
    images.map(async (image) => {
      if (!image?.filePath) return;
      try {
        await fs.promises.unlink(image.filePath);
      } catch {
        // ignore cleanup errors
      }
    }),
  );
}

async function generateCategoryProducts(category, supplierId, registries) {
  const profile = buildCategoryProfile(category);
  logger.info("CATEGORY", `Generating category ${profile.categoryLabel || category.name}`);

  const targetCount = PRODUCTS_PER_CATEGORY;
  const acceptedProducts = [];
  const localUsedNames = new Set();
  const localUsedSlugs = new Set();
  const existingNameList = Array.from(registries.usedNames).slice(0, 24);

  let attempt = 0;
  while (acceptedProducts.length < targetCount && attempt < MAX_PRODUCT_RETRIES) {
    attempt += 1;
    const needed = targetCount - acceptedProducts.length;
    const requestedCount = needed + 2;
    logger.info(
      "AI",
      `Attempt ${attempt}/${MAX_PRODUCT_RETRIES}: requesting ${requestedCount} candidates for ${category.name}`,
    );

    const rawCandidates = await callGroqForProducts(category, requestedCount, [
      ...registries.usedNames,
      ...localUsedNames,
      ...acceptedProducts.map((item) => item.name),
      ...existingNameList,
    ].filter(Boolean));

    const normalizedCandidates = [];
    for (const raw of rawCandidates) {
      const product = normalizeGeneratedProduct(
        raw,
        category,
        new Set([...registries.usedNames, ...localUsedNames]),
        new Set([...registries.usedSlugs, ...localUsedSlugs]),
      );
      if (!product) continue;

      const normName = normalizeText(product.name);
      const normSlug = product.slug;
      if (registries.usedNames.has(normName) || localUsedNames.has(normName)) {
        continue;
      }
      if (registries.usedSlugs.has(normSlug) || localUsedSlugs.has(normSlug)) {
        continue;
      }

      localUsedNames.add(normName);
      localUsedSlugs.add(normSlug);
      normalizedCandidates.push(product);
    }

    acceptedProducts.push(...normalizedCandidates);
    acceptedProducts.splice(targetCount);

    if (acceptedProducts.length < targetCount) {
      logger.retry("AI", `Only got ${acceptedProducts.length}/${targetCount} unique products for ${category.name}`);
      await sleep(750);
    }
  }

  return acceptedProducts.slice(0, targetCount);
}

async function processProduct(category, supplierId, productData, registries, index, total) {
  logger.info("PRODUCT", `${index + 1}/${total}: ${productData.name}`);

  const tempUsedUrls = new Set(registries.usedUrls);
  const tempUsedHashes = new Set(registries.usedHashes);
  const tempUsedFileNames = new Set(registries.usedFileNames);

  const imageResult = await collectUniqueImages(productData, category, tempUsedUrls, tempUsedHashes, tempUsedFileNames);
  if (!imageResult.ok) {
    logger.skip("IMAGE", `${productData.name}: ${imageResult.reason}`);
    await cleanupDownloadedFiles(imageResult.images || []);
    return { success: false, reason: imageResult.reason };
  }

  const images = imageResult.images;
  if (images.length < MIN_IMAGES_PER_PRODUCT) {
    logger.skip("IMAGE", `${productData.name}: not enough unique images`);
    await cleanupDownloadedFiles(images);
    return { success: false, reason: "not-enough-images" };
  }

  try {
    await createProductInTransaction(category, supplierId, productData, images);

    // Commit registry only after database insert succeeds.
    for (const image of images) {
      registries.usedUrls.add(image.sourceUrl);
      registries.usedHashes.add(image.hash);
      registries.usedFileNames.add(image.fileName);
    }
    registries.usedNames.add(normalizeText(productData.name));
    registries.usedSlugs.add(productData.slug);

    logger.ok("DB", `Inserted into database: ${productData.name}`);
    logger.ok("IMAGE", `Downloaded ${images.length} unique images`);
    return { success: true, product: productData.name };
  } catch (error) {
    logger.error("DB", `${productData.name}: ${error.message}`);
    await cleanupDownloadedFiles(images);
    return { success: false, reason: error.message };
  }
}

async function main() {
  await ensureUploadsDir();

  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║     AUTO GENERATE PRODUCTS - AI + REAL PHOTOS         ║");
  console.log("╚════════════════════════════════════════════════════════╝\n");

  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_API_KEY is missing");
  }
  if (!process.env.PEXELS_API_KEY) {
    throw new Error("PEXELS_API_KEY is missing");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing");
  }

  logger.info("INIT", "Loading registry from database and uploads folder...");
  const registries = await loadRegistry();
  logger.ok(
    "INIT",
    `Loaded ${registries.usedNames.size} existing products, ${registries.usedUrls.size} image URLs, ${registries.usedHashes.size} hashes`,
  );

  const categories = await getCategories();
  const supplier = await getDefaultSupplier();
  if (supplier) {
    logger.info("SUPPLIER", `Using supplier: ${supplier.name}`);
  }

  let totalCreated = 0;
  let totalFailed = 0;

  for (const category of categories) {
    const categoryProfile = buildCategoryProfile(category);

    try {
      const products = await generateCategoryProducts(category, supplier?.id, registries);
      if (products.length === 0) {
        logger.warn("AI", `No unique products returned for ${category.name}`);
        continue;
      }

      for (let i = 0; i < products.length; i++) {
        const result = await processProduct(category, supplier?.id, products[i], registries, i, products.length);
        if (result.success) {
          totalCreated += 1;
        } else {
          totalFailed += 1;
        }
        await sleep(RATE_LIMIT_MS);
      }
    } catch (error) {
      totalFailed += 1;
      logger.error("CATEGORY", `${category.name}: ${error.message}`);
    }

    await sleep(CATEGORY_GAP_MS);
  }

  console.log("\n╔════════════════════════════════════════════════════════╗");
  console.log("║                        SUMMARY                        ║");
  console.log("╠════════════════════════════════════════════════════════╣");
  logger.ok("DONE", `Total created: ${totalCreated}`);
  if (totalFailed > 0) {
    logger.warn("DONE", `Total failed: ${totalFailed}`);
  }
  console.log("╚════════════════════════════════════════════════════════╝\n");
}

main()
  .catch((error) => {
    logger.error("FATAL", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
