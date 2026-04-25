import { prisma } from "../db/prisma.js";

export async function findProductsForSuggestion(limit = 5) {
  return findProductsForSuggestionByScope({ limit });
}

export async function findProductsForSuggestionByScope({
  limit = 5,
  includeCategorySlugs = [],
  excludeCategorySlugs = [],
} = {}) {
  const includeSlugs = Array.isArray(includeCategorySlugs)
    ? includeCategorySlugs.map((item) => String(item ?? "").trim().toLowerCase()).filter(Boolean)
    : [];
  const excludeSlugs = Array.isArray(excludeCategorySlugs)
    ? excludeCategorySlugs.map((item) => String(item ?? "").trim().toLowerCase()).filter(Boolean)
    : [];

  return prisma.product.findMany({
    where: {
      stockQuantity: {
        gt: 0,
      },
      status: "ACTIVE",
      ...(includeSlugs.length > 0 || excludeSlugs.length > 0
        ? {
          category: {
            ...(includeSlugs.length > 0 ? { slug: { in: includeSlugs } } : {}),
            ...(excludeSlugs.length > 0 ? { slug: { notIn: excludeSlugs } } : {}),
          },
        }
        : {}),
    },
    orderBy: [
      { salePrice: "asc" },
      { price: "asc" },
      { createdAt: "desc" },
    ],
    take: limit,
    select: {
      id: true,
      name: true,
      price: true,
      salePrice: true,
      category: {
        select: {
          name: true,
          slug: true,
        },
      },
    },
  });
}
