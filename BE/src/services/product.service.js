import { prisma } from "../db/prisma.js";
import { serializeData } from "../utils/serialize.js";

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

export async function listProducts(query = {}) {
  const page = Math.max(1, Number(query.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(query.pageSize ?? DEFAULT_PAGE_SIZE)),
  );
  const keyword = String(query.keyword ?? "").trim();
  const category = String(query.category ?? "").trim().toLowerCase();
  const brand = String(query.brand ?? "").trim();
  const sort = String(query.sort ?? "newest").trim().toLowerCase();
  const stockStatus = String(query.stockStatus ?? "all").trim().toLowerCase();
  const minPrice =
    query.minPrice === undefined || query.minPrice === ""
      ? undefined
      : Number(query.minPrice);
  const maxPrice =
    query.maxPrice === undefined || query.maxPrice === ""
      ? undefined
      : Number(query.maxPrice);

  const where = buildProductWhere({
    keyword,
    category,
    brand,
    stockStatus,
    minPrice,
    maxPrice,
  });

  const orderBy = resolveProductOrderBy(sort);

  const [totalItems, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy,
      include: {
        category: true,
        supplier: true,
        images: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
          take: 1,
        },
      },
    }),
  ]);

  return serializeData({
    items: items.map(mapProductListItem),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
  });
}

export async function getProductDetailBySlug(slug) {
  const normalizedSlug = String(slug ?? "").trim().toLowerCase();
  if (!normalizedSlug) {
    throw new Error("Product slug is required");
  }

  const product = await prisma.product.findUnique({
    where: { slug: normalizedSlug },
    include: {
      category: true,
      supplier: true,
      detail: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
      },
    },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  return serializeData(mapProductDetail(product));
}

export async function getCatalogOverview() {
  const [categories, products] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    }),
    prisma.product.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        category: true,
        supplier: true,
        detail: true,
        images: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
          take: 1,
        },
      },
    }),
  ]);

  return serializeData({
    categories: categories.map((category) => ({
      id: category.slug,
      name: category.name,
      slug: category.slug,
      productCount: category._count.products,
    })),
    products: products.map(mapProductDetail),
  });
}

export async function createProduct(input) {
  if (!input?.name?.trim()) {
    throw new Error("Product name is required");
  }

  if (!input?.productCode?.trim()) {
    throw new Error("Product code is required");
  }

  const price = Number(input.price);
  const stockQuantity = Number(input.stockQuantity);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Product price must be greater than 0");
  }

  if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
    throw new Error("Stock quantity must be >= 0");
  }

  const category = await prisma.category.findUnique({
    where: { slug: String(input.categorySlug).trim().toLowerCase() },
  });

  if (!category) {
    throw new Error("Category not found");
  }

  const slug = normalizeProductCode(input.productCode);
  const existingByCode = await prisma.product.findUnique({ where: { slug } });
  if (existingByCode) {
    throw new Error("Product code already exists");
  }

  const created = await prisma.product.create({
    data: {
      name: input.name.trim(),
      slug,
      categoryId: category.id,
      supplierId: input.supplierId ? Number(input.supplierId) : null,
      price,
      warrantyMonths: Number(input.warrantyMonths ?? 12),
      stockQuantity,
      specifications: input.specifications && typeof input.specifications === "object"
        ? input.specifications
        : {},
      images: input.imageUrl
        ? {
            create: {
              imageUrl: input.imageUrl,
              isPrimary: true,
              sortOrder: 0,
            },
          }
        : undefined,
    },
    include: {
      category: true,
      supplier: true,
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }] },
    },
  });

  // Create ProductDetail if provided
  if (input.detail && typeof input.detail === "object") {
    await prisma.productDetail.upsert({
      where: { productId: created.id },
      create: {
        productId: created.id,
        fullDescription: input.detail.fullDescription?.trim() || null,
        inTheBox: input.detail.inTheBox?.trim() || null,
        manualUrl: input.detail.manualUrl?.trim() || null,
        warrantyPolicy: input.detail.warrantyPolicy?.trim() || null,
      },
      update: {
        fullDescription: input.detail.fullDescription?.trim() || null,
        inTheBox: input.detail.inTheBox?.trim() || null,
        manualUrl: input.detail.manualUrl?.trim() || null,
        warrantyPolicy: input.detail.warrantyPolicy?.trim() || null,
      },
    });
  }

  const createdWithDetail = await prisma.product.findUnique({
    where: { id: created.id },
    include: {
      category: true,
      supplier: true,
      detail: true,
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }] },
    },
  });

  return serializeData(mapProductDetail(createdWithDetail));
}

