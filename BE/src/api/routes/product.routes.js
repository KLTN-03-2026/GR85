import { Router } from "express";
import path from "node:path";
import fs from "node:fs";
import multer from "multer";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { getCatalogOverview } from "../../services/product.service.js";
import {
  batchUpdateProductDisplayOrder,
  createProductReviewBySlug,
  createProduct,
  deleteProductById,
  getProductDetailBySlug,
  listProductReviewsBySlug,
  listProductDisplayOrderItems,
  listProducts,
  updateProductById,
} from "../../services/product.service.js";

const router = Router();

const uploadsDir = path.resolve(process.cwd(), "uploads", "products");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`);
  },
});

const upload = multer({
  storage,
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpg", "image/jpeg", "image/png"];
    if (!allowed.includes(file.mimetype)) {
      cb(new Error("Chỉ chấp nhận file ảnh JPG, JPEG hoặc PNG"));
      return;
    }

    cb(null, true);
  },
});

const productSchema = z.object({
  name: z.string().min(1),
  productCode: z.string().min(1),
  categorySlug: z.string().min(1),
  supplierId: z.number().int().positive().optional().nullable(),
  price: z.number().positive(),
  stockQuantity: z.number().int().min(0),
  warrantyMonths: z.number().int().min(0).optional(),
  isHomepageFeatured: z.boolean().optional(),
  displayOrder: z.number().int().min(0).optional(),
  imageUrl: z.string().optional(),
  specifications: z.record(z.any()).optional(),
  detail: z.object({
    fullDescription: z.string().optional(),
    inTheBox: z.string().optional(),
    manualUrl: z.string().optional().nullable(),
    warrantyPolicy: z.string().optional(),
  }).optional(),
});

const updateProductSchema = productSchema.partial();

const updateDisplayOrderSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().int().positive(),
      displayOrder: z.number().int().min(0),
    }),
  ).min(1),
});

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

router.get("/overview", async (_req, res) => {
  try {
    const data = await getCatalogOverview();
    return res.json(data);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
  }
});

router.get("/", async (req, res) => {
  try {
    const data = await listProducts(req.query);
    return res.json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.get("/display-order", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const data = await listProductDisplayOrderItems();
    return res.json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.get("/:slug", async (req, res) => {
  try {
    const data = await getProductDetailBySlug(req.params.slug);
    return res.json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.get("/:slug/reviews", async (req, res) => {
  try {
    const data = await listProductReviewsBySlug(req.params.slug);
    return res.json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post("/:slug/reviews", requireAuth, async (req, res) => {
  try {
    const parsed = reviewSchema.parse(req.body ?? {});
    const data = await createProductReviewBySlug(Number(req.auth?.sub), req.params.slug, parsed);
    return res.status(201).json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post("/upload-image", requireAuth, requireAdmin, upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "File ảnh là bắt buộc" });
  }

  const imagePath = `/uploads/products/${req.file.filename}`;
  return res.status(201).json({ imageUrl: imagePath });
});

router.post("/", requireAuth, requireAdmin, async (req, res) => {
  try {
    const parsed = productSchema.parse(req.body);
    const data = await createProduct(parsed);
    return res.status(201).json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const parsed = updateProductSchema.parse(req.body);
    const data = await updateProductById(req.params.id, parsed);
    return res.json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.patch("/display-order", requireAuth, requireAdmin, async (req, res) => {
  try {
    const parsed = updateDisplayOrderSchema.parse(req.body ?? {});
    const data = await batchUpdateProductDisplayOrder(parsed);
    return res.json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  try {
    const data = await deleteProductById(req.params.id);
    return res.json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

function requireAdmin(req, res, next) {
  if (req.auth?.role !== "Admin") {
    return res.status(403).json({ message: "Chỉ admin mới được phép thực hiện thao tác này" });
  }

  return next();
}

function handleRouteError(error, res) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: "Dữ liệu yêu cầu không hợp lệ", issues: error.flatten() });
  }

  if (error instanceof Error) {
    const status =
      error.message.includes("not found")
        ? 404
        : error.message.includes("already exists")
          ? 409
          : 400;
    return res.status(status).json({ message: error.message });
  }

  return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
}

export { router as productRouter };
