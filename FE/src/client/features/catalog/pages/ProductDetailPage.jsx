import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const { token, isAuthenticated, isHydrated } = useAuth();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({
    totalReviews: 0,
    averageRating: 0,
  });
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewImages, setReviewImages] = useState([]);
  const [reviewImagePreviews, setReviewImagePreviews] = useState([]);
  const [reviewError, setReviewError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [reviewEligibilityMessage, setReviewEligibilityMessage] = useState("");
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [isUpdatingWishlist, setIsUpdatingWishlist] = useState(false);
  const [wishlistMessage, setWishlistMessage] = useState("");

  const refreshReviewEligibility = useCallback(
    async (productSlug, authToken, isCancelled = () => false) => {
      if (!productSlug || !authToken || !isAuthenticated) {
        setCanReview(false);
        setReviewEligibilityMessage("Vui lòng đăng nhập để gửi đánh giá");
        return;
      }

      try {
        const response = await fetch(
          `/api/products/${productSlug}/review-eligibility`,
          {
            headers: {
              Authorization: `Bearer ${authToken}`,
            },
          },
        );

        const payload = await response.json().catch(() => ({}));
        if (isCancelled()) {
          return;
        }

        setCanReview(Boolean(payload?.canReview));
        setReviewEligibilityMessage(String(payload?.reason ?? ""));
      } catch {
        if (isCancelled()) {
          return;
        }

        setCanReview(false);
        setReviewEligibilityMessage(
          "Không thể kiểm tra quyền đánh giá lúc này",
        );
      }
    },
    [isAuthenticated],
  );

  const loadReviews = async (productSlug, isCancelled = () => false) => {
    try {
      const response = await fetch(`/api/products/${productSlug}/reviews`);
      if (!response.ok) {
        throw new Error("Không tải được đánh giá sản phẩm");
      }

      const payload = await response.json();
      if (isCancelled()) {
        return;
      }

      setReviews(Array.isArray(payload?.items) ? payload.items : []);
      setReviewSummary({
        totalReviews: Number(payload?.summary?.totalReviews ?? 0),
        averageRating: Number(payload?.summary?.averageRating ?? 0),
      });
    } catch {
      if (isCancelled()) {
        return;
      }

      setReviews([]);
      setReviewSummary({ totalReviews: 0, averageRating: 0 });
    }
  };

  useEffect(() => {
    const nextPreviews = reviewImages.map((file) => ({
      file,
      previewUrl: URL.createObjectURL(file),
    }));

    setReviewImagePreviews(nextPreviews);

    return () => {
      nextPreviews.forEach((item) => URL.revokeObjectURL(item.previewUrl));
    };
  }, [reviewImages]);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(`/api/products/${slug}`);
        if (!response.ok) {
          throw new Error("Không tải được chi tiết sản phẩm");
        }

        const payload = await response.json();
        if (!cancelled) {
          setProduct(payload);
          const recentItems = updateRecentlyViewed(payload);
          setRecentlyViewed(recentItems);
        }

        await loadReviews(payload?.slug || slug, () => cancelled);
      } catch (error) {
        if (!cancelled) {
          setProduct(null);
          setErrorMessage(
            error instanceof Error ? error.message : "Có lỗi xảy ra",
          );
          setReviews([]);
          setReviewSummary({ totalReviews: 0, averageRating: 0 });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (slug) {
      loadDetail();
    }

    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    let cancelled = false;

    if (isHydrated) {
      refreshReviewEligibility(product?.slug, token, () => cancelled);
    }

    return () => {
      cancelled = true;
    };
  }, [product?.slug, token, isHydrated, refreshReviewEligibility]);

  useEffect(() => {
    let cancelled = false;

    async function loadWishlistStatus() {
      if (!product?.slug || !token || !isAuthenticated) {
        setIsWishlisted(false);
        return;
      }

      try {
        const response = await fetch(
          `/api/products/${product.slug}/wishlist-status`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        );

        const payload = await response.json();
        if (cancelled) {
          return;
        }

        setIsWishlisted(Boolean(payload?.isWishlisted));
      } catch {
        if (cancelled) {
          return;
        }
        setIsWishlisted(false);
      }
    }

    if (isHydrated) {
      loadWishlistStatus();
    }

    return () => {
      cancelled = true;
    };
  }, [product?.slug, token, isAuthenticated, isHydrated]);

  async function toggleWishlist() {
    setWishlistMessage("");

    if (!isHydrated || !isAuthenticated || !token) {
      setWishlistMessage("Vui lòng đăng nhập để dùng wishlist");
      return;
    }

    if (!product?.slug) {
      return;
    }

    try {
      setIsUpdatingWishlist(true);
      const response = await fetch(`/api/products/${product.slug}/wishlist`, {
        method: isWishlisted ? "DELETE" : "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Không thể cập nhật wishlist");
      }

      setIsWishlisted((prev) => !prev);
      setWishlistMessage(
        isWishlisted ? "Đã bỏ khỏi wishlist" : "Đã thêm vào wishlist",
      );
    } catch (error) {
      setWishlistMessage(
        error instanceof Error ? error.message : "Không thể cập nhật wishlist",
      );
    } finally {
      setIsUpdatingWishlist(false);
    }
  }

  async function submitReview(event) {
    event.preventDefault();

    setReviewError("");
    setReviewMessage("");

    if (!isHydrated || !isAuthenticated || !token) {
      setReviewError("Vui lòng đăng nhập để đánh giá sản phẩm");
      return;
    }

    if (!product?.slug) {
      setReviewError("Không xác định được sản phẩm để đánh giá");
      return;
    }

    try {
      setIsSubmittingReview(true);

      const formData = new FormData();
      formData.append("rating", String(reviewRating));
      if (reviewComment.trim()) {
        formData.append("comment", reviewComment.trim());
      }
      reviewImages.forEach((file) => {
        formData.append("images", file);
      });

      const response = await fetch(`/api/products/${product.slug}/reviews`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const responseText = await response.text();
      let payload = null;
      if (responseText) {
        try {
          payload = JSON.parse(responseText);
        } catch {
          payload = null;
        }
      }

      if (!response.ok) {
        const serverMessage = payload?.message || responseText;
        throw new Error(serverMessage || "Gửi đánh giá thất bại");
      }

      setReviewMessage("Đánh giá của bạn đã được ghi nhận");
      setReviewComment("");
      setReviewImages([]);
      await loadReviews(product.slug);
      await refreshReviewEligibility(product.slug, token);
    } catch (error) {
      setReviewError(
        error instanceof Error ? error.message : "Gửi đánh giá thất bại",
      );
    } finally {
      setIsSubmittingReview(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <Link
          to="/components"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>

        {isLoading ? (
          <p className="mt-8 text-muted-foreground">
            Đang tải chi tiết sản phẩm...
          </p>
        ) : errorMessage ? (
          <p className="mt-8 text-destructive">{errorMessage}</p>
        ) : product ? (
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white p-6">
              <img
                src={product.imageUrl || "/images/component-placeholder.svg"}
                alt={product.name}
                className="h-[360px] w-full rounded-xl object-contain"
              />
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Mã sản phẩm: {product.productCode}
              </p>
              <h1 className="text-3xl font-bold">{product.name}</h1>
              <p className="text-sm text-muted-foreground">
                Danh mục: {product?.category?.name}
              </p>
              <p className="text-2xl font-bold text-primary">
                {formatMoney(product.price)}
              </p>
              <p className="text-sm text-muted-foreground">
                Đánh giá trung bình: {reviewSummary.averageRating.toFixed(1)}/5
                ({reviewSummary.totalReviews} lượt)
              </p>
              <p className="text-sm">
                {Number(product.stockQuantity) > 0 ? (
                  <span className="text-emerald-600">
                    Còn hàng ({product.stockQuantity})
                  </span>
                ) : (
                  <span className="text-rose-600">Hết hàng</span>
                )}
              </p>

              <div className="space-y-2">
                <h2 className="font-semibold">Thông số chính</h2>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(product.specifications ?? {}).map(
                    ([key, value]) => (
                      <div
                        key={key}
                        className="rounded-lg border bg-secondary/40 px-3 py-2 text-sm"
                      >
                        <span className="font-medium">{key}:</span>{" "}
                        {String(value)}
                      </div>
                    ),
                  )}
                </div>
              </div>

              {product.detail && (
                <div className="space-y-3 border-t pt-4">
                  {product.detail.inTheBox && (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm">Trong hộp</h3>
                      <p className="text-sm text-muted-foreground">
                        {product.detail.inTheBox}
                      </p>
                    </div>
                  )}
                  {product.detail.warrantyPolicy && (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm">
                        Chính sách bảo hành
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {product.detail.warrantyPolicy}
                      </p>
                    </div>
                  )}
                  {product.detail.manualUrl && (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm">
                        Tài liệu kỹ thuật
                      </h3>
                      <a
                        href={product.detail.manualUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Xem hướng dẫn sử dụng →
                      </a>
                    </div>
                  )}
                </div>
              )}

              <Button
                disabled={Number(product.stockQuantity) <= 0}
                onClick={async () => {
                  try {
                    await addToCart({
                      id: product.id,
                      slug: product.slug,
                      name: product.name,
                      brand: product.specifications?.brand || "PC Perfect",
                      image:
                        product.primaryImage ||
                        "/images/component-placeholder.svg",
                      price: Number(product.price ?? 0),
                      stock: Number(product.stockQuantity ?? 0),
                    });
                  } catch (error) {
                    window.alert(
                      error instanceof Error
                        ? error.message
                        : "Không thể thêm vào giỏ hàng",
                    );
                  }
                }}
              >
                {Number(product.stockQuantity) > 0
                  ? "Thêm vào giỏ"
                  : "Hết hàng"}
              </Button>

              <Button
                variant={isWishlisted ? "default" : "outline"}
                onClick={toggleWishlist}
                disabled={isUpdatingWishlist}
              >
                {isUpdatingWishlist
                  ? "Đang cập nhật..."
                  : isWishlisted
                    ? "Đang theo dõi"
                    : "Theo dõi sản phẩm"}
              </Button>
              {wishlistMessage && (
                <p className="text-xs text-muted-foreground">
                  {wishlistMessage}
                </p>
              )}

              <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 space-y-3">
                <h2 className="text-lg font-semibold">Đánh giá sản phẩm</h2>

                {!isHydrated ? (
                  <p className="text-sm text-muted-foreground">
                    Đang kiểm tra trạng thái đăng nhập...
                  </p>
                ) : isAuthenticated && canReview ? (
                  <form className="space-y-3" onSubmit={submitReview}>
                    <div className="space-y-1">
                      <label
                        className="block text-sm font-medium"
                        htmlFor="review-rating"
                      >
                        Số sao
                      </label>
                      <select
                        id="review-rating"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={reviewRating}
                        onChange={(event) =>
                          setReviewRating(Number(event.target.value))
                        }
                      >
                        <option value={5}>5 sao</option>
                        <option value={4}>4 sao</option>
                        <option value={3}>3 sao</option>
                        <option value={2}>2 sao</option>
                        <option value={1}>1 sao</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label
                        className="block text-sm font-medium"
                        htmlFor="review-comment"
                      >
                        Nhận xét
                      </label>
                      <textarea
                        id="review-comment"
                        className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
                        value={reviewComment}
                        onChange={(event) =>
                          setReviewComment(event.target.value)
                        }
                        maxLength={1000}
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <label className="block text-sm font-medium">
                          Ảnh đánh giá
                        </label>
                        <span className="text-xs text-muted-foreground">
                          Tối đa 6 ảnh, JPG/PNG/WEBP
                        </span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        className="block w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary file:px-3 file:py-1.5 file:text-primary-foreground"
                        onChange={(event) => {
                          const files = Array.from(
                            event.target.files ?? [],
                          ).slice(0, 6);
                          setReviewImages(files);
                        }}
                      />
                      {reviewImagePreviews.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                          {reviewImagePreviews.map((item, index) => (
                            <div
                              key={`${item.file.name}-${index}`}
                              className="relative overflow-hidden rounded-xl border border-border/60 bg-secondary/20"
                            >
                              <img
                                src={item.previewUrl}
                                alt={`Ảnh đánh giá ${index + 1}`}
                                className="h-28 w-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <Button type="submit" disabled={isSubmittingReview}>
                      {isSubmittingReview ? "Đang gửi..." : "Gửi đánh giá"}
                    </Button>

                    {reviewMessage && (
                      <p className="text-sm text-emerald-600">
                        {reviewMessage}
                      </p>
                    )}
                    {reviewError && (
                      <p className="text-sm text-destructive">{reviewError}</p>
                    )}
                  </form>
                ) : isAuthenticated ? (
                  <p className="text-sm text-muted-foreground">
                    {reviewEligibilityMessage ||
                      "Bạn chỉ có thể đánh giá sau khi đơn hàng đã giao thành công."}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Vui lòng{" "}
                    <Link to="/login" className="text-primary underline">
                      đăng nhập
                    </Link>{" "}
                    để gửi đánh giá.
                  </p>
                )}

                <div className="space-y-2">
                  {reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Chưa có đánh giá nào.
                    </p>
                  ) : (
                    reviews.map((review) => (
                      <div
                        key={review.id}
                        className="rounded-lg border border-border/60 bg-background p-3"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">
                            {review?.user?.fullName ?? "Ẩn danh"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(review.createdAt)}
                          </p>
                        </div>
                        <p className="mt-1 text-sm text-amber-600">
                          {"★".repeat(Number(review.rating ?? 0))}
                        </p>
                        {review.comment && (
                          <p className="mt-2 text-sm">{review.comment}</p>
                        )}

                        {Array.isArray(review?.images) &&
                        review.images.length > 0 ? (
                          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {review.images.map((image) => (
                              <img
                                key={image.id}
                                src={image.imageUrl}
                                alt="Ảnh đánh giá"
                                className="h-24 w-full rounded-md border border-border/60 object-cover"
                              />
                            ))}
                          </div>
                        ) : null}

                        {Array.isArray(review?.thread) &&
                        review.thread.length > 0 ? (
                          <div className="mt-3 rounded-md border border-border/60 bg-secondary/30 px-3 py-2">
                            <p className="text-xs font-semibold text-muted-foreground">
                              Phản hồi từ cửa hàng & trao đổi
                            </p>
                            <div className="mt-2 space-y-2">
                              {review.thread.map((msg) => (
                                <div
                                  key={String(msg.id)}
                                  className={`rounded-md border px-3 py-2 text-sm ${
                                    msg.isStaff
                                      ? "border-sky-200 bg-sky-50"
                                      : "border-emerald-200 bg-emerald-50"
                                  }`}
                                >
                                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                    <span className="font-medium text-slate-700">
                                      {msg.isStaff
                                        ? "Nhân viên"
                                        : (review?.user?.fullName ??
                                          "Khách hàng")}
                                    </span>
                                    <span>{formatDate(msg.createdAt)}</span>
                                  </div>
                                  <p className="mt-1 text-slate-700 whitespace-pre-wrap">
                                    {String(msg.message ?? "")}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : review.adminReply ? (
                          <div className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2">
                            <p className="text-xs font-semibold text-sky-700">
                              Phản hồi từ cửa hàng
                            </p>
                            <p className="mt-1 text-sm text-slate-700">
                              {review.adminReply}
                            </p>
                            {review.adminRepliedAt ? (
                              <p className="mt-1 text-xs text-slate-500">
                                {formatDate(review.adminRepliedAt)}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Full Description Section */}
        {product?.detail?.fullDescription && (
          <div className="mt-12 rounded-2xl border border-border/50 bg-secondary/30 p-8">
            <h2 className="text-2xl font-bold mb-6">Mô tả chi tiết</h2>
            <div
              className="text-sm leading-relaxed text-foreground [&_p]:mb-3 [&_p]:last:mb-0 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
              dangerouslySetInnerHTML={{
                __html: product.detail.fullDescription,
              }}
            />
          </div>
        )}

        {Array.isArray(product?.relatedProducts) &&
          product.relatedProducts.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-4">Sản phẩm liên quan</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {product.relatedProducts.slice(0, 8).map((item) => (
                  <Link
                    key={item.id}
                    to={`/products/${item.slug}`}
                    className="rounded-xl border border-border/60 bg-background p-3 hover:shadow-md transition"
                  >
                    <img
                      src={item.imageUrl || "/images/component-placeholder.svg"}
                      alt={item.name}
                      className="h-32 w-full rounded-lg object-contain"
                    />
                    <p className="mt-2 line-clamp-2 text-sm font-medium">
                      {item.name}
                    </p>
                    <p className="mt-1 text-sm text-primary font-semibold">
                      {formatMoney(item.price)}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

        {recentlyViewed.length > 0 && (
          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-4">Đã xem gần đây</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentlyViewed.map((item) => (
                <Link
                  key={item.id}
                  to={`/products/${item.slug}`}
                  className="rounded-xl border border-border/60 bg-background p-3 hover:shadow-md transition"
                >
                  <img
                    src={item.imageUrl || "/images/component-placeholder.svg"}
                    alt={item.name}
                    className="h-32 w-full rounded-lg object-contain"
                  />
                  <p className="mt-2 line-clamp-2 text-sm font-medium">
                    {item.name}
                  </p>
                  <p className="mt-1 text-sm text-primary font-semibold">
                    {formatMoney(item.price)}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function updateRecentlyViewed(product) {
  const entry = {
    id: Number(product?.id ?? 0),
    slug: String(product?.slug ?? ""),
    name: String(product?.name ?? ""),
    imageUrl: String(product?.imageUrl ?? "/images/component-placeholder.svg"),
    price: Number(product?.price ?? 0),
  };

  if (!entry.id || !entry.slug) {
    return readRecentlyViewed();
  }

  const existing = readRecentlyViewed();
  const withoutCurrent = existing.filter(
    (item) => Number(item.id) !== entry.id,
  );
  const next = [entry, ...withoutCurrent].slice(0, 12);
  window.localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(next));
  return next;
}

function readRecentlyViewed() {
  try {
    const raw = window.localStorage.getItem(RECENTLY_VIEWED_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && item.id && item.slug).slice(0, 12)
      : [];
  } catch {
    return [];
  }
}

function formatMoney(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("vi-VN");
}

const RECENTLY_VIEWED_KEY = "techbuiltai-recently-viewed";
