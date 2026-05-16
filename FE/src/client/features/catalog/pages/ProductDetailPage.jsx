import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft, Heart, History, Loader2, MessageSquare, Shield,
  ShoppingCart, Star, Trophy, CheckCircle2, ChevronRight,
  Maximize2, Share2, Info, Box, Camera, X, Edit2, Trash2
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { FavoriteProvider, useFavorite } from "@/client/features/favorite/context/FavoriteContext";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const { token, isAuthenticated, isHydrated, user } = useAuth();
  const { toast } = useToast();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reviews, setReviews] = useState([]);
  const [reviewSummary, setReviewSummary] = useState({ totalReviews: 0, averageRating: 0, ratingBreakdown: [] });
  const [activeImage, setActiveImage] = useState("");

  // Review states
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewImages, setReviewImages] = useState([]);
  const [reviewImagePreviews, setReviewImagePreviews] = useState([]);
  const [reviewError, setReviewError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [reviewStarFilter, setReviewStarFilter] = useState("all");
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [existingImageUrls, setExistingImageUrls] = useState([]);

  const [canReview, setCanReview] = useState(false);
  const [reviewEligibilityMessage, setReviewEligibilityMessage] = useState("");
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const { isFavorite, toggleFavorite } = useFavorite();
  const isWishlisted = product ? isFavorite(product.id) : false;
  const [isUpdatingWishlist, setIsUpdatingWishlist] = useState(false);
  const [wishlistMessage, setWishlistMessage] = useState("");
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reviewIdToDelete, setReviewIdToDelete] = useState(null);

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
            headers: { Authorization: `Bearer ${authToken}` },
          },
        );

        const payload = await response.json().catch(() => ({}));
        if (isCancelled()) return;

        setCanReview(Boolean(payload?.canReview));
        setReviewEligibilityMessage(String(payload?.reason ?? ""));
      } catch {
        if (isCancelled()) return;
        setCanReview(false);
        setReviewEligibilityMessage("Không thể kiểm tra quyền đánh giá lúc này");
      }
    },
    [isAuthenticated],
  );

  const loadReviews = async (productSlug, isCancelled = () => false) => {
    try {
      const response = await fetch(`/api/products/${productSlug}/reviews`);
      if (!response.ok) throw new Error("Không tải được đánh giá sản phẩm");

      const payload = await response.json();
      if (isCancelled()) return;

      setReviews(Array.isArray(payload?.items) ? payload.items : []);
      setReviewSummary({
        totalReviews: Number(payload?.summary?.totalReviews ?? 0),
        averageRating: Number(payload?.summary?.averageRating ?? 0),
        ratingBreakdown: Array.isArray(payload?.summary?.ratingBreakdown)
          ? payload.summary.ratingBreakdown
          : [],
      });
    } catch {
      if (isCancelled()) return;
      setReviews([]);
      setReviewSummary({ totalReviews: 0, averageRating: 0, ratingBreakdown: [] });
    }
  };

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(`/api/products/${slug}`);
        if (!response.ok) throw new Error("Không tải được chi tiết sản phẩm");

        const payload = await response.json();
        if (!cancelled) {
          setProduct(payload);
          setActiveImage(payload.imageUrl);
          const recentItems = updateRecentlyViewed(payload);
          setRecentlyViewed(recentItems);
        }

        await loadReviews(payload?.slug || slug, () => cancelled);
      } catch (error) {
        if (!cancelled) {
          setProduct(null);
          setErrorMessage(error instanceof Error ? error.message : "Có lỗi xảy ra");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    if (slug) loadDetail();
    return () => { cancelled = true; };
  }, [slug]);

  // Listen for realtime notifications and refresh reviews when someone replies to a review
  useEffect(() => {
    const handler = (e) => {
      try {
        const ntf = e?.detail;
        if (!ntf || !ntf.payload) return;

        const kind = ntf.payload.kind || ntf.payload?.kind;
        if (String(kind).toUpperCase() !== "REVIEW_REPLY") return;

        const prodSlug = String(ntf.payload.productSlug ?? "").trim();
        const prodId = Number(ntf.payload.productId ?? 0);

        if (!product) return;

        if ((prodSlug && product.slug === prodSlug) || (prodId && product.id === prodId)) {
          // Refresh reviews and scroll to reviews section
          loadReviews(product.slug);
          try {
            const el = document.getElementById("reviews");
            if (el) el.scrollIntoView({ behavior: "smooth" });
          } catch { }

          try {
            toast({ title: "Phản hồi đánh giá", description: "Nhân viên vừa phản hồi đánh giá của bạn." });
          } catch { }
        }
      } catch { }
    };

    window.addEventListener("app:notification", handler);
    return () => window.removeEventListener("app:notification", handler);
  }, [product]);

  useEffect(() => {
    let cancelled = false;
    if (isHydrated && product?.slug) {
      refreshReviewEligibility(product.slug, token, () => cancelled);
    }
    return () => { cancelled = true; };
  }, [product?.slug, token, isHydrated, refreshReviewEligibility]);

  async function handleToggleWishlist() {
    if (!isHydrated || !isAuthenticated) {
      setWishlistMessage("Vui lòng đăng nhập để dùng wishlist");
      return;
    }
    if (!product?.id) return;

    try {
      setIsUpdatingWishlist(true);
      await toggleFavorite(product.id);
      setWishlistMessage(!isWishlisted ? "Đã thêm vào wishlist" : "Đã bỏ khỏi wishlist");
    } catch (error) {
      setWishlistMessage("Lỗi cập nhật wishlist");
    } finally {
      setIsUpdatingWishlist(false);
      setTimeout(() => setWishlistMessage(""), 3000);
    }
  }

  const galleryImages = useMemo(() => {
    if (!product) return [];
    const images = [product.imageUrl];
    if (Array.isArray(product.images)) {
      product.images.forEach(img => {
        const url = typeof img === 'string' ? img : img.imageUrl;
        if (url && url !== product.imageUrl) images.push(url);
      });
    }
    return images;
  }, [product]);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + reviewImages.length > 6) {
      setReviewError("Tối đa 6 ảnh cho mỗi đánh giá");
      return;
    }

    setReviewImages((prev) => [...prev, ...files]);

    const newPreviews = files.map((file) => URL.createObjectURL(file));
    setReviewImagePreviews((prev) => [...prev, ...newPreviews]);
  };

  const removeReviewImage = (index) => {
    setReviewImages((prev) => prev.filter((_, i) => i !== index));
    setReviewImagePreviews((prev) => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSendReview = async () => {
    if (!isAuthenticated || !token) {
      setReviewError("Vui lòng đăng nhập để gửi đánh giá");
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError("Vui lòng chọn số sao đánh giá");
      return;
    }

    try {
      setIsSubmittingReview(true);
      setReviewError("");
      setReviewMessage("");

      const formData = new FormData();
      formData.append("rating", String(reviewRating));
      formData.append("comment", reviewComment);
      reviewImages.forEach((file) => {
        formData.append("images", file);
      });

      const response = await fetch(`/api/products/${slug}/reviews`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Không thể gửi đánh giá");
      }

      setReviewMessage("Cảm ơn bạn đã đánh giá sản phẩm!");
      setReviewComment("");
      setReviewRating(5);
      setReviewImages([]);
      setReviewImagePreviews([]);

      // Refresh reviews and eligibility
      loadReviews(slug);
      refreshReviewEligibility(slug, token);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleOpenReview = () => {
    if (!isAuthenticated) {
      setReviewError("Vui lòng đăng nhập để gửi đánh giá");
      return;
    }

    if (!canReview) {
      alert(reviewEligibilityMessage || "Bạn chưa đủ điều kiện để đánh giá");
      return;
    }

    const el = document.getElementById("reviews");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleEditReview = (review) => {
    setEditingReviewId(review.id);
    setReviewRating(review.rating);
    setReviewComment(review.comment);
    setExistingImageUrls(Array.isArray(review.images) ? review.images.map(img => img.imageUrl || img) : []);
    setReviewImages([]);
    setReviewImagePreviews([]);
    setReviewError("");
    setReviewMessage("");

    const el = document.getElementById("reviews");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setReviewRating(5);
    setReviewComment("");
    setReviewImages([]);
    setReviewImagePreviews([]);
    setExistingImageUrls([]);
    setReviewError("");
    setReviewMessage("");
  };

  const handleSaveEditReview = async () => {
    if (!isAuthenticated || !token || !editingReviewId) {
      setReviewError("Vui lòng đăng nhập");
      return;
    }

    if (reviewRating < 1 || reviewRating > 5) {
      setReviewError("Vui lòng chọn số sao đánh giá");
      return;
    }

    try {
      setIsSubmittingReview(true);
      setReviewError("");
      setReviewMessage("");

      const formData = new FormData();
      formData.append("rating", String(reviewRating));
      formData.append("comment", reviewComment);
      reviewImages.forEach((file) => {
        formData.append("images", file);
      });

      // Send existing image URLs
      existingImageUrls.forEach((url) => {
        formData.append("reviewImageUrls", url);
      });

      const response = await fetch(`/api/products/${slug}/reviews/${editingReviewId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Không thể cập nhật đánh giá");
      }

      setReviewMessage("Đánh giá đã được cập nhật!");
      handleCancelEdit();

      // Refresh reviews and eligibility
      loadReviews(slug);
      refreshReviewEligibility(slug, token);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!isAuthenticated || !token) {
      setReviewError("Vui lòng đăng nhập");
      return;
    }

    setReviewIdToDelete(reviewId);
    setDeleteConfirmOpen(true);
  };

  const confirmDeleteReview = async () => {
    if (!reviewIdToDelete) return;

    try {
      const response = await fetch(`/api/products/${slug}/reviews/${reviewIdToDelete}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.message || "Không thể xóa đánh giá");
      }

      toast({
        title: "Thành công",
        description: "Đánh giá đã được xóa",
      });

      // Refresh reviews and eligibility
      loadReviews(slug);
      refreshReviewEligibility(slug, token);
    } catch (err) {
      toast({
        title: "Lỗi",
        description: err instanceof Error ? err.message : "Có lỗi xảy ra",
        variant: "destructive",
      });
    } finally {
      setDeleteConfirmOpen(false);
      setReviewIdToDelete(null);
    }
  };

  const removeExistingImage = (index) => {
    setExistingImageUrls((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-950">
      <Navbar />

      {/* Dynamic Breadcrumb */}
      <div className="bg-white/50 backdrop-blur-md border-b sticky top-0 z-40 transition-all duration-300">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-primary">Trang chủ</Link>
            <ChevronRight className="w-4 h-4 text-slate-300" />
            <Link to="/components" className="text-muted-foreground hover:text-primary">Linh kiện</Link>
            <ChevronRight className="w-4 h-4 text-slate-300" />
            <span className="font-medium text-slate-900 truncate max-w-[200px] md:max-w-md">
              {product?.name || "Đang tải..."}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-full">
              <Share2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <main className="container mx-auto px-4 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-slate-500 font-medium">Đang chuẩn bị dữ liệu sản phẩm...</p>
          </div>
        ) : errorMessage ? (
          <div className="max-w-md mx-auto mt-20 text-center p-8 rounded-2xl bg-white border shadow-sm">
            <Info className="w-12 h-12 text-rose-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Rất tiếc!</h2>
            <p className="text-slate-500 mb-6">{errorMessage}</p>
            <Button asChild className="w-full">
              <Link to="/components">Quay lại cửa hàng</Link>
            </Button>
          </div>
        ) : product ? (
          <div className="space-y-12">
            {/* Top Product Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">

              {/* Image Gallery Column */}
              <div className="lg:col-span-7 space-y-4">
                <div className="relative aspect-square md:aspect-[4/3] rounded-[32px] border bg-white shadow-sm overflow-hidden group">
                  <div className="absolute top-4 left-4 z-10 flex flex-col gap-2">
                    <Badge className="bg-primary/90 backdrop-blur-md px-3 py-1 text-[11px] uppercase tracking-wider font-bold shadow-lg">
                      {product.category?.name}
                    </Badge>
                    {Number(product.stockQuantity) < 5 && Number(product.stockQuantity) > 0 && (
                      <Badge variant="destructive" className="animate-pulse">Sắp hết hàng</Badge>
                    )}
                  </div>

                  <img
                    src={activeImage || "/images/component-placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-contain p-8 md:p-12 transition-all duration-700 group-hover:scale-105"
                    loading="lazy"
                    onError={(e) => {
                      if (e.currentTarget.src !== "/images/component-placeholder.svg") {
                        e.currentTarget.src = "/images/component-placeholder.svg";
                      }
                    }}
                  />

                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button size="icon" variant="glass" className="rounded-full shadow-lg">
                      <Maximize2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Thumbnails */}
                {galleryImages.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {galleryImages.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveImage(img)}
                        className={`relative w-20 h-20 rounded-2xl border-2 transition-all overflow-hidden bg-white flex-shrink-0 ${activeImage === img ? "border-primary shadow-md scale-105" : "border-slate-100 opacity-70 hover:opacity-100"
                          }`}
                      >
                        <img
                          src={img}
                          className="w-full h-full object-cover p-2"
                          alt={`Gallery ${idx}`}
                          loading="lazy"
                          onError={(e) => {
                            if (e.currentTarget.src !== "/images/component-placeholder.svg") {
                              e.currentTarget.src = "/images/component-placeholder.svg";
                            }
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Product Info Column */}
              <div className="lg:col-span-5 flex flex-col h-full">
                <div className="flex-1 space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 text-xs font-bold text-muted-foreground uppercase tracking-widest">
                      <span>{product.specifications?.brand || "CHÍNH HÃNG"}</span>
                      <span className="w-1 h-1 rounded-full bg-slate-300" />
                      <span>SKU: {product.productCode}</span>
                    </div>

                    <h1 className="text-3xl md:text-4xl font-black text-slate-900 leading-tight">
                      {product.name}
                    </h1>

                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-1.5">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star
                              key={s}
                              className={`w-4 h-4 ${s <= Math.round(reviewSummary.averageRating) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
                            />
                          ))}
                        </div>
                        <span className="text-sm font-bold text-slate-900">{reviewSummary.averageRating.toFixed(1)}</span>
                        <span className="text-xs text-muted-foreground">({reviewSummary.totalReviews} đánh giá)</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className={`h-2 w-2 rounded-full ${Number(product.stockQuantity) > 0 ? "bg-emerald-500" : "bg-rose-500"}`} />
                        <span className={`text-sm font-bold ${Number(product.stockQuantity) > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {Number(product.stockQuantity) > 0 ? `Còn hàng (${product.stockQuantity})` : "Tạm hết hàng"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Price Section */}
                  <div className="p-8 rounded-[32px] bg-slate-900 text-white shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-6 opacity-10 transition-opacity group-hover:opacity-20">
                      <Trophy className="w-24 h-24" />
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Giá tốt hôm nay</p>
                    <div className="flex items-baseline gap-3">
                      <span className="text-4xl font-black tracking-tight">{formatMoney(product.price)}</span>
                      <span className="text-sm text-slate-400 line-through">
                        {formatMoney(Number(product.price) * 1.15)}
                      </span>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-xs text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Bao gồm VAT, bảo hành {product.warrantyMonths} tháng
                    </div>
                  </div>

                  {/* Specification Quick View */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Thông số nổi bật
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {Object.entries(product.specifications || {}).slice(0, 4).map(([k, v]) => (
                        <div key={k} className="p-4 rounded-2xl border bg-white flex flex-col gap-1 transition-all hover:border-primary/30">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase">{k}</span>
                          <span className="text-sm font-bold text-slate-800 truncate">{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Fixed Bottom Action Bar (Mobile ready) */}
                <div className="mt-12 flex gap-4">
                  <Button
                    size="lg"
                    variant="ghost"
                    className="h-16 w-16 rounded-2xl border-2"
                    onClick={handleOpenReview}
                  >
                    <MessageSquare className="w-6 h-6 text-slate-600" />
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1 h-16 rounded-2xl bg-primary hover:bg-primary/90 text-lg font-black shadow-lg shadow-primary/20 transition-all hover:-translate-y-1 active:scale-95"
                    disabled={Number(product.stockQuantity) <= 0}
                    onClick={() => addToCart(product)}
                  >
                    <ShoppingCart className="w-6 h-6 mr-3" />
                    {Number(product.stockQuantity) > 0 ? "THÊM VÀO GIỎ HÀNG" : "HẾT HÀNG"}
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    className={`h-16 w-16 rounded-2xl border-2 transition-all ${isWishlisted ? "bg-rose-50 border-rose-200" : "hover:border-primary"}`}
                    onClick={handleToggleWishlist}
                    disabled={isUpdatingWishlist}
                  >
                    <Heart className={`w-6 h-6 ${isWishlisted ? "fill-rose-500 text-rose-500" : "text-slate-400"}`} />
                  </Button>
                </div>
              </div>
            </div>

            {/* Detailed Info & Reviews */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 border-t pt-16">

              <div className="lg:col-span-8 space-y-16">

                {/* Description Section */}
                <section className="space-y-8">
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black text-slate-900">Chi tiết sản phẩm</h2>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>

                  {product.detail?.inTheBox && (
                    <div className="p-6 rounded-[24px] bg-indigo-50/50 border border-indigo-100 flex gap-4">
                      <Box className="w-6 h-6 text-indigo-500 shrink-0" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Trong hộp có gì?</p>
                        <p className="text-slate-700 text-sm leading-relaxed">{product.detail.inTheBox}</p>
                      </div>
                    </div>
                  )}

                  <div className="prose prose-slate prose-lg max-w-none">
                    {product.detail?.fullDescription ? (
                      <div
                        className="rich-text-content"
                        dangerouslySetInnerHTML={{ __html: product.detail.fullDescription }}
                      />
                    ) : (
                      <p className="text-slate-400 italic">Mô tả sản phẩm đang được cập nhật...</p>
                    )}
                  </div>
                </section>

                {/* Technical Specifications Section */}
                <section className="space-y-8">
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-black text-slate-900">Thông số đầy đủ</h2>
                    <div className="h-px flex-1 bg-slate-100" />
                  </div>
                  <div className="overflow-hidden rounded-[32px] border bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                      <tbody className="divide-y">
                        {Object.entries(product.specifications || {}).map(([k, v]) => (
                          <tr key={k} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-8 py-5 font-bold text-slate-500 uppercase tracking-wider w-1/3 bg-slate-50/50">{k}</td>
                            <td className="px-8 py-5 text-slate-800 font-medium">{String(v)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                {/* Review Section */}
                <section id="reviews" className="space-y-10">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-black text-slate-900">Đánh giá thực tế</h2>
                    <Badge variant="outline" className="px-4 py-1.5 rounded-full font-bold">
                      {reviewSummary.totalReviews} Đánh giá
                    </Badge>
                  </div>

                  {/* Add/Edit Review Form - Only if eligible or editing */}
                  {(canReview || editingReviewId) && (
                    <div className="p-8 rounded-[40px] bg-white border border-primary/20 shadow-xl shadow-primary/5 space-y-6">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                            <Star className="w-5 h-5 fill-primary" />
                          </div>
                          <div>
                            <h3 className="text-xl font-black text-slate-900">
                              {editingReviewId ? "Chỉnh sửa đánh giá" : "Gửi đánh giá của bạn"}
                            </h3>
                            <p className="text-sm text-slate-500 font-medium">
                              {editingReviewId ? "Cập nhật đánh giá của bạn" : "Chia sẻ trải nghiệm của bạn về sản phẩm này"}
                            </p>
                          </div>
                        </div>
                        {editingReviewId && (
                          <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                            Hủy
                          </Button>
                        )}
                      </div>

                      <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                          <Label className="text-sm font-bold text-slate-700">Chất lượng sản phẩm</Label>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                type="button"
                                onClick={() => setReviewRating(star)}
                                className="transition-transform active:scale-90"
                              >
                                <Star
                                  className={`w-8 h-8 ${star <= reviewRating
                                    ? "fill-amber-400 text-amber-400"
                                    : "text-slate-200"
                                    }`}
                                />
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <Label className="text-sm font-bold text-slate-700">Nhận xét chi tiết</Label>
                          <Textarea
                            placeholder="Sản phẩm dùng rất tốt, đóng gói cẩn thận..."
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            className="min-h-[120px] rounded-2xl border-slate-200 focus:border-primary resize-none"
                          />
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-bold text-slate-700">Hình ảnh thực tế (Tối đa 6)</Label>
                          <div className="flex flex-wrap gap-3">
                            {existingImageUrls.map((url, idx) => (
                              <div key={`existing-${idx}`} className="relative w-20 h-20 rounded-xl overflow-hidden border border-emerald-200 bg-emerald-50">
                                <img src={url} className="w-full h-full object-cover" alt="Existing" />
                                <button
                                  onClick={() => removeExistingImage(idx)}
                                  className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-1 shadow-lg hover:bg-rose-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                                <span className="absolute bottom-1 left-1 text-xs bg-emerald-600 text-white px-1 rounded">Cũ</span>
                              </div>
                            ))}
                            {reviewImagePreviews.map((url, idx) => (
                              <div key={`new-${idx}`} className="relative w-20 h-20 rounded-xl overflow-hidden border bg-slate-50">
                                <img src={url} className="w-full h-full object-cover" alt="Preview" />
                                <button
                                  onClick={() => removeReviewImage(idx)}
                                  className="absolute top-1 right-1 bg-rose-500 text-white rounded-full p-1 shadow-lg hover:bg-rose-600"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                            {reviewImages.length + existingImageUrls.length < 6 && (
                              <label className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-primary hover:bg-primary/5 transition-all">
                                <Camera className="w-6 h-6 text-slate-400" />
                                <input
                                  type="file"
                                  multiple
                                  accept="image/*"
                                  className="hidden"
                                  onChange={handleFileChange}
                                />
                              </label>
                            )}
                          </div>
                        </div>

                        {reviewError && (
                          <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-sm font-medium">
                            {reviewError}
                          </div>
                        )}

                        {reviewMessage && (
                          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm font-medium">
                            {reviewMessage}
                          </div>
                        )}

                        <Button
                          onClick={editingReviewId ? handleSaveEditReview : handleSendReview}
                          disabled={isSubmittingReview}
                          className="w-full h-14 rounded-2xl font-black text-lg gap-2 shadow-lg shadow-primary/20"
                        >
                          {isSubmittingReview ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            editingReviewId ? "CẬP NHẬT ĐÁNH GIÁ" : "GỬI ĐÁNH GIÁ NGAY"
                          )}
                        </Button>
                      </div>
                    </div>
                  )}

                  {!canReview && isAuthenticated && (
                    <div className="p-6 rounded-[24px] bg-slate-100 border border-slate-200 text-center space-y-2">
                      <Info className="w-8 h-8 text-slate-400 mx-auto" />
                      <p className="text-sm font-bold text-slate-600">
                        {reviewEligibilityMessage || "Bạn cần mua sản phẩm này để có thể đánh giá."}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8 p-10 rounded-[40px] bg-white border shadow-sm items-center">
                    <div className="text-center space-y-2">
                      <p className="text-6xl font-black text-slate-900 tracking-tighter">
                        {reviewSummary.averageRating.toFixed(1)}
                      </p>
                      <div className="flex justify-center mb-2">
                        {[1, 2, 3, 4, 5].map(s => (
                          <Star
                            key={s}
                            className={`w-5 h-5 ${s <= Math.round(reviewSummary.averageRating) ? "fill-amber-400 text-amber-400" : "text-slate-100"}`}
                          />
                        ))}
                      </div>
                      <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Trung bình cộng</p>
                    </div>

                    <div className="md:col-span-2 space-y-3">
                      {(reviewSummary.ratingBreakdown ?? []).sort((a, b) => b.rating - a.rating).map(item => (
                        <div key={item.rating} className="flex items-center gap-4 group">
                          <span className="text-xs font-black text-slate-500 w-8">{item.rating} <Star className="inline w-3 h-3 mb-1" /></span>
                          <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden shadow-inner">
                            <div
                              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-1000 group-hover:brightness-110"
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold text-slate-400 w-10 text-right">{item.percent}%</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Reviews List */}
                  <div className="space-y-8">
                    {reviews.length === 0 ? (
                      <div className="text-center py-12 rounded-[32px] border border-dashed border-slate-200">
                        <MessageSquare className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                        <p className="text-slate-400 font-medium">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
                      </div>
                    ) : (
                      <div className="grid gap-6">
                        {reviews.map(review => {
                          const isOwnReview = user && review.user?.id === user.id;
                          return (
                            <div key={review.id} className="p-8 rounded-[32px] bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4 flex-1">
                                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg shrink-0">
                                    {review.user?.fullName?.[0]?.toUpperCase() || "?"}
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-black text-slate-900">{review.user?.fullName || "Khách hàng"}</p>
                                    <p className="text-xs text-slate-400 font-medium">{formatRelativeTime(review.createdAt)}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map(s => (
                                      <Star key={s} className={`w-3 h-3 ${s <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-100"}`} />
                                    ))}
                                  </div>
                                  {isOwnReview && (
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleEditReview(review)}
                                        className="text-primary hover:bg-primary/10"
                                      >
                                        <Edit2 className="w-4 h-4" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => handleDeleteReview(review.id)}
                                        className="text-destructive hover:bg-destructive/10"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <p className="text-slate-600 leading-relaxed font-medium">{review.comment}</p>
                              {Array.isArray(review.images) && review.images.length > 0 && (
                                <div className="mt-4 flex flex-wrap gap-3">
                                  {review.images.map((image, idx) => (
                                    <img
                                      key={idx}
                                      src={image.imageUrl || image}
                                      alt={`Review ${idx + 1}`}
                                      className="h-20 w-20 rounded-lg object-cover border"
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>
              </div>

              {/* Sidebar Column */}
              <div className="lg:col-span-4 space-y-8">

                {/* Shipping & Policies */}
                <div className="p-8 rounded-[32px] bg-white border shadow-sm space-y-8">
                  <h3 className="text-lg font-black text-slate-900">Cam kết dịch vụ</h3>
                  <div className="space-y-6">
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 flex items-center justify-center shrink-0">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-900">Bảo hành chính hãng</p>
                        <p className="text-xs text-slate-500 leading-relaxed">Hỗ trợ đổi trả trong 7 ngày nếu có lỗi NSX.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                        <Trophy className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-900">Miễn phí lắp đặt</p>
                        <p className="text-xs text-slate-500 leading-relaxed">Tư vấn và lắp ráp PC chuyên nghiệp hoàn toàn miễn phí.</p>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
                        <History className="w-5 h-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-900">Giao hàng hỏa tốc</p>
                        <p className="text-xs text-slate-500 leading-relaxed">Nhận hàng trong vòng 2-4 giờ tại khu vực nội thành.</p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-6 border-t">
                    <Button variant="outline" className="w-full rounded-xl border-2 font-bold py-6">
                      XEM CHÍNH SÁCH BẢO HÀNH
                    </Button>
                  </div>
                </div>

                {/* Banner/Advertisement area */}
                <div className="aspect-[3/4] rounded-[32px] bg-gradient-to-br from-primary to-accent p-8 text-white relative overflow-hidden group">
                  <div className="relative z-10 space-y-4">
                    <h4 className="text-3xl font-black leading-tight italic">BUILD YOUR DREAM PC</h4>
                    <p className="text-sm text-white/80 font-medium leading-relaxed">Sử dụng công cụ AI tiên tiến nhất để tối ưu cấu hình của bạn ngay bây giờ.</p>
                    <Button className="bg-white text-primary hover:bg-slate-50 font-black rounded-xl">THỬ NGAY</Button>
                  </div>
                  <div className="absolute -bottom-10 -right-10 opacity-20 transition-transform duration-1000 group-hover:scale-110 group-hover:-rotate-12">
                    <Sparkles className="w-64 h-64" />
                  </div>
                </div>
              </div>
            </div>

            {/* Recently Viewed */}
            {recentlyViewed.length > 1 && (
              <section className="pt-16 border-t">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                    <History className="w-6 h-6 text-primary" />
                    Vừa xem gần đây
                  </h2>
                  <Button variant="ghost" className="font-bold text-primary">Xem tất cả</Button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
                  {recentlyViewed.slice(0, 6).map(item => (
                    <Link
                      key={item.id}
                      to={`/components/${item.slug}`}
                      className="group bg-white p-4 rounded-[24px] border border-transparent hover:border-slate-100 hover:shadow-xl transition-all"
                    >
                      <div className="aspect-square mb-4 rounded-2xl overflow-hidden bg-slate-50 p-2">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-110"
                        />
                      </div>
                      <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">LINH KIỆN</p>
                      <p className="text-sm font-black text-slate-900 line-clamp-1 mb-2 group-hover:text-primary transition-colors">{item.name}</p>
                      <p className="text-primary font-black">{formatMoney(item.price)}</p>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="text-center py-40">
            <Info className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-bold">Không tìm thấy sản phẩm này</p>
          </div>
        )}
      </main>

      {/* Footer minimal or copyright */}
      <footer className="bg-white border-t mt-24 py-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-slate-400 font-medium">© 2024 TechBuildAi. All Rights Reserved.</p>
        </div>
      </footer>

      {/* Delete Review Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl">Xóa đánh giá</AlertDialogTitle>
            <AlertDialogDescription className="text-base mt-2">
              Bạn có chắc chắn muốn xóa đánh giá này? Hành động này không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="min-w-24">Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteReview}
              className="min-w-24 bg-red-600 hover:bg-red-700 text-white"
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Utility Components
function Sparkles(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" />
      <path d="M19 17v4" />
      <path d="M3 5h4" />
      <path d="M17 19h4" />
    </svg>
  );
}

// Helper Functions
function updateRecentlyViewed(product) {
  const entry = {
    id: product.id,
    slug: product.slug,
    name: product.name,
    imageUrl: product.imageUrl,
    price: product.price,
  };
  const key = "techbuiltai-recently-viewed";
  try {
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    const filtered = existing.filter(item => item.id !== entry.id);
    const next = [entry, ...filtered].slice(0, 12);
    localStorage.setItem(key, JSON.stringify(next));
    return next;
  } catch { return []; }
}

function formatMoney(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatRelativeTime(value) {
  if (!value) return "";
  const diff = Math.floor((Date.now() - new Date(value).getTime()) / 1000);
  if (diff < 60) return "vừa xong";
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
  return new Date(value).toLocaleDateString("vi-VN");
}
