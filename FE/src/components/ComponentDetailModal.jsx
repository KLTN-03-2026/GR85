import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Star, ShoppingCart, Package, Check, X } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useBuild } from "@/contexts/BuildContext";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

export function ComponentDetailModal({
  component,
  open,
  onClose,
  mode = "shop",
}) {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { addComponent } = useBuild();
  const fallbackImage = "/images/component-placeholder.svg";
  const [detailData, setDetailData] = useState(component ?? null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  useEffect(() => {
    setDetailData(component ?? null);
    setActiveImageIndex(0);
  }, [component]);

  useEffect(() => {
    let cancelled = false;

    async function loadDetailBySlug() {
      if (!open || !component?.slug) {
        return;
      }

      try {
        setDetailLoading(true);
        const response = await fetch(`/api/products/${component.slug}`);
        if (!response.ok) {
          throw new Error("Không tải được chi tiết sản phẩm");
        }

        const payload = await response.json();
        if (cancelled) {
          return;
        }

        const categoryMap = {
          vga: "gpu",
          ssd: "storage",
          mainboard: "motherboard",
        };

        const categorySlug = String(payload?.category?.slug ?? component.category ?? "").toLowerCase();
        const normalizedCategory = (categoryMap[categorySlug] ?? categorySlug) || component.category;

        const imageUrls = Array.isArray(payload?.images)
          ? payload.images.map((item) => item?.imageUrl).filter(Boolean)
          : [];

        setDetailData({
          ...component,
          id: payload?.id ?? component.id,
          slug: payload?.slug ?? component.slug,
          name: payload?.name ?? component.name,
          productCode: payload?.productCode ?? component.productCode,
          category: normalizedCategory,
          brand:
            payload?.specifications?.brand ||
            payload?.supplier?.name ||
            component.brand ||
            "PC Perfect",
          price: Number(payload?.price ?? component.price ?? 0),
          stock: Number(payload?.stockQuantity ?? component.stock ?? 0),
          specs: payload?.specifications ?? component.specs ?? {},
          image: payload?.imageUrl || imageUrls[0] || component.image || fallbackImage,
          images: imageUrls.length ? imageUrls : [payload?.imageUrl || component.image || fallbackImage],
          fullDescription: payload?.detail?.fullDescription || component.fullDescription || "",
          inTheBox: payload?.detail?.inTheBox || component.inTheBox || "",
          warrantyPolicy: payload?.detail?.warrantyPolicy || component.warrantyPolicy || "",
          manualUrl: payload?.detail?.manualUrl || component.manualUrl || null,
        });
      } catch {
        if (!cancelled) {
          setDetailData((prev) => prev ?? component);
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false);
        }
      }
    }

    loadDetailBySlug();

    return () => {
      cancelled = true;
    };
  }, [open, component]);

  const activeComponent = detailData ?? component;
  const galleryImages = useMemo(() => {
    const list = Array.isArray(activeComponent?.images)
      ? activeComponent.images.filter(Boolean)
      : [];
    if (list.length > 0) {
      return list;
    }
    return [activeComponent?.image || fallbackImage];
  }, [activeComponent]);

  const mainImage = galleryImages[Math.min(activeImageIndex, Math.max(0, galleryImages.length - 1))] || fallbackImage;
  const stock = Number(activeComponent?.stock ?? 0);
  const isInStock =
    typeof activeComponent?.inStock === "boolean"
      ? activeComponent.inStock
      : typeof activeComponent?.isOutOfStock === "boolean"
        ? !activeComponent.isOutOfStock
        : stock > 0;

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const handleAddToCart = (isUsed = false) => {
    addToCart(activeComponent, isUsed);
    onClose();
  };

  const handleBuyNow = async () => {
    await addToCart(activeComponent, false);
    onClose();
    navigate("/cart", {
      state: { checkoutProductIds: [Number(activeComponent.id)] },
    });
  };

  const handleAddToBuild = () => {
    addComponent(activeComponent.category, activeComponent);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl glass border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">
            {activeComponent?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Image */}
          <div className="space-y-3">
            <div className="aspect-square bg-secondary/50 rounded-xl overflow-hidden">
              <img
                src={mainImage}
                alt={activeComponent.name}
                className="w-full h-full object-contain p-8"
                onError={(event) => {
                  if (event.currentTarget.src.includes(fallbackImage)) {
                    return;
                  }
                  event.currentTarget.src = fallbackImage;
                }}
              />
            </div>

            <div className="grid grid-cols-4 gap-2">
              {galleryImages.slice(0, 4).map((imageUrl, index) => (
                <button
                  key={`${imageUrl}-${index}`}
                  type="button"
                  onClick={() => setActiveImageIndex(index)}
                  className={`h-16 overflow-hidden rounded-md border ${index === activeImageIndex ? "border-primary" : "border-border"}`}
                >
                  <img
                    src={imageUrl}
                    alt={`${activeComponent.name}-${index + 1}`}
                    className="h-full w-full object-cover"
                    onError={(event) => {
                      event.currentTarget.src = fallbackImage;
                    }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-4">
            {/* Brand & Category */}
            <div className="flex items-center gap-2">
              <Badge variant="outline">{activeComponent.brand}</Badge>
              <Badge className="bg-primary/20 text-primary border-primary/30">
                {String(activeComponent.category ?? "san-pham").toUpperCase()}
              </Badge>
              {activeComponent.isNew && (
                <Badge className="bg-accent text-accent-foreground">Mới</Badge>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${star <= Math.floor(activeComponent?.rating ?? 0)
                      ? "fill-accent text-accent"
                      : "text-muted-foreground"
                    }`}
                />
              ))}
              <span className="text-sm text-muted-foreground">
                ({activeComponent.rating}/5)
              </span>
            </div>

            {/* Stock Status */}
            <div className="flex items-center gap-2">
              {isInStock ? (
                <>
                  <Check className="w-4 h-4 text-storage" />
                  <span className="text-storage text-sm">
                    Còn hàng{stock > 0 ? ` (${stock})` : ""}
                  </span>
                </>
              ) : (
                <>
                  <X className="w-4 h-4 text-destructive" />
                  <span className="text-destructive text-sm">Hết hàng</span>
                </>
              )}
            </div>

            <Separator />

            {/* Specs */}
            <div>
              <h4 className="font-semibold mb-3">Thông số kỹ thuật</h4>
              <div className="space-y-2">
                {Object.entries(activeComponent.specs ?? {}).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground capitalize">
                      {key.replace(/([A-Z])/g, " $1").trim()}
                    </span>
                    <span className="font-medium">{String(value)}</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Product Details from ProductDetail table */}
            {(activeComponent.fullDescription || activeComponent.inTheBox || activeComponent.warrantyPolicy || activeComponent.manualUrl) && (
              <>
                <div>
                  <h4 className="font-semibold mb-3">Thông tin sản phẩm</h4>
                  <div className="space-y-3 text-sm">
                    {activeComponent.fullDescription && (
                      <div className="max-h-48 overflow-y-auto rounded-md border border-border/60 bg-secondary/20 p-3">
                        <div
                          className="text-sm leading-relaxed text-foreground [&_p]:mb-3 [&_p]:last:mb-0 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_li]:mb-1"
                          dangerouslySetInnerHTML={{ __html: activeComponent.fullDescription }}
                        />
                      </div>
                    )}
                    {activeComponent.inTheBox && (
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Trong hộp:</p>
                        <p className="text-foreground">{activeComponent.inTheBox}</p>
                      </div>
                    )}
                    {activeComponent.warrantyPolicy && (
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Bảo hành:</p>
                        <p className="text-foreground">{activeComponent.warrantyPolicy}</p>
                      </div>
                    )}
                    {activeComponent.manualUrl && (
                      <div>
                        <p className="text-muted-foreground font-medium mb-1">Tài liệu:</p>
                        <a
                          href={activeComponent.manualUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline"
                        >
                          Xem hướng dẫn sử dụng →
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />
              </>
            )}

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Giá mới:</span>
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(activeComponent.price)}
                </span>
              </div>
              {activeComponent.usedPrice && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    Giá đồ cũ:
                  </span>
                  <span className="text-xl font-bold text-storage">
                    {formatPrice(activeComponent.usedPrice)}
                  </span>
                </div>
              )}
            </div>

            {detailLoading && (
              <p className="text-xs text-muted-foreground">Đang tải thêm thông tin chi tiết...</p>
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-4">
              {mode === "builder" ? (
                <Button
                  variant="hero"
                  onClick={handleAddToBuild}
                  className="w-full"
                >
                  Thêm vào Build
                </Button>
              ) : (
                <>
                  <Button
                    variant="hero"
                    onClick={handleBuyNow}
                    className="w-full gap-2"
                    disabled={!isInStock}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {isInStock
                      ? `Mua ngay - ${formatPrice(activeComponent.price)}`
                      : "Hết hàng"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleAddToCart(false)}
                    className="w-full"
                    disabled={!isInStock}
                  >
                    Thêm vào giỏ hàng
                  </Button>
                  {activeComponent.usedPrice && (
                    <Button
                      variant="outline"
                      onClick={() => handleAddToCart(true)}
                      className="w-full gap-2 border-storage text-storage hover:bg-storage/10"
                      disabled={!isInStock}
                    >
                      <Package className="w-4 h-4" />
                      Mua đồ cũ - {formatPrice(activeComponent.usedPrice)}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
