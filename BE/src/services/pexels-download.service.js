/**
 * Pexels Download Service
 * Downloads images from Pexels and stores them locally
 * Uses existing pexels.service.js to fetch image URLs
 */

import fs from "fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchImagesByQuery, buildSearchQuery } from "./pexels.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "../../uploads/products");

/**
 * Ensure directory exists for product images
 */
async function ensureProductDirectory(slug) {
  const productDir = path.join(UPLOADS_DIR, slug);
  try {
    await fs.mkdir(productDir, { recursive: true });
    return productDir;
  } catch (error) {
    console.error(`[Download] Failed to create directory ${productDir}:`, error.message);
    throw error;
  }
}

/**
 * Download image from URL and save to local file
 */
async function downloadImageFile(imageUrl, filePath) {
  try {
    const response = await fetch(imageUrl, {
      method: "GET",
      headers: {
        "User-Agent": "PC-Perfect-Ecommerce/1.0",
      },
      timeout: 15000,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: Failed to download image`);
    }

    const buffer = await response.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(buffer));
    console.log(`[Download] Saved image: ${path.basename(filePath)}`);
    return true;
  } catch (error) {
    console.error(`[Download] Failed to download image:`, error.message);
    return false;
  }
}

/**
 * Download product images from Pexels and save locally
 * Uses pagination and query variations to ensure unique images per product
 * Returns array of local image paths suitable for ProductImage table
 */
async function downloadProductImages(product, category = null, productIndex = 0) {
  if (!product || !product.slug) {
    console.warn("[Download] Invalid product: missing slug");
    return [];
  }

  try {
    // Build base search query
    const baseQuery = buildSearchQuery({
      ...product,
      category: category || product.category,
    });

    // Generate query variations and pagination to ensure unique results
    const queries = [
      baseQuery,
      `${baseQuery} detail`,
      `${baseQuery} product`,
      `${baseQuery} tech setup`,
      `${baseQuery} closeup`,
      `${baseQuery} desktop`,
      `${baseQuery} workspace`,
      `${baseQuery} professional`,
    ];

    let photos = [];

    // Try different queries if needed
    for (let queryIdx = 0; queryIdx < queries.length && photos.length < 4; queryIdx++) {
      const query = queries[queryIdx];
      const page = Math.floor(productIndex / 5) + 1; // Rotate through pages every 5 products

      console.log(`[Download] Searching Pexels for: "${query}" (page ${page})`);
      photos = await fetchImagesByQuery(query, 4, page);

      if (photos.length > 0) break;
    }

    if (photos.length === 0) {
      console.warn(`[Download] No images found for: ${product.name}`);
      return [];
    }

    // Ensure product directory exists
    const productDir = await ensureProductDirectory(product.slug);

    // Download each image
    const localPaths = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = photos[i];
      const filename = `image-${i + 1}.jpg`;
      const filePath = path.join(productDir, filename);
      const localPath = `/uploads/products/${product.slug}/${filename}`;

      // Download and save
      const success = await downloadImageFile(photo.src.large, filePath);

      if (success) {
        localPaths.push({
          imageUrl: localPath, // Local path, not external URL
          isPrimary: i === 0,
          sortOrder: i + 1,
          altText: photo.alt || product.name || "Product image",
        });
      }
    }

    console.log(
      `[Download] Downloaded ${localPaths.length} images for "${product.name}"`
    );
    return localPaths;
  } catch (error) {
    console.error(`[Download] Error downloading images for ${product.name}:`, error.message);
    return [];
  }
}

/**
 * Batch download images for multiple products
 * Useful for seeding multiple products
 */
async function batchDownloadProductImages(products, category = null) {
  const results = [];

  for (const product of products) {
    const images = await downloadProductImages(product, category);
    results.push({
      productSlug: product.slug,
      images,
      success: images.length > 0,
    });

    // Rate limiting - wait between downloads
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Delay helper for rate limiting
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export {
  downloadProductImages,
  batchDownloadProductImages,
  delay,
  ensureProductDirectory,
};
