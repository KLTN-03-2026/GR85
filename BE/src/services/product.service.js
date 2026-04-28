import { prisma } from "../db/prisma.js";
import { serializeData } from "../utils/serialize.js";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { createWishlistPriceDropNotifications } from "./notification.service.js";

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;
const CATEGORY_PUBLIC_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
};

export async function listProducts(query = {}) {
  const page = Math.max(1, Number(query.page ?? 1));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(query.pageSize ?? DEFAULT_PAGE_SIZE)),
  );
  const keyword = String(query.keyword ?? "").trim();
  const category = String(query.category ?? "")
    .trim()
    .toLowerCase();
  const brand = String(query.brand ?? "").trim();
  const sort = String(query.sort ?? "display_order")
    .trim()
    .toLowerCase();
  const stockStatus = String(query.stockStatus ?? "all")
    .trim()
    .toLowerCase();
  const featuredOnly =
    String(query.featuredOnly ?? "")
      .trim()
      .toLowerCase() === "true";
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
    featuredOnly,
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
        category: { select: CATEGORY_PUBLIC_SELECT },
        supplier: true,
        images: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
          take: 1,
        },
      },
    }),
  ]);

  const productsWithRating = await attachProductRatings(items);

  return serializeData({
    items: productsWithRating.map(mapProductListItem),
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages: Math.max(1, Math.ceil(totalItems / pageSize)),
    },
  });
}

