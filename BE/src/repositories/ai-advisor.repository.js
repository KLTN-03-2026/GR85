import { prisma } from "../db/prisma.js";

export async function findProductsForSuggestion(limit = 5) {
  return prisma.product.findMany({
    where: {
      stockQuantity: {
        gt: 0,
      },
      status: "ACTIVE",
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
        },
      },
    },
  });
}