export async function updateProductById(productId, input) {
  const id = Number(productId);
  if (!Number.isFinite(id)) {
    throw new Error("Invalid product id");
  }

  const current = await prisma.product.findUnique({ where: { id } });
  if (!current) {
    throw new Error("Product not found");
  }

  const data = {};

  if (input.name !== undefined) {
    const name = String(input.name).trim();
    if (!name) {
      throw new Error("Product name is required");
    }
    data.name = name;
  }

  if (input.productCode !== undefined) {
    const slug = normalizeProductCode(input.productCode);
    const duplicate = await prisma.product.findUnique({ where: { slug } });
    if (duplicate && duplicate.id !== id) {
      throw new Error("Product code already exists");
    }
    data.slug = slug;
  }

  if (input.categorySlug !== undefined) {
    const category = await prisma.category.findUnique({
      where: { slug: String(input.categorySlug).trim().toLowerCase() },
    });
    if (!category) {
      throw new Error("Category not found");
    }
    data.categoryId = category.id;
  }

  if (input.supplierId !== undefined) {
    data.supplierId = input.supplierId ? Number(input.supplierId) : null;
  }

  if (input.price !== undefined) {
    const price = Number(input.price);
    if (!Number.isFinite(price) || price <= 0) {
      throw new Error("Product price must be greater than 0");
    }
    data.price = price;
  }

  if (input.stockQuantity !== undefined) {
    const stockQuantity = Number(input.stockQuantity);
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      throw new Error("Stock quantity must be >= 0");
    }
    data.stockQuantity = stockQuantity;
  }

  if (input.warrantyMonths !== undefined) {
    data.warrantyMonths = Number(input.warrantyMonths);
  }

  if (input.specifications !== undefined) {
    data.specifications =
      input.specifications && typeof input.specifications === "object"
        ? input.specifications
        : {};
  }

  const updated = await prisma.$transaction(async (tx) => {
    const product = await tx.product.update({
      where: { id },
      data,
      include: {
        category: true,
        supplier: true,
        images: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
        },
      },
    });

    if (input.imageUrl !== undefined) {
      await tx.productImage.updateMany({
        where: { productId: id, isPrimary: true },
        data: { isPrimary: false },
      });

      if (input.imageUrl) {
        await tx.productImage.create({
          data: {
            productId: id,
            imageUrl: input.imageUrl,
            isPrimary: true,
            sortOrder: 0,
          },
        });
      }
    }

    // Handle ProductDetail
    if (input.detail !== undefined && input.detail && typeof input.detail === "object") {
      await tx.productDetail.upsert({
        where: { productId: id },
        create: {
          productId: id,
          fullDescription: input.detail.fullDescription?.trim() || null,
          inTheBox: input.detail.inTheBox?.trim() || null,
          manualUrl: input.detail.manualUrl?.trim() || null,
          warrantyPolicy: input.detail.warrantyPolicy?.trim() || null,
        },
        update: {
          fullDescription: input.detail.fullDescription?.trim() || null,
          inTheBox: input.detail.inTheBox?.trim() || null,
          manualUrl: input.detail.manualUrl?.trim() || null,
          warrantyPolicy: input.detail.warrantyPolicy?.trim() || null,
        },
      });
    }

    return product;
  });

  const updatedWithDetail = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      supplier: true,
      detail: true,
      images: { orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }] },
    },
  });

  return serializeData(mapProductDetail(updatedWithDetail));
}

export async function deleteProductById(productId) {
  const id = Number(productId);
  if (!Number.isFinite(id)) {
    throw new Error("Invalid product id");
  }

  await prisma.product.delete({ where: { id } });
  return { success: true };
}

function buildProductWhere(filters) {
  const and = [];

  if (filters.keyword) {
    and.push({
      OR: [
        {
          name: {
            contains: filters.keyword,
          },
        },
        {
          slug: {
            contains: normalizeProductCode(filters.keyword),
          },
        },
      ],
    });
  }

  if (filters.category) {
    and.push({ category: { slug: filters.category } });
  }

  if (filters.brand) {
    and.push({
      OR: [
        {
          supplier: {
            name: {
              contains: filters.brand,
            },
          },
        },
        {
          name: {
            contains: filters.brand,
          },
        },
      ],
    });
  }

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    and.push({
      price: {
        gte: Number.isFinite(filters.minPrice) ? filters.minPrice : undefined,
        lte: Number.isFinite(filters.maxPrice) ? filters.maxPrice : undefined,
      },
    });
  }

  if (filters.stockStatus === "in-stock") {
    and.push({ stockQuantity: { gt: 0 } });
  }

  if (filters.stockStatus === "out-of-stock") {
    and.push({ stockQuantity: { lte: 0 } });
  }

  if (and.length === 0) {
    return {};
  }

  return { AND: and };
}

function resolveProductOrderBy(sort) {
  switch (sort) {
    case "price_asc":
      return [{ price: "asc" }, { createdAt: "desc" }];
    case "price_desc":
      return [{ price: "desc" }, { createdAt: "desc" }];
    case "name_asc":
      return [{ name: "asc" }, { createdAt: "desc" }];
    case "stock_desc":
      return [{ stockQuantity: "desc" }, { createdAt: "desc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }];
  }
}

function mapProductListItem(product) {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    productCode: product.slug,
    price: product.price,
    stockQuantity: product.stockQuantity,
    isOutOfStock: Number(product.stockQuantity ?? 0) <= 0,
    warrantyMonths: product.warrantyMonths,
    specifications: product.specifications,
    category: product.category,
    supplier: product.supplier,
    imageUrl: product.images?.[0]?.imageUrl ?? "/images/component-placeholder.svg",
  };
}

function mapProductDetail(product) {
  return {
    ...mapProductListItem(product),
    detail: product.detail ?? null,
    images: product.images ?? [],
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  };
}

function normalizeProductCode(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}
