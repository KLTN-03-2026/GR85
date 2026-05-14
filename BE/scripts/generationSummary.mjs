import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "node:path";

const prisma = new PrismaClient();
const UPLOADS_DIR = path.resolve("uploads/products");
const MIN_IMAGES = 3;

async function countFiles(dir) {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let count = 0;
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) count += await countFiles(p);
      else if (e.isFile()) count += 1;
    }
    return count;
  } catch {
    return 0;
  }
}

async function main() {
  const categories = await prisma.category.count({ where: { isActive: true, isDeleted: false } });
  const products = await prisma.product.findMany({ include: { images: true } });
  const totalProducts = products.length;
  const productImageRows = await prisma.productImage.count();
  const files = await countFiles(UPLOADS_DIR);

  const productsWithTooFewImages = products.filter((p) => (p.images?.length || 0) < MIN_IMAGES).length;
  const productsWithZeroImages = products.filter((p) => (p.images?.length || 0) === 0).length;

  console.log("== Generation Summary ==");
  console.log(`[CATEGORY] Active categories: ${categories}`);
  console.log(`[DB] Total products: ${totalProducts}`);
  console.log(`[DB] ProductImage rows: ${productImageRows}`);
  console.log(`[FS] Files in uploads/products/: ${files}`);
  console.log(`[CHECK] Products with < ${MIN_IMAGES} images: ${productsWithTooFewImages}`);
  console.log(`[CHECK] Products with 0 images: ${productsWithZeroImages}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
