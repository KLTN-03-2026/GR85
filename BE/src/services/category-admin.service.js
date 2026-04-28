import { prisma } from "../db/prisma.js";
import { serializeData } from "../utils/serialize.js";

export async function listCategoriesForAdmin(query = {}) {
  const page = Math.max(1, Number(query.page ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize ?? 10)));
  const search = String(query.search ?? "").trim();
  const status = String(query.status ?? "all").trim().toLowerCase();

  try {
    const where = buildCategoryWhere({ search, status });

    const [totalItems, categories, statsCandidates] = await Promise.all([
      prisma.category.count({ where }),
      prisma.category.findMany({
        where,
        orderBy: [{ isDeleted: "asc" }, { isActive: "desc" }, { name: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.category.findMany({
        where: { isDeleted: false },
        orderBy: [{ name: "asc" }],
      }),
    ]);

    const countMap = await buildCategoryProductCountMap([
      ...categories.map((item) => item.id),
      ...statsCandidates.map((item) => item.id),
    ]);

    const topCategories = statsCandidates
      .map((item) => mapCategory(item, countMap.get(item.id) ?? 0))
      .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name, "vi"))
      .slice(0, 5);

    const activeCount = await prisma.category.count({
      where: { isActive: true, isDeleted: false },
    });
    const inactiveCount = await prisma.category.count({
      where: { OR: [{ isActive: false }, { isDeleted: true }] },
    });

    return serializeData({
      items: categories.map((item) => mapCategory(item, countMap.get(item.id) ?? 0)),
      topCategories,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
      summary: {
        totalCategories: totalItems,
        activeCategories: activeCount,
        inactiveCategories: inactiveCount,
      },
    });
  } catch (error) {
    if (!isMissingCategoryStatusColumnError(error)) {
      throw error;
    }

    const where = buildCategoryWhereLegacy({ search });
    const [totalItems, categories, statsCandidates] = await Promise.all([
      prisma.category.count({ where }),
      prisma.category.findMany({
        where,
        orderBy: [{ name: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.category.findMany({
        orderBy: [{ name: "asc" }],
      }),
    ]);

    const countMap = await buildCategoryProductCountMap([
      ...categories.map((item) => item.id),
      ...statsCandidates.map((item) => item.id),
    ]);

    const topCategories = statsCandidates
      .map((item) => mapCategory(item, countMap.get(item.id) ?? 0))
      .sort((a, b) => b.productCount - a.productCount || a.name.localeCompare(b.name, "vi"))
      .slice(0, 5);

    return serializeData({
      items: categories.map((item) => mapCategory(item, countMap.get(item.id) ?? 0)),
      topCategories,
      pagination: {
        page,
        pageSize,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
      },
      summary: {
        totalCategories: totalItems,
        activeCategories: totalItems,
        inactiveCategories: 0,
      },
    });
  }
}

export async function createCategoryByAdmin(input = {}) {
  const name = String(input.name ?? "").trim();
  const description = String(input.description ?? "").trim();
  const isActive = input.isActive === undefined ? true : Boolean(input.isActive);

  if (!name) {
    throw new Error("Ten danh muc la bat buoc");
  }

  const duplicate = await findDuplicateCategory(name);
  if (duplicate) {
    throw new Error("Ten danh muc da ton tai");
  }

  const slug = buildCategorySlug(name);

  const existingSlug = await prisma.category.findUnique({ where: { slug } });
  if (existingSlug) {
    throw new Error("Ten danh muc da ton tai");
  }

  let created;
  try {
    created = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
        isActive,
        isDeleted: false,
      },
    });
  } catch (error) {
    if (!isMissingCategoryStatusColumnError(error)) {
      throw error;
    }

    created = await prisma.category.create({
      data: {
        name,
        slug,
        description: description || null,
      },
    });
  }

  const productCount = await prisma.product.count({ where: { categoryId: created.id } });
  return serializeData(mapCategory(created, productCount));
}

export async function updateCategoryByAdmin(categoryIdInput, input = {}) {
  const categoryId = Number(categoryIdInput);
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    throw new Error("ID danh muc khong hop le");
  }

  const current = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!current) {
    throw new Error("Khong tim thay danh muc");
  }

  const data = {};

  if (input.name !== undefined) {
    const name = String(input.name ?? "").trim();
    if (!name) {
      throw new Error("Ten danh muc la bat buoc");
    }

    const duplicate = await findDuplicateCategory(name, categoryId);
    if (duplicate) {
      throw new Error("Ten danh muc da ton tai");
    }

    data.name = name;
    data.slug = buildCategorySlug(name);
  }

  if (input.description !== undefined) {
    data.description = String(input.description ?? "").trim() || null;
  }

  if (input.isActive !== undefined) {
    data.isActive = Boolean(input.isActive);
    if (data.isActive) {
      data.isDeleted = false;
    }
  }

  let updated;
  try {
    updated = await prisma.category.update({
      where: { id: categoryId },
      data,
    });
  } catch (error) {
    if (!isMissingCategoryStatusColumnError(error)) {
      throw error;
    }

    const legacyData = { ...data };
    delete legacyData.isActive;
    delete legacyData.isDeleted;

    updated = await prisma.category.update({
      where: { id: categoryId },
      data: legacyData,
    });
  }

  const productCount = await prisma.product.count({ where: { categoryId: updated.id } });
  return serializeData(mapCategory(updated, productCount));
}