export async function getProductDetailBySlug(slug) {
  const normalizedSlug = String(slug ?? "")
    .trim()
    .toLowerCase();
  if (!normalizedSlug) {
    throw new Error("Product slug is required");
  }

  const product = await prisma.product.findUnique({
    where: { slug: normalizedSlug },
    include: {
      category: { select: CATEGORY_PUBLIC_SELECT },
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

  const [productWithRating] = await attachProductRatings([product]);

  const relatedRaw = await prisma.product.findMany({
    where: {
      id: { not: product.id },
      stockQuantity: { gt: 0 },
      OR: [
        { categoryId: product.categoryId },
        ...(product.supplierId ? [{ supplierId: product.supplierId }] : []),
      ],
    },
    take: 8,
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    include: {
      category: { select: CATEGORY_PUBLIC_SELECT },
      supplier: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
        take: 1,
      },
    },
  });
  const relatedWithRatings = await attachProductRatings(relatedRaw);

  return serializeData({
    ...mapProductDetail(productWithRating),
    relatedProducts: relatedWithRatings.map(mapProductListItem),
  });
}

export async function listProductReviewsBySlug(slug, input = {}) {
  const normalizedSlug = String(slug ?? "").trim().toLowerCase();
  const ratingFilter = Number(input.rating);
  if (!normalizedSlug) {
    throw new Error("Product slug is required");
  }

  const product = await prisma.product.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true },
  });

  if (!product) {
    throw new Error("Không tim thấy sản phẩm");
  }

  // Hybrid: show only the latest review per user on the public product page.
  // Prisma `distinct` isn't deterministic on MySQL for "latest per group", so we filter in JS.
  const reviews = await prisma.review.findMany({
    where: {
      productId: product.id,
  status: ReviewStatus.VISIBLE,
  isHidden: false,
  ...(Number.isInteger(ratingFilter) && ratingFilter >= 1 && ratingFilter <= 5
    ? { rating: ratingFilter }
    : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      replies: {
        orderBy: { createdAt: "asc" },
        take: 200,
        include: {
          sender: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      },
      images: {
        orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 500,
  });

  const seenUserIds = new Set();
  const latestPerUser = [];
  for (const review of reviews) {
    if (seenUserIds.has(review.userId)) {
      continue;
    }
    seenUserIds.add(review.userId);
    latestPerUser.push(review);
  }

  const averageRating =
    latestPerUser.length > 0
      ? latestPerUser.reduce(
          (sum, review) => sum + Number(review.rating ?? 0),
          0,
        ) / latestPerUser.length
      : 0;
  return serializeData({
    items: latestPerUser.map((review) => ({
      id: review.id,
      rating: Number(review.rating ?? 0),
      comment: review.comment ? String(review.comment) : "",
      status: review.status,
      moderationReason: review.moderationReason ?? null,
      createdAt: review.createdAt,
      adminReply: review.adminReply ? String(review.adminReply) : "",
      adminRepliedAt: review.adminRepliedAt,
      images: Array.isArray(review.images)
        ? review.images.map((image) => ({
            id: image.id,
            imageUrl: String(image.imageUrl ?? ""),
            sortOrder: Number(image.sortOrder ?? 0),
          }))
        : [],
      thread: mapPublicReviewThread(review),
      user: {
        id: review.user.id,
        fullName:
          String(review.user.fullName ?? "").trim() ||
          String(review.user.email ?? "Ẩn danh"),
      },
      replies: review.replies.map((reply) => ({
        id: reply.id,
        message: String(reply.message ?? ""),
        createdAt: reply.createdAt,
        user: {
          id: reply.sender.id,
          fullName: String(reply.sender.fullName ?? "").trim() || String(reply.sender.email ?? "Ẩn danh"),
          role: reply.sender.role?.name ?? null,
        },
      })),
    })),
    summary: {
      totalReviews: latestPerUser.length,
      averageRating,
      ratingBreakdown: buildRatingBreakdown(reviews),
    },
  });
}

function mapPublicReviewThread(review) {
  const reviewUserId = Number(review?.userId);
  const replies = Array.isArray(review?.replies) ? review.replies : [];

  const thread = replies.map((reply) => {
    const senderId = Number(reply.senderId);
    const isStaff =
      Number.isFinite(senderId) && senderId > 0 && senderId !== reviewUserId;

    return {
      id: reply.id,
      senderId,
      senderName:
        String(reply.sender?.fullName ?? "").trim() ||
        String(reply.sender?.email ?? "").trim() ||
        (isStaff ? "Nhân viên" : "Khách hàng"),
      isStaff,
      message: String(reply.message ?? ""),
      createdAt: reply.createdAt,
    };
  });

  const fallbackAdminReply = String(review?.adminReply ?? "").trim();
  const fallbackAdminRepliedAt = review?.adminRepliedAt
    ? new Date(review.adminRepliedAt)
    : null;
  const hasFallback =
    Boolean(fallbackAdminReply) &&
    !thread.some(
      (item) => String(item.message ?? "").trim() === fallbackAdminReply,
    );

  if (hasFallback) {
    thread.push({
      id: `fallback-admin-${review.id}`,
      senderId: Number(review?.adminRepliedBy) || null,
      senderName: "Nhân viên",
      isStaff: true,
      message: fallbackAdminReply,
      createdAt:
        fallbackAdminRepliedAt || review?.updatedAt || review?.createdAt,
    });
  }

  return thread.sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
}

export async function getProductReviewEligibilityBySlug(userId, slug) {
  const normalizedUserId = Number(userId);
  const normalizedSlug = String(slug ?? "")
    .trim()
    .toLowerCase();

  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    throw new Error("ID người dùng không hợp lệ");
  }

  if (!normalizedSlug) {
    throw new Error("Product slug is required");
  }

  const product = await prisma.product.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  // Hybrid: can review if there's at least one DELIVERED+PAID order item for this product
  // that hasn't been reviewed yet.
  const eligibleOrderItem = await prisma.orderItem.findFirst({
    where: {
      productId: product.id,
      order: {
        userId: normalizedUserId,
        orderStatus: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
      },
      reviews: {
        none: {
          userId: normalizedUserId,
        },
      },
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  return serializeData({
    canReview: Boolean(eligibleOrderItem),
    reason: eligibleOrderItem
      ? null
      : "Bạn chỉ có thể đánh giá mỗi đơn hàng 1 lần sau khi đã nhận hàng và thanh toán thành công",
  });
}

export async function listMyWishlistProducts(userId) {
  const normalizedUserId = Number(userId);
  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    throw new Error("Invalid user id");
  }

  const wishlistItems = await prisma.wishlistItem.findMany({
    where: { userId: normalizedUserId },
    orderBy: { createdAt: "desc" },
    include: {
      product: {
        include: {
          category: { select: CATEGORY_PUBLIC_SELECT },
          supplier: true,
          images: {
            orderBy: [
              { isPrimary: "desc" },
              { sortOrder: "asc" },
              { id: "asc" },
            ],
            take: 1,
          },
        },
      },
    },
  });

  const productsWithRatings = await attachProductRatings(
    wishlistItems.map((item) => item.product),
  );

  return serializeData(
    productsWithRatings.map((product, index) => ({
      ...mapProductListItem(product),
      wishlistCreatedAt: wishlistItems[index]?.createdAt ?? null,
    })),
  );
}

export async function addProductToWishlistBySlug(userId, slug) {
  const normalizedUserId = Number(userId);
  const normalizedSlug = String(slug ?? "")
    .trim()
    .toLowerCase();

  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    throw new Error("Invalid user id");
  }

  if (!normalizedSlug) {
    throw new Error("Product slug is required");
  }

  const product = await prisma.product.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  await prisma.wishlistItem.upsert({
    where: {
      userId_productId: {
        userId: normalizedUserId,
        productId: product.id,
      },
    },
    update: {},
    create: {
      userId: normalizedUserId,
      productId: product.id,
    },
  });

  return serializeData({ success: true });
}

export async function removeProductFromWishlistBySlug(userId, slug) {
  const normalizedUserId = Number(userId);
  const normalizedSlug = String(slug ?? "")
    .trim()
    .toLowerCase();

  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    throw new Error("Invalid user id");
  }

  if (!normalizedSlug) {
    throw new Error("Product slug is required");
  }

  const product = await prisma.product.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  await prisma.wishlistItem.deleteMany({
    where: {
      userId: normalizedUserId,
      productId: product.id,
    },
  });

  return serializeData({ success: true });
}

export async function getWishlistStatusBySlug(userId, slug) {
  const normalizedUserId = Number(userId);
  const normalizedSlug = String(slug ?? "")
    .trim()
    .toLowerCase();

  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    throw new Error("Invalid user id");
  }

  if (!normalizedSlug) {
    throw new Error("Product slug is required");
  }

  const product = await prisma.product.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true },
  });

  if (!product) {
    throw new Error("Product not found");
  }

  const existing = await prisma.wishlistItem.findUnique({
    where: {
      userId_productId: {
        userId: normalizedUserId,
        productId: product.id,
      },
    },
    select: { id: true },
  });

  return serializeData({
    isWishlisted: Boolean(existing),
  });
}

export async function createProductReviewBySlug(
  userId,
  slug,
  input = {},
  reviewImageUrls = [],
) {
  const normalizedUserId = Number(userId);
  const normalizedSlug = String(slug ?? "")
    .trim()
    .toLowerCase();
  const rating = Number(input.rating);
  const comment = String(input.comment ?? "").trim();

  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    throw new Error("ID người dùng không hợp lệ");
  }

  if (!normalizedSlug) {
    throw new Error("Cần có mã định danh sản phẩm");
  }

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    throw new Error("Đánh giá phải là số nguyên từ 1 đến 5");
  }

  if (comment.length > 1000) {
    throw new Error("Bình luận quá dài");
  }

  const normalizedReviewImages = Array.isArray(reviewImageUrls)
    ? reviewImageUrls
        .map((imageUrl, index) => ({
          imageUrl: String(imageUrl ?? "").trim(),
          sortOrder: index,
        }))
        .filter((item) => Boolean(item.imageUrl))
    : [];

  const product = await prisma.product.findUnique({
    where: { slug: normalizedSlug },
    select: { id: true },
  });

  if (!product) {
    throw new Error("Không tim thấy sản phẩm");
  }

  const eligibleOrderItem = await prisma.orderItem.findFirst({
    where: {
      productId: product.id,
      order: {
        userId: normalizedUserId,
        orderStatus: OrderStatus.DELIVERED,
        paymentStatus: PaymentStatus.PAID,
      },
      reviews: {
        none: {
          userId: normalizedUserId,
        },
      },
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });

  if (!eligibleOrderItem) {
    throw new Error(
      "Bạn chỉ có thể đánh giá mỗi đơn hàng 1 lần sau khi đã nhận hàng và thanh toán thành công",
    );
  }

  let review;
  try {
    review = await prisma.$transaction(async (tx) => {
      const createdReview = await tx.review.create({
        data: {
          userId: normalizedUserId,
          productId: product.id,
          orderItemId: eligibleOrderItem.id,
          rating,
          comment: comment || null,
        },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      if (normalizedReviewImages.length > 0) {
        await tx.reviewImage.createMany({
          data: normalizedReviewImages.map((item) => ({
            reviewId: createdReview.id,
            imageUrl: item.imageUrl,
            sortOrder: item.sortOrder,
          })),
        });
      }

      return tx.review.findUnique({
        where: { id: createdReview.id },
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          images: {
            orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
          },
        },
      });
    });
  } catch (error) {
    if (error && typeof error === "object" && error.code === "P2002") {
      throw new Error(
        "Đơn hàng này đã được đánh giá rồi (review already exists)",
      );
    }
    throw error;
  }

  return serializeData({
    id: review.id,
    rating: Number(review.rating ?? 0),
    comment: review.comment ? String(review.comment) : "",
    createdAt: review.createdAt,
    images: Array.isArray(review.images)
      ? review.images.map((image) => ({
          id: image.id,
          imageUrl: String(image.imageUrl ?? ""),
          sortOrder: Number(image.sortOrder ?? 0),
        }))
      : [],
    user: {
      id: review.user.id,
      fullName:
        String(review.user.fullName ?? "").trim() ||
        String(review.user.email ?? "Ẩn danh"),
    },
  });
}

export async function replyToProductReview(userId, reviewIdInput, input = {}) {
  const normalizedUserId = Number(userId);
  const reviewId = Number(reviewIdInput);
  const message = String(input.message ?? input.comment ?? "").trim();

  if (!Number.isFinite(normalizedUserId) || normalizedUserId <= 0) {
    throw new Error("ID người dùng không hợp lệ");
  }

  if (!Number.isFinite(reviewId) || reviewId <= 0) {
    throw new Error("ID đánh giá không hợp lệ");
  }

  if (message.length < 1) {
    throw new Error("Nội dung phản hồi không được để trống");
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!review) {
    throw new Error("Không tìm thấy đánh giá");
  }

  if (review.status === ReviewStatus.DELETED) {
    throw new Error("Đánh giá đã bị xóa");
  }

  const reply = await prisma.reviewReply.create({
    data: {
      reviewId: review.id,
      userId: normalizedUserId,
      message,
    },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
          role: {
            select: {
              name: true,
            },
          },
        },
      },
    },
  });

  if (review.userId !== normalizedUserId) {
    await createSystemNotification({
      userId: review.userId,
      title: "Có phản hồi mới cho đánh giá",
      message: `Đánh giá của bạn cho ${String(review.product.name ?? "sản phẩm")} vừa có phản hồi mới.`,
      payload: {
        reviewId: review.id,
        productId: review.productId,
        productSlug: review.product.slug,
        replyId: reply.id,
      },
    });
  }

  return serializeData({
    id: reply.id,
    reviewId: review.id,
    message: reply.message,
    createdAt: reply.createdAt,
    user: {
      id: reply.user.id,
      fullName: String(reply.user.fullName ?? "").trim() || String(reply.user.email ?? "Ẩn danh"),
      role: reply.user.role?.name ?? null,
    },
  });
}

