/**
 * Pexels API Service
 * Fetches real product images from Pexels API
 * Handles smart search queries and fallbacks
 */

const PEXELS_API_KEY = process.env.PEXELS_API_KEY;
const PEXELS_API_BASE = "https://api.pexels.com/v1";

// Mapping of product categories to Pexels search keywords
const CATEGORY_KEYWORDS = {
  cpu: "computer cpu processor",
  ram: "computer ram memory stick",
  mainboard: "motherboard circuit board",
  ssd: "ssd nvme storage drive",
  vga: "graphics card gpu gaming",
  hdd: "hard drive storage",
  psu: "power supply unit",
  case: "computer case tower",
  cooling: "cpu cooler fan heatsink",
  monitor: "computer monitor display screen",
  mouse: "computer mouse gaming",
  keyboard: "keyboard mechanical gaming",
  headset: "gaming headset headphones",
  speaker: "desktop speaker audio",
  webcam: "webcam camera streaming",
  microphone: "studio microphone recording",
  hub: "usb hub adapter connector",
  cable: "usb cable connector",
  stand: "monitor stand desk mount",
  pad: "mousepad gaming desk pad",
  laptop: "gaming laptop computer",
  tablet: "tablet device screen",
  router: "wifi router networking",
  printer: "office printer",
  chair: "gaming chair ergonomic",
};

/**
 * Build smart search query from product data
 * Priority: category keywords > product type > generic hardware
 */
function buildSearchQuery(product) {
  if (!product) return "computer hardware";

  const { name = "", brand = "", category = {} } = product;
  const categorySlug = typeof category === "object" ? category?.slug : category;

  // Get category keywords
  const categoryKeywords = CATEGORY_KEYWORDS[categorySlug?.toLowerCase()] || "computer hardware";

  // For specific products, use just the category keywords
  // Examples: "cpu", "graphics card", "keyboard", etc.
  // This is more effective for Pexels than searching for exact model numbers
  return categoryKeywords || "computer hardware";
}

/**
 * Fetch images from Pexels API with pagination support
 * Returns array of high-quality images
 */
async function fetchImagesByQuery(query, count = 4, page = 1) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.warn("[Pexels] API key not configured, using fallback");
    return [];
  }

  if (!query || query.trim().length === 0) {
    query = "computer hardware";
  }

  try {
    const url = new URL(`${PEXELS_API_BASE}/search`);
    url.searchParams.append("query", query);
    url.searchParams.append("per_page", Math.min(count + 5, 80));
    url.searchParams.append("page", String(page));
    url.searchParams.append("orientation", "landscape");
    url.searchParams.append("size", "medium");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: apiKey,
        "User-Agent": "PC-Perfect-Ecommerce/1.0",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `[Pexels] API error: ${response.status} - ${errorText.substring(0, 100)}`
      );
      return [];
    }

    const data = await response.json();
    const photos = Array.isArray(data.photos) ? data.photos : [];

    if (photos.length === 0) {
      console.warn(`[Pexels] No photos returned for query: "${query}" (page ${page})`);
    }

    // Filter for quality and relevance
    const filteredPhotos = photos
      .filter((photo) => {
        // Prefer medium-high resolution and ensure photographer url exists
        const photographerUrl = photo.photographer_url || photo.photographerUrl || photo.photographerUrl;
        const alt = photo.alt || photo.description || "";
        return (
          (photo.width || 0) >= 600 &&
          (photo.height || 0) >= 400 &&
          !!photographerUrl && // Professional photos
          !String(alt).toLowerCase().includes("watermark")
        );
      })
      .slice(0, count);

    return filteredPhotos;
  } catch (error) {
    console.error(`[Pexels] Fetch error for "${query}": ${error.message}`);
    return [];
  }
}

/**
 * Get formatted product images from Pexels
 * Returns array ready for ProductImage table
 */
async function getProductImages(product, category = null) {
  if (!product) return [];

  // Build search query
  const searchQuery = buildSearchQuery({
    ...product,
    category: category || product.category,
  });

  console.log(`[Pexels] Searching: "${searchQuery}"`);

  // Fetch images
  const photos = await fetchImagesByQuery(searchQuery, 4);

  if (photos.length === 0) {
    console.warn(`[Pexels] No images found for: ${searchQuery}`);
    return [];
  }

  // Format for ProductImage table
  const images = photos.map((photo, index) => ({
    imageUrl: photo.src.large, // Use large size: 940x627
    isPrimary: index === 0, // First image is primary
    sortOrder: index + 1,
    altText: photo.alt || product.name || "Product image",
  }));

  console.log(`[Pexels] Found ${images.length} images for "${product.name}"`);
  return images;
}

/**
 * Rate limit delay helper
 * Prevents API rate limit issues
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { buildSearchQuery, fetchImagesByQuery, getProductImages, delay };