export async function deleteCategoryByAdmin(categoryIdInput) {
  const categoryId = Number(categoryIdInput);
  if (!Number.isFinite(categoryId) || categoryId <= 0) {
    throw new Error("ID danh muc khong hop le");
  }

  const current = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!current) {
    throw new Error("Khong tim thay danh muc");
  }

  const productCount = await prisma.product.count({ where: { categoryId } });
  if (productCount > 0) {
    throw new Error("Danh muc dang co san pham, khong the xoa");
  }

  let updated;
  try {
    updated = await prisma.category.update({
      where: { id: categoryId },
      data: {
        isActive: false,
        isDeleted: true,
      },
    });
  } catch (error) {
    if (!isMissingCategoryStatusColumnError(error)) {
      throw error;
    }

    updated = await prisma.category.delete({
      where: { id: categoryId },
    });
  }

  return serializeData(mapCategory(updated, 0));
}

function buildCategoryWhere({ search, status }) {
  const and = [];

  if (search) {
    and.push({
      name: {
        contains: search,
      },
    });
  }

  if (status === "active") {
    and.push({ isActive: true, isDeleted: false });
  }

  if (status === "inactive") {
    and.push({ OR: [{ isActive: false }, { isDeleted: true }] });
  }

  return and.length > 0 ? { AND: and } : {};
}

function buildCategoryWhereLegacy({ search }) {
  if (!search) {
    return {};
  }

  return {
    name: {
      contains: search,
    },
  };
}

function buildCategorySlug(name) {
  return String(name)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

async function findDuplicateCategory(name, ignoreId) {
  const normalizedTarget = normalizeCategoryText(name);
  const categories = await prisma.category.findMany({
    select: { id: true, name: true },
  });

  return categories.find((item) => {
    if (ignoreId && Number(item.id) === Number(ignoreId)) {
      return false;
    }

    return normalizeCategoryText(item.name) === normalizedTarget;
  });
}

function normalizeCategoryText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function mapCategory(category, productCount = 0) {
  const isActive =
    category.isActive === undefined ? true : Boolean(category.isActive);
  const isDeleted =
    category.isDeleted === undefined ? false : Boolean(category.isDeleted);

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    isActive,
    isDeleted,
    status: isDeleted ? "DELETED" : isActive ? "ACTIVE" : "INACTIVE",
    productCount: Number(productCount ?? 0),
  };
}

async function buildCategoryProductCountMap(categoryIds) {
  const uniqueIds = Array.from(
    new Set(
      (Array.isArray(categoryIds) ? categoryIds : [])
        .map((id) => Number(id))
        .filter((id) => Number.isFinite(id) && id > 0),
    ),
  );

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const grouped = await prisma.product.groupBy({
    by: ["categoryId"],
    where: {
      categoryId: {
        in: uniqueIds,
      },
    },
    _count: {
      _all: true,
    },
  });

  const countMap = new Map();
  for (const item of grouped) {
    countMap.set(Number(item.categoryId), Number(item._count?._all ?? 0));
  }

  return countMap;
}

function isMissingCategoryStatusColumnError(error) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = String(error.message ?? "").toLowerCase();
  return (
    message.includes("is_active") ||
    message.includes("is_deleted") ||
    message.includes("updated_at")
  );
}