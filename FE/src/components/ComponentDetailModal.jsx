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

export function ComponentDetailModal({
  component,
  open,
  onClose,
  mode = "shop",
}) {
  const { addToCart } = useCart();
  const { addComponent } = useBuild();
  const stock = Number(component?.stock ?? 0);
  const isInStock =
    typeof component?.inStock === "boolean"
      ? component.inStock
      : typeof component?.isOutOfStock === "boolean"
        ? !component.isOutOfStock
        : stock > 0;

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const handleAddToCart = (isUsed = false) => {
    addToCart(component, isUsed);
    onClose();
  };

  const handleAddToBuild = () => {
    addComponent(component.category, component);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl glass border-primary/20">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">
            {component.name}
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Image */}
          <div className="aspect-square bg-secondary/50 rounded-xl overflow-hidden">
            <img
              src={component.image}
              alt={component.name}
              className="w-full h-full object-contain p-8"
            />
          </div>

          {/* Details */}
          <div className="space-y-4">
            {/* Brand & Category */}
            <div className="flex items-center gap-2">
              <Badge variant="outline">{component.brand}</Badge>
              <Badge className="bg-primary/20 text-primary border-primary/30">
                {component.category.toUpperCase()}
              </Badge>
              {component.isNew && (
                <Badge className="bg-accent text-accent-foreground">Mới</Badge>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.floor(component.rating)
                      ? "fill-accent text-accent"
                      : "text-muted-foreground"
                  }`}
                />
              ))}
              <span className="text-sm text-muted-foreground">
                ({component.rating}/5)
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
                {Object.entries(component.specs).map(([key, value]) => (
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

            {/* Price */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Giá mới:</span>
                <span className="text-2xl font-bold text-primary">
                  {formatPrice(component.price)}
                </span>
              </div>
              {component.usedPrice && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    Giá đồ cũ:
                  </span>
                  <span className="text-xl font-bold text-storage">
                    {formatPrice(component.usedPrice)}
                  </span>
                </div>
              )}
            </div>

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
                    onClick={() => handleAddToCart(false)}
                    className="w-full gap-2"
                    disabled={!isInStock}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    {isInStock
                      ? `Mua mới - ${formatPrice(component.price)}`
                      : "Hết hàng"}
                  </Button>
                  {component.usedPrice && (
                    <Button
                      variant="outline"
                      onClick={() => handleAddToCart(true)}
                      className="w-full gap-2 border-storage text-storage hover:bg-storage/10"
                      disabled={!isInStock}
                    >
                      <Package className="w-4 h-4" />
                      Mua đồ cũ - {formatPrice(component.usedPrice)}
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
