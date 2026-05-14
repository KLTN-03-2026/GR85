/**
 * Product Image Management Service
 * Handles image uploads, reordering, and Pexels regeneration
 */

import { prisma } from "../db/prisma.js";
import { getProductImages } from "./pexels.service.js";

/**
 * Regenerate product images from Pexels API
 */
export async function regenerateProductImagesFromPexels(productId) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { category: true },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  try {
    // Fetch images from Pexels
    const newImages = await getProductImages(product, product.category);

    if (newImages.length === 0) {
      throw new Error("No images found from Pexels API");
    }

    // Delete existing gallery images (keep user uploads if marked differently)
    // For now, replace all with fresh Pexels images
    await prisma.productImage.deleteMany({
      where: { productId },
    });

    // Insert new images
    const createdImages = await prisma.productImage.createMany({
      data: newImages.map((img) => ({
        productId,
        imageUrl: img.imageUrl,
        isPrimary: img.isPrimary,
        sortOrder: img.sortOrder,
        altText: img.altText,
      })),
    });

    return {
      success: true,
      message: `Regenerated ${createdImages.count} images for product`,
      count: createdImages.count,
    };
  } catch (error) {
    throw new Error(`Failed to regenerate images: ${error.message}`);
  }
}

/**
 * Add/upload image for product
 */
export async function addProductImage(productId, imageUrl, altText = null) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  // Get current max sortOrder
  const maxSortOrder = await prisma.productImage.findFirst({
    where: { productId },
    orderBy: { sortOrder: "desc" },
    select: { sortOrder: true },
  });

  const nextSortOrder = (maxSortOrder?.sortOrder ?? 0) + 1;

  const image = await prisma.productImage.create({
    data: {
      productId,
      imageUrl,
      isPrimary: false,
      sortOrder: nextSortOrder,
      altText: altText || product.name,
    },
  });

  return image;
}

/**
 * Set an image as primary for a product
 */
export async function setProductImageAsPrimary(productId, imageId) {
  // Verify image belongs to product
  const image = await prisma.productImage.findUnique({
    where: { id: imageId },
  });

  if (!image || image.productId !== productId) {
    throw new Error("Image not found for this product");
  }

  // Unset all other primary images
  await prisma.productImage.updateMany(
    {
      where: {
        productId,
        id: { not: imageId },
      },
    },
    {
      data: { isPrimary: false },
    }
  );

  // Set this image as primary
  const updated = await prisma.productImage.update(
    {
      where: { id: imageId },
    },
    {
      data: { isPrimary: true, sortOrder: 1 },
    }
  );

  return updated;
}

/**
 * Reorder product images
 * imageOrder: [{ id, sortOrder }, ...]
 */
export async function reorderProductImages(productId, imageOrder) {
  if (!Array.isArray(imageOrder) || imageOrder.length === 0) {
    throw new Error("Invalid image order format");
  }

  // Verify all images belong to this product
  const imageIds = imageOrder.map((img) => img.id);
  const images = await prisma.productImage.findMany({
    where: {
      id: { in: imageIds },
      productId,
    },
  });

  if (images.length !== imageIds.length) {
    throw new Error("Some images do not belong to this product");
  }

  // Update sort orders
  const updates = await Promise.all(
    imageOrder.map((item) =>
      prisma.productImage.update(
        {
          where: { id: item.id },
        },
        {
          data: { sortOrder: item.sortOrder },
        }
      )
    )
  );

  return updates;
}

/**
 * Delete product image
 */
export async function deleteProductImage(productId, imageId) {
  const image = await prisma.productImage.findUnique({
    where: { id: imageId },
  });

  if (!image || image.productId !== productId) {
    throw new Error("Image not found for this product");
  }

  // Don't allow deleting if it's the only image
  const imageCount = await prisma.productImage.count({
    where: { productId },
  });

  if (imageCount <= 1) {
    throw new Error("Cannot delete the only image for a product");
  }

  // Delete image
  await prisma.productImage.delete({
    where: { id: imageId },
  });

  // If deleted image was primary, set first remaining as primary
  const isPrimary = image.isPrimary;
  if (isPrimary) {
    const firstImage = await prisma.productImage.findFirst(
      {
        where: { productId },
      },
      {
        orderBy: { sortOrder: "asc" },
      }
    );

    if (firstImage) {
      await prisma.productImage.update(
        {
          where: { id: firstImage.id },
        },
        {
          data: { isPrimary: true },
        }
      );
    }
  }

  return { success: true, message: "Image deleted successfully" };
}

/**
 * Get product images
 */
export async function getProductImagesForAdmin(productId) {
  const images = await prisma.productImage.findMany(
    {
      where: { productId },
    },
    {
      orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
    }
  );

  return images;
}
