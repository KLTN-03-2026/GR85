import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Star } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { useFavorite } from "@/client/features/favorite/context/FavoriteContext";

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const { token, isAuthenticated, isHydrated } = useAuth();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ totalReviews: 0, averageRating: 0, ratingBreakdown: [] });
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewImages, setReviewImages] = useState([]);
  const [reviewImagePreviews, setReviewImagePreviews] = useState([]);
  const [reviewError, setReviewError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewStarFilter, setReviewStarFilter] = useState("all");
  const [expandedReviewThreads, setExpandedReviewThreads] = useState({});
  const [canReview, setCanReview] = useState(false);
  const [reviewEligibilityMessage, setReviewEligibilityMessage] = useState("");
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const { isFavorite, toggleFavorite } = useFavorite();
  const isWishlisted = product ? isFavorite(product.id) : false;
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
        ratingBreakdown: Array.isArray(payload?.summary?.ratingBreakdown)
          ? payload.summary.ratingBreakdown
          : [],
      });
    } catch {
      if (isCancelled()) {
        return;
      }

      setReviews([]);
      setReviewSummary({ totalReviews: 0, averageRating: 0, ratingBreakdown: [] });
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
          setReviewSummary({ totalReviews: 0, averageRating: 0, ratingBreakdown: [] });
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

  async function handleToggleWishlist() {
    setWishlistMessage("");

    if (!isHydrated || !isAuthenticated) {
      setWishlistMessage("Vui lòng đăng nhập để dùng wishlist");
      return;
    }

    if (!product?.id) {
      return;
    }

    try {
      setIsUpdatingWishlist(true);
      const success = await toggleFavorite(product.id);
      if (!success) {
        throw new Error("Không thể cập nhật wishlist");
      }
      setWishlistMessage(
        !isWishlisted ? "Đã thêm vào wishlist" : "Đã bỏ khỏi wishlist",
      );
    } catch (error) {
      setWishlistMessage(
        error instanceof Error ? error.message : "Không thể cập nhật wishlist",
      );
    } finally {
      setIsUpdatingWishlist(false);
      setTimeout(() => setWishlistMessage(""), 3000);
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

  const reviewStarCounts = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const item of reviews) {
      const rating = Number(item?.rating ?? 0);
      if (rating >= 1 && rating <= 5) {
        counts[rating] += 1;
      }
    }
    return counts;
  }, [reviews]);

  const filteredReviews = useMemo(() => {
    if (reviewStarFilter === "all") {
      return reviews;
    }

    const target = Number(reviewStarFilter);
    if (!Number.isFinite(target)) {
      return reviews;
    }

    return reviews.filter((item) => Number(item?.rating ?? 0) === target);
  }, [reviewStarFilter, reviews]);

  function toggleReviewThread(reviewId) {
    setExpandedReviewThreads((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
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
                onClick={handleToggleWishlist}
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

              <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 space-y-4">
                <h2 className="text-lg font-semibold">Đánh giá sản phẩm</h2>

                <div className="grid gap-3 rounded-xl border border-border/60 bg-background p-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Điểm trung bình</p>
                    <p className="text-2xl font-bold text-primary">
                      {reviewSummary.averageRating.toFixed(1)}/5
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {reviewSummary.totalReviews} lượt đánh giá
                    </p>
                  </div>
                  <div className="space-y-2">
                    {(reviewSummary.ratingBreakdown ?? []).map((item) => (
                      <button
                        key={`rating-${item.rating}`}
                        type="button"
                        className={`flex w-full items-center gap-3 rounded-lg px-2 py-1 text-left text-sm transition ${reviewStarFilter === String(item.rating) ? "bg-primary/10" : "hover:bg-muted/60"}`}
                        onClick={() => setReviewStarFilter(String(item.rating))}
                      >
                        <span className="w-10 font-medium">{item.rating}★</span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${item.percent ?? 0}%` }}
                          />
                        </div>
                        <span className="w-12 text-right text-xs text-muted-foreground">{item.percent ?? 0}%</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={reviewStarFilter === "all" ? "default" : "outline"}
                    onClick={() => setReviewStarFilter("all")}
                  >
                    Tất cả
                  </Button>
                  {[5, 4, 3, 2, 1].map((rating) => (
                    <Button
                      key={`rating-filter-${rating}`}
                      type="button"
                      size="sm"
                      variant={reviewStarFilter === String(rating) ? "default" : "outline"}
                      onClick={() => setReviewStarFilter(String(rating))}
                    >
                      {rating} sao
                    </Button>
                  ))}
                </div>

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
                  <div className="rounded-xl border border-border/60 bg-secondary/20 p-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        { id: "all", label: "Tất cả", count: reviews.length },
                        { id: "5", label: "5 sao", count: reviewStarCounts[5] },
                        { id: "4", label: "4 sao", count: reviewStarCounts[4] },
                        { id: "3", label: "3 sao", count: reviewStarCounts[3] },
                        { id: "2", label: "2 sao", count: reviewStarCounts[2] },
                        { id: "1", label: "1 sao", count: reviewStarCounts[1] },
                      ].map((filterOption) => {
                        const isActive = reviewStarFilter === filterOption.id;
                        return (
                          <button
                            key={`review-star-filter-${filterOption.id}`}
                            type="button"
                            onClick={() => setReviewStarFilter(filterOption.id)}
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                              isActive
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-border bg-background text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {filterOption.id !== "all" ? (
                              <Star
                                className={`h-3.5 w-3.5 ${
                                  isActive
                                    ? "fill-amber-400 text-amber-500"
                                    : "text-amber-500"
                                }`}
                              />
                            ) : null}
                            <span>{filterOption.label}</span>
                            <span
                              className={`rounded-full px-1.5 py-0.5 text-[11px] ${
                                isActive
                                  ? "bg-primary/20 text-primary"
                                  : "bg-secondary/80 text-muted-foreground"
                              }`}
                            >
                              {filterOption.count}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Chưa có đánh giá nào.
                    </p>
                  ) : filteredReviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Không có đánh giá nào phù hợp với bộ lọc sao đã chọn.
                    </p>
                  ) : (
                    filteredReviews.map((review) => {
                      const thread = Array.isArray(review?.thread)
                        ? review.thread
                        : [];
                      const firstStaffReply =
                        thread.find((msg) => Boolean(msg?.isStaff)) ?? null;
                      const firstStaffReplyId =
                        firstStaffReply?.id !== undefined &&
                        firstStaffReply?.id !== null
                          ? String(firstStaffReply.id)
                          : null;
                      const expandableThread = firstStaffReplyId
                        ? thread.filter(
                            (msg) => String(msg?.id) !== firstStaffReplyId,
                          )
                        : thread;
                      const isExpanded = Boolean(
                        expandedReviewThreads[review.id],
                      );
                      const hiddenThreadCount = expandableThread.length;

                      return (
                        <div
                          key={review.id}
                          className="rounded-lg border border-border/60 bg-background p-3"
                        >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">{review?.user?.fullName ?? "Ẩn danh"}</p>
                          <p className="text-xs text-muted-foreground">{formatRelativeTime(review.createdAt)}</p>
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

                        {firstStaffReply ? (
                          <div className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2">
                            <p className="text-xs font-semibold text-sky-700">
                              Phản hồi đầu tiên từ cửa hàng
                            </p>
                            <p className="mt-1 text-sm text-slate-700 whitespace-pre-wrap">
                              {String(firstStaffReply.message ?? "")}
                            </p>
                            {firstStaffReply.createdAt ? (
                              <p className="mt-1 text-xs text-slate-500">
                                {formatDate(firstStaffReply.createdAt)}
                              </p>
                            ) : null}
                          </div>
                        ) : review.adminReply ? (
                          <div className="mt-3 rounded-md border border-sky-200 bg-sky-50 px-3 py-2">
                            <p className="text-xs font-semibold text-sky-700">
                              Phản hồi đầu tiên từ cửa hàng
                            </p>
                            <p className="mt-1 text-sm text-slate-700">
                              {review.adminReply}
                            </p>
                            {review.adminRepliedAt ? (
                              <p className="mt-1 text-xs text-slate-500">{formatDate(review.adminRepliedAt)}</p>
                            ) : null}
                          </div>
                        ) : null}

                        {hiddenThreadCount > 0 ? (
                          <div className="mt-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => toggleReviewThread(review.id)}
                            >
                              {isExpanded
                                ? "Ẩn bớt hội thoại"
                                : `Xem thêm hội thoại (${hiddenThreadCount})`}
                            </Button>
                          </div>
                        ) : null}

                        {isExpanded && expandableThread.length > 0 ? (
                          <div className="mt-3 rounded-md border border-border/60 bg-secondary/30 px-3 py-2">
                            <p className="text-xs font-semibold text-muted-foreground">
                              Hội thoại chi tiết
                            </p>
                            <div className="mt-2 space-y-2">
                              {expandableThread.map((msg) => (
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
                        ) : null}
                      </div>
                      );
                    })
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

function formatRelativeTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const diffSeconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  const units = [
    [60, "giây"],
    [60, "phút"],
    [24, "giờ"],
    [7, "ngày"],
    [4.345, "tuần"],
    [12, "tháng"],
  ];

  let valueCount = diffSeconds;
  let unitLabel = "giây";

  for (const [threshold, label] of units) {
    unitLabel = label;
    if (valueCount < threshold) {
      break;
    }
    valueCount = Math.floor(valueCount / threshold);
  }

  if (unitLabel === "giây") {
    return `${valueCount} giây trước`;
  }

  return `${valueCount} ${unitLabel} trước`;
}

const RECENTLY_VIEWED_KEY = "techbuiltai-recently-viewed";