export async function moderateProductReviewByAdmin(adminUserId, reviewIdInput, input = {}) {
  const normalizedAdminId = Number(adminUserId);
  const reviewId = Number(reviewIdInput);
  const action = String(input.action ?? "").trim().toUpperCase();
  const reason = String(input.reason ?? input.rejectReason ?? "").trim();

  if (!Number.isFinite(normalizedAdminId) || normalizedAdminId <= 0) {
    throw new Error("ID quản trị viên không hợp lệ");
  }

  if (!Number.isFinite(reviewId) || reviewId <= 0) {
    throw new Error("ID đánh giá không hợp lệ");
  }

  if (!["HIDE", "DELETE"].includes(action)) {
    throw new Error("Hành động phải là HIDE hoặc DELETE");
  }

  if (reason.length < 5) {
    throw new Error("Lý do xử lý đánh giá phải có ít nhất 5 ký tự");
  }

  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      user: {
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      },
      product: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });

  if (!review) {
    throw new Error("Không tìm thấy đánh giá");
  }

  const nextStatus = action === "DELETE" ? ReviewStatus.DELETED : ReviewStatus.HIDDEN;
  const updated = await prisma.$transaction(async (tx) => {
    const nextReview = await tx.review.update({
      where: { id: review.id },
      data: {
        status: nextStatus,
        moderationReason: reason,
        moderatedBy: normalizedAdminId,
        moderatedAt: new Date(),
      },
    });

    await tx.reviewModerationLog.create({
      data: {
        reviewId: review.id,
        actorId: normalizedAdminId,
        action: nextStatus,
        reason,
      },
    });

    return nextReview;
  });

  await createSystemNotification({
    userId: review.userId,
    title: nextStatus === ReviewStatus.DELETED ? "Đánh giá đã bị xóa" : "Đánh giá đã bị ẩn",
    message: `Đánh giá của bạn cho ${String(review.product.name ?? "sản phẩm")} đã bị ${
      nextStatus === ReviewStatus.DELETED ? "xóa" : "ẩn"
    } vì: ${reason}`,
    payload: {
      reviewId: review.id,
      productId: review.productId,
      productSlug: review.product.slug,
      action: nextStatus,
      reason,
    },
  });

  return serializeData({
    id: updated.id,
    status: updated.status,
    moderationReason: updated.moderationReason,
    moderatedAt: updated.moderatedAt,
  });
}

