import { useEffect, useState } from "react";
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
  const [reviewSummary, setReviewSummary] = useState({ totalReviews: 0, averageRating: 0 });
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

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
        }

        await loadReviews(payload?.slug || slug, () => cancelled);
      } catch (error) {
        if (!cancelled) {
          setProduct(null);
          setErrorMessage(error instanceof Error ? error.message : "Có lỗi xảy ra");
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

      const response = await fetch(`/api/products/${product.slug}/reviews`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rating: Number(reviewRating),
          comment: reviewComment.trim() || undefined,
        }),
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
      await loadReviews(product.slug);
    } catch (error) {
      setReviewError(error instanceof Error ? error.message : "Gửi đánh giá thất bại");
    } finally {
      setIsSubmittingReview(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <Link to="/components" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>

        {isLoading ? (
          <p className="mt-8 text-muted-foreground">Đang tải chi tiết sản phẩm...</p>
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
              <p className="text-sm text-muted-foreground">Mã sản phẩm: {product.productCode}</p>
              <h1 className="text-3xl font-bold">{product.name}</h1>
              <p className="text-sm text-muted-foreground">Danh mục: {product?.category?.name}</p>
              <p className="text-2xl font-bold text-primary">{formatMoney(product.price)}</p>
              <p className="text-sm text-muted-foreground">
                Đánh giá trung bình: {reviewSummary.averageRating.toFixed(1)}/5 ({reviewSummary.totalReviews} lượt)
              </p>
              <p className="text-sm">
                {Number(product.stockQuantity) > 0 ? (
                  <span className="text-emerald-600">Còn hàng ({product.stockQuantity})</span>
                ) : (
                  <span className="text-rose-600">Hết hàng</span>
                )}
              </p>

              <div className="space-y-2">
                <h2 className="font-semibold">Thông số chính</h2>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(product.specifications ?? {}).map(([key, value]) => (
                    <div key={key} className="rounded-lg border bg-secondary/40 px-3 py-2 text-sm">
                      <span className="font-medium">{key}:</span> {String(value)}
                    </div>
                  ))}
                </div>
              </div>

              {product.detail && (
                <div className="space-y-3 border-t pt-4">
                  {product.detail.inTheBox && (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm">Trong hộp</h3>
                      <p className="text-sm text-muted-foreground">{product.detail.inTheBox}</p>
                    </div>
                  )}
                  {product.detail.warrantyPolicy && (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm">Chính sách bảo hành</h3>
                      <p className="text-sm text-muted-foreground">{product.detail.warrantyPolicy}</p>
                    </div>
                  )}
                  {product.detail.manualUrl && (
                    <div>
                      <h3 className="font-semibold mb-2 text-sm">Tài liệu kỹ thuật</h3>
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
                    await addToCart({ id: product.id });
                  } catch (error) {
                    window.alert(
                      error instanceof Error
                        ? error.message
                        : "Không thể thêm vào giỏ hàng",
                    );
                  }
                }}
              >
                {Number(product.stockQuantity) > 0 ? "Thêm vào giỏ" : "Hết hàng"}
              </Button>

              <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 space-y-3">
                <h2 className="text-lg font-semibold">Đánh giá sản phẩm</h2>

                {!isHydrated ? (
                  <p className="text-sm text-muted-foreground">Đang kiểm tra trạng thái đăng nhập...</p>
                ) : isAuthenticated ? (
                  <form className="space-y-3" onSubmit={submitReview}>
                    <div className="space-y-1">
                      <label className="block text-sm font-medium" htmlFor="review-rating">
                        Số sao
                      </label>
                      <select
                        id="review-rating"
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        value={reviewRating}
                        onChange={(event) => setReviewRating(Number(event.target.value))}
                      >
                        <option value={5}>5 sao</option>
                        <option value={4}>4 sao</option>
                        <option value={3}>3 sao</option>
                        <option value={2}>2 sao</option>
                        <option value={1}>1 sao</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-sm font-medium" htmlFor="review-comment">
                        Nhận xét
                      </label>
                      <textarea
                        id="review-comment"
                        className="min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm..."
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                        maxLength={1000}
                      />
                    </div>

                    <Button type="submit" disabled={isSubmittingReview}>
                      {isSubmittingReview ? "Đang gửi..." : "Gửi đánh giá"}
                    </Button>

                    {reviewMessage && <p className="text-sm text-emerald-600">{reviewMessage}</p>}
                    {reviewError && <p className="text-sm text-destructive">{reviewError}</p>}
                  </form>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Vui lòng <Link to="/login" className="text-primary underline">đăng nhập</Link> để gửi đánh giá.
                  </p>
                )}

                <div className="space-y-2">
                  {reviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Chưa có đánh giá nào.</p>
                  ) : (
                    reviews.map((review) => (
                      <div key={review.id} className="rounded-lg border border-border/60 bg-background p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">{review?.user?.fullName ?? "Ẩn danh"}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(review.createdAt)}</p>
                        </div>
                        <p className="mt-1 text-sm text-amber-600">{"★".repeat(Number(review.rating ?? 0))}</p>
                        {review.comment && <p className="mt-2 text-sm">{review.comment}</p>}
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
              dangerouslySetInnerHTML={{ __html: product.detail.fullDescription }}
            />
          </div>
        )}
      </main>
    </div>
  );
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
