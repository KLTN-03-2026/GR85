import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import fs from "fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const prisma = new PrismaClient();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const UPLOADS_DIR = path.resolve(__dirname, "..", "uploads", "products");

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    dryRun: args.includes("--dry-run"),
    deleteDb: args.includes("--db"),
    yes: args.includes("--yes"),
  };
}

async function exists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function removeUploads(dryRun = true) {
  if (!(await exists(UPLOADS_DIR))) {
    console.log(`[SKIP] Uploads directory not found: ${UPLOADS_DIR}`);
    return { deletedFiles: 0, deletedDirs: 0 };
  }

  const entries = await fs.readdir(UPLOADS_DIR, { withFileTypes: true });
  let deletedFiles = 0;
  let deletedDirs = 0;

  for (const entry of entries) {
    const entryPath = path.join(UPLOADS_DIR, entry.name);
    if (entry.isDirectory()) {
      const files = await fs.readdir(entryPath);
      for (const f of files) {
        const fp = path.join(entryPath, f);
        if (dryRun) {
          console.log(`[DRY] Would delete file: ${path.relative(process.cwd(), fp)}`);
          deletedFiles++;
        } else {
          await fs.unlink(fp).catch(() => {});
          deletedFiles++;
        }
      }
      if (dryRun) {
        console.log(`[DRY] Would remove directory: ${path.relative(process.cwd(), entryPath)}`);
        deletedDirs++;
      } else {
        await fs.rmdir(entryPath).catch(() => {});
        deletedDirs++;
      }
    } else if (entry.isFile()) {
      const fp = path.join(UPLOADS_DIR, entry.name);
      if (dryRun) {
        console.log(`[DRY] Would delete file: ${path.relative(process.cwd(), fp)}`);
        deletedFiles++;
      } else {
        await fs.unlink(fp).catch(() => {});
        deletedFiles++;
      }
    }
  }

  return { deletedFiles, deletedDirs };
}

async function cleanupDatabase() {
  // delete all ProductImage rows. Attempt to nullify product image fields if present.
  const deleted = await prisma.productImage.deleteMany({});
  let updatedCount = 0;
  try {
    // try to nullify a common field `imageUrl` if it exists
    const updated = await prisma.product.updateMany({ data: { imageUrl: null } });
    updatedCount = updated.count ?? updated;
  } catch (e) {
    // field likely doesn't exist in schema, ignore and continue
    console.log('[WARN] Could not nullify product.imageUrl (field may not exist). Skipping that step.');
  }
  return { deletedCount: deleted.count ?? deleted, updatedCount };
}

async function main() {
  const { dryRun, deleteDb, yes } = parseArgs();

  console.log("[START] Cleaning old product images");
  console.log(`Uploads dir: ${UPLOADS_DIR}`);
  console.log(`Mode: ${dryRun ? "DRY-RUN" : "EXECUTE"} ${deleteDb ? " + DB-CLEAN" : ""}`);

  if (!dryRun && !yes) {
    console.log("To execute for real, re-run with --yes (and optionally --db to remove DB rows). Aborting.");
    process.exit(0);
  }

  const { deletedFiles, deletedDirs } = await removeUploads(dryRun);
  console.log(`[OK] Files: ${deletedFiles}, Directories removed: ${deletedDirs}`);

  if (deleteDb) {
    if (dryRun) {
      console.log(`[DRY] Would delete all ProductImage rows and nullify product.imageUrl`);
    } else {
      const res = await cleanupDatabase();
      console.log(`[DB] Deleted ProductImage rows: ${res.deletedCount}, Updated products: ${res.updatedCount}`);
    }
  }

  console.log("[DONE] cleanProductImages");
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