function buildRatingBreakdown(reviews) {
  const total = Math.max(0, reviews.length);
  return [5, 4, 3, 2, 1].map((rating) => {
    const count = reviews.filter((review) => Number(review.rating ?? 0) === rating).length;
    const percent = total > 0 ? Math.round((count / total) * 100) : 0;
    return { rating, count, percent };
  });
}

export async function getCatalogOverview() {
  const [categories, products, topBuyerAggregates] = await Promise.all([
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
      orderBy: [
        { isHomepageFeatured: "desc" },
        { displayOrder: "asc" },
        { createdAt: "desc" },
      ],
      include: {
        category: { select: CATEGORY_PUBLIC_SELECT },
        supplier: true,
        detail: true,
        images: {
          orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
          take: 1,
        },
      },
    }),
    prisma.order.groupBy({
      by: ["userId"],
      where: { orderStatus: OrderStatus.DELIVERED },
      _sum: { totalAmount: true },
      _count: { _all: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 5,
    }),
  ]);

  // Resolve top buyer user details
  let topBuyers = [];
  if (topBuyerAggregates.length > 0) {
    const userIds = topBuyerAggregates.map((agg) => agg.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, fullName: true, email: true },
    });
    const userMap = new Map(users.map((u) => [u.id, u]));

    topBuyers = topBuyerAggregates.map((agg) => {
      const user = userMap.get(agg.userId);
      const fullName = String(user?.fullName ?? "").trim();
      return {
        id: `u${agg.userId}`,
        name: fullName || String(user?.email ?? "Ẩn danh").split("@")[0],
        orders: agg._count._all,
        spend: Number(agg._sum.totalAmount ?? 0),
      };
    });
  }

  const productsWithRating = await attachProductRatings(products);

  return serializeData({
    categories: categories.map((category) => ({
      id: category.slug,
      name: category.name,
      slug: category.slug,
      productCount: category._count.products,
    })),
    products: productsWithRating.map(mapProductDetail),
    topBuyers,
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
  const salePrice =
    input.salePrice === undefined || input.salePrice === null
      ? null
      : Number(input.salePrice);
  const stockQuantity = Number(input.stockQuantity);
  const lowStockThreshold = Number(input.lowStockThreshold ?? 5);
  const saleStartAt =
    input.saleStartAt === undefined || input.saleStartAt === null
      ? null
      : new Date(input.saleStartAt);
  const saleEndAt =
    input.saleEndAt === undefined || input.saleEndAt === null
      ? null
      : new Date(input.saleEndAt);

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Product price must be greater than 0");
  }

  if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
    throw new Error("Stock quantity must be >= 0");
  }

  if (!Number.isFinite(lowStockThreshold) || lowStockThreshold < 0) {
    throw new Error("Low stock threshold must be >= 0");
  }

  if (salePrice !== null && (!Number.isFinite(salePrice) || salePrice <= 0)) {
    throw new Error("Sale price must be > 0");
  }

  if (salePrice !== null && salePrice >= price) {
    throw new Error("Sale price must be lower than base price");
  }

  if (
    (saleStartAt && Number.isNaN(saleStartAt.getTime())) ||
    (saleEndAt && Number.isNaN(saleEndAt.getTime()))
  ) {
    throw new Error("Invalid sale time range");
  }

  if (saleStartAt && saleEndAt && saleStartAt > saleEndAt) {
    throw new Error("Sale start time must be before end time");
  }

  const category = await prisma.category.findFirst({
    where: {
      slug: String(input.categorySlug).trim().toLowerCase(),
    },
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
      salePrice,
      saleStartAt,
      saleEndAt,
      warrantyMonths: Number(input.warrantyMonths ?? 12),
      stockQuantity,
      lowStockThreshold: Math.trunc(lowStockThreshold),
      isHomepageFeatured: Boolean(input.isHomepageFeatured),
      displayOrder: Number.isFinite(Number(input.displayOrder))
        ? Math.max(0, Number(input.displayOrder))
        : 9999,
      specifications:
        input.specifications && typeof input.specifications === "object"
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
      category: { select: CATEGORY_PUBLIC_SELECT },
      supplier: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
      },
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
      category: { select: CATEGORY_PUBLIC_SELECT },
      supplier: true,
      detail: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
      },
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
  const previousEffectivePrice = resolveEffectivePrice(current);

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
    const category = await prisma.category.findFirst({
      where: {
        slug: String(input.categorySlug).trim().toLowerCase(),
      },
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

  if (input.salePrice !== undefined) {
    if (input.salePrice === null || input.salePrice === "") {
      data.salePrice = null;
    } else {
      const salePrice = Number(input.salePrice);
      if (!Number.isFinite(salePrice) || salePrice <= 0) {
        throw new Error("Sale price must be > 0");
      }
      data.salePrice = salePrice;
    }
  }

  if (input.saleStartAt !== undefined) {
    if (!input.saleStartAt) {
      data.saleStartAt = null;
    } else {
      const saleStartAt = new Date(input.saleStartAt);
      if (Number.isNaN(saleStartAt.getTime())) {
        throw new Error("Invalid sale start time");
      }
      data.saleStartAt = saleStartAt;
    }
  }

  if (input.saleEndAt !== undefined) {
    if (!input.saleEndAt) {
      data.saleEndAt = null;
    } else {
      const saleEndAt = new Date(input.saleEndAt);
      if (Number.isNaN(saleEndAt.getTime())) {
        throw new Error("Invalid sale end time");
      }
      data.saleEndAt = saleEndAt;
    }
  }

  if (input.stockQuantity !== undefined) {
    const stockQuantity = Number(input.stockQuantity);
    if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
      throw new Error("Stock quantity must be >= 0");
    }
    data.stockQuantity = stockQuantity;
  }

  if (input.lowStockThreshold !== undefined) {
    const threshold = Number(input.lowStockThreshold);
    if (!Number.isFinite(threshold) || threshold < 0) {
      throw new Error("Low stock threshold must be >= 0");
    }
    data.lowStockThreshold = Math.trunc(threshold);
  }

  if (input.warrantyMonths !== undefined) {
    data.warrantyMonths = Number(input.warrantyMonths);
  }

  if (input.isHomepageFeatured !== undefined) {
    data.isHomepageFeatured = Boolean(input.isHomepageFeatured);
  }

  if (input.displayOrder !== undefined) {
    const displayOrder = Number(input.displayOrder);
    if (!Number.isFinite(displayOrder) || displayOrder < 0) {
      throw new Error("Display order must be >= 0");
    }
    data.displayOrder = Math.trunc(displayOrder);
  }

  if (input.specifications !== undefined) {
    data.specifications =
      input.specifications && typeof input.specifications === "object"
        ? input.specifications
        : {};
  }

  const updated = await prisma.$transaction(async (tx) => {
    const nextPrice = data.price ?? current.price;
    const nextSalePrice = Object.prototype.hasOwnProperty.call(
      data,
      "salePrice",
    )
      ? data.salePrice
      : current.salePrice;
    const nextSaleStartAt = Object.prototype.hasOwnProperty.call(
      data,
      "saleStartAt",
    )
      ? data.saleStartAt
      : current.saleStartAt;
    const nextSaleEndAt = Object.prototype.hasOwnProperty.call(
      data,
      "saleEndAt",
    )
      ? data.saleEndAt
      : current.saleEndAt;

    if (nextSaleStartAt && nextSaleEndAt && nextSaleStartAt > nextSaleEndAt) {
      throw new Error("Sale start time must be before end time");
    }

    if (nextSalePrice !== null && Number(nextSalePrice) >= Number(nextPrice)) {
      throw new Error("Sale price must be lower than base price");
    }

    const product = await tx.product.update({
      where: { id },
      data,
      include: {
        category: { select: CATEGORY_PUBLIC_SELECT },
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
    if (
      input.detail !== undefined &&
      input.detail &&
      typeof input.detail === "object"
    ) {
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

  const updatedEffectivePrice = resolveEffectivePrice(updated);
  await createWishlistPriceDropNotifications(
    updated,
    previousEffectivePrice,
    updatedEffectivePrice,
  );

  const updatedWithDetail = await prisma.product.findUnique({
    where: { id },
    include: {
      category: { select: CATEGORY_PUBLIC_SELECT },
      supplier: true,
      detail: true,
      images: {
        orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }, { id: "asc" }],
      },
    },
  });

  console.info(
    `[ProductUpdate] id=${id} stock ${Number(current.stockQuantity ?? 0)} -> ${Number(
      updatedWithDetail?.stockQuantity ?? current.stockQuantity ?? 0,
    )} price ${Number(current.price ?? 0)} -> ${Number(updatedWithDetail?.price ?? current.price ?? 0)}`,
  );

  return serializeData(mapProductDetail(updatedWithDetail));
}

export async function batchUpdateProductDisplayOrder(input = {}) {
  const items = Array.isArray(input.items) ? input.items : [];

  if (items.length === 0) {
    throw new Error("Display order items are required");
  }

  const normalized = items.map((item, index) => {
    const id = Number(item?.id);
    const displayOrder = Number(item?.displayOrder ?? index);

    if (!Number.isFinite(id) || id <= 0) {
      throw new Error("Invalid product id in display order payload");
    }

    if (!Number.isFinite(displayOrder) || displayOrder < 0) {
      throw new Error("Display order must be >= 0");
    }

    return {
      id,
      displayOrder: Math.trunc(displayOrder),
    };
  });

  await prisma.$transaction(
    normalized.map((item) =>
      prisma.product.update({
        where: { id: item.id },
        data: { displayOrder: item.displayOrder },
      }),
    ),
  );

  return serializeData({
    success: true,
    updatedCount: normalized.length,
  });
}

export async function listProductDisplayOrderItems() {
  const items = await prisma.product.findMany({
    orderBy: [{ displayOrder: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      displayOrder: true,
      isHomepageFeatured: true,
      stockQuantity: true,
    },
  });

  return serializeData(
    items.map((item) => ({
      id: Number(item.id),
      name: item.name,
      displayOrder: Number(item.displayOrder ?? 9999),
      isHomepageFeatured: Boolean(item.isHomepageFeatured),
      stockQuantity: Number(item.stockQuantity ?? 0),
    })),
  );
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

  if (filters.featuredOnly) {
    and.push({ isHomepageFeatured: true });
  }

  if (and.length === 0) {
    return {};
  }

  return { AND: and };
}

function resolveProductOrderBy(sort) {
  switch (sort) {
    case "best_selling":
      return [
        { orderItems: { _count: "desc" } },
        { displayOrder: "asc" },
        { createdAt: "desc" },
      ];
    case "display_order":
      return [{ displayOrder: "asc" }, { createdAt: "desc" }];
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
  const basePrice = Number(product.price ?? 0);
  const saleState = resolveSaleState(product);
  const effectivePrice = resolveEffectivePrice(product);
  const averageRatingRaw = Number(product.averageRating ?? 5);
  const normalizedRating = Number.isFinite(averageRatingRaw)
    ? Math.max(0, Math.min(5, averageRatingRaw))
    : 5;

  const reviewCountRaw = Number(product.reviewCount ?? 0);
  const reviewCount =
    Number.isFinite(reviewCountRaw) && reviewCountRaw > 0 ? reviewCountRaw : 0;

  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    productCode: product.slug,
    price: effectivePrice,
    basePrice,
    salePrice: product.salePrice,
    saleStartAt: product.saleStartAt,
    saleEndAt: product.saleEndAt,
    isFlashSaleActive: saleState.isActive,
    stockQuantity: product.stockQuantity,
    lowStockThreshold: Number(product.lowStockThreshold ?? 5),
    isLowStock:
      Number(product.stockQuantity ?? 0) <=
      Number(product.lowStockThreshold ?? 5),
    isHomepageFeatured: Boolean(product.isHomepageFeatured),
    displayOrder: Number(product.displayOrder ?? 9999),
    isOutOfStock: Number(product.stockQuantity ?? 0) <= 0,
    warrantyMonths: product.warrantyMonths,
    specifications: product.specifications,
    category: product.category,
    supplier: product.supplier,
    rating: Number(normalizedRating.toFixed(1)),
    reviewCount,
    imageUrl:
      product.images?.[0]?.imageUrl ?? "/images/component-placeholder.svg",
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

async function attachProductRatings(products) {
  const productList = Array.isArray(products) ? products : [];
  if (productList.length === 0) {
    return [];
  }

  const productIds = productList
    .map((product) => Number(product?.id))
    .filter((id) => Number.isFinite(id));

  if (productIds.length === 0) {
    return productList.map((product) => ({
      ...product,
      averageRating: 5,
      reviewCount: 0,
    }));
  }

  const aggregates = await prisma.review.groupBy({
    by: ["productId"],
    where: {
      productId: {
        in: productIds,
      },
      isHidden: false,
    },
    _avg: {
      rating: true,
    },
    _count: {
      _all: true,
    },
  });

  const aggregateByProductId = new Map(
    aggregates.map((aggregate) => [
      Number(aggregate.productId),
      {
        averageRating:
          aggregate._avg?.rating === null ||
          aggregate._avg?.rating === undefined
            ? 5
            : Number(aggregate._avg.rating),
        reviewCount: Number(aggregate._count?._all ?? 0),
      },
    ]),
  );

  return productList.map((product) => {
    const aggregate = aggregateByProductId.get(Number(product.id));
    return {
      ...product,
      averageRating: aggregate?.averageRating ?? 5,
      reviewCount: aggregate?.reviewCount ?? 0,
    };
  });
}

function resolveSaleState(product, now = new Date()) {
  const basePrice = Number(product?.price ?? 0);
  const salePrice =
    product?.salePrice === null || product?.salePrice === undefined
      ? null
      : Number(product.salePrice);
  const saleStartAt = product?.saleStartAt
    ? new Date(product.saleStartAt)
    : null;
  const saleEndAt = product?.saleEndAt ? new Date(product.saleEndAt) : null;

  const hasValidSalePrice =
    Number.isFinite(salePrice) && salePrice > 0 && salePrice < basePrice;
  const hasValidStart = !saleStartAt || !Number.isNaN(saleStartAt.getTime());
  const hasValidEnd = !saleEndAt || !Number.isNaN(saleEndAt.getTime());

  const inWindow =
    (!saleStartAt || now >= saleStartAt) && (!saleEndAt || now <= saleEndAt);

  return {
    isActive: Boolean(
      hasValidSalePrice && hasValidStart && hasValidEnd && inWindow,
    ),
    salePrice,
  };
}

function resolveEffectivePrice(product, now = new Date()) {
  const basePrice = Number(product?.price ?? 0);
  const saleState = resolveSaleState(product, now);
  if (saleState.isActive && Number.isFinite(saleState.salePrice)) {
    return saleState.salePrice;
  }
  return basePrice;
}
