import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Star, Plus, Eye, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useBuild } from "@/contexts/BuildContext";
import {
  formatComponentPrice,
  getComponentCategoryLabel,
  getComponentCategoryStyle,
} from "@/components/component-card/componentCard.utils.js";

export function ComponentCard({ component, mode = "shop", compact = false }) {
  const { addToCart } = useCart();
  const { addComponent } = useBuild();
  const navigate = useNavigate();
  const fallbackImage = "/images/component-placeholder.svg";
  const isBuilderMode = mode === "builder";

  return (
      <Card
        className={`group gradient-card border-border/50 overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_24px_hsl(var(--primary)/0.18)] ${compact ? "shadow-sm" : ""}`}
        data-aos="flip-right"
        data-aos-duration="1000"
      >
        {/* Image */}
        <div className={`relative ${isBuilderMode ? "aspect-[16/10]" : compact ? "aspect-[16/11]" : "aspect-[4/3]"} bg-secondary/50 overflow-hidden`}>
          <img
            src={component.image || fallbackImage}
            alt={component.name}
            className={`h-full w-full object-contain transition-transform duration-500 group-hover:scale-105 ${isBuilderMode ? "p-2" : compact ? "p-2.5" : "p-3"}`}
            onError={(event) => {
              if (event.currentTarget.src.includes(fallbackImage)) {
                return;
              }
              event.currentTarget.src = fallbackImage;
            }}
          />

          {/* Badges */}
          <div className="absolute left-2 top-2 flex flex-col gap-1.5">
            <Badge className={`text-[11px] ${getComponentCategoryStyle(component.category)}`}>
              {getComponentCategoryLabel(component.category)}
            </Badge>
            {component.isNew && (
              <Badge className="bg-accent text-[11px] text-accent-foreground">Mới</Badge>
            )}
            {Number(component.stock ?? 0) <= 0 && (
              <Badge className="bg-rose-100 text-[11px] text-rose-700">Hết hàng</Badge>
            )}
          </div>

          {/* Quick Actions */}
          <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
            <Button
              asChild
              variant="glass"
              size="icon"
              className="h-8 w-8"
            >
              <Link to={`/components/${component.slug || component.id}`}>
                <Eye className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>

          {/* Used Price Badge */}
          {component.usedPrice && (
            <div className="absolute bottom-2 right-2 glass rounded-lg px-2 py-1 text-[11px]">
              <span className="text-muted-foreground">Đồ cũ: </span>
              <span className="text-storage font-semibold">
                {formatComponentPrice(component.usedPrice)}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className={`${isBuilderMode ? "space-y-1.5 p-2" : compact ? "space-y-2 p-2.5" : "space-y-2.5 p-3"}`}>
          {/* Brand & Rating */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {component.brand}
            </span>
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
              <span className="text-xs font-medium">{component.rating}</span>
            </div>
          </div>

          {/* Name */}
          <h3 className={`line-clamp-2 font-semibold text-foreground ${isBuilderMode ? "min-h-[1.9rem] text-[0.84rem]" : compact ? "min-h-[2rem] text-sm" : "min-h-[2.2rem] text-[0.95rem]"}`}>
            <Link
              to={`/components/${component.slug || component.id}`}
              className="text-left hover:underline"
            >
              {component.name}
            </Link>
          </h3>

          {/* Key Specs */}
          <div className="flex flex-wrap gap-1">
            {Object.entries(component.specs)
              .slice(0, isBuilderMode ? 1 : compact ? 2 : 3)
              .map(([key, value]) => (
                <span
                  key={key}
                  className="rounded-md bg-secondary px-2 py-1 text-[11px] text-muted-foreground"
                >
                  {String(value)}
                </span>
              ))}
          </div>

          {/* Price */}
          <div className="border-t border-border/50 pt-1.5">
            <p className={`font-bold text-primary ${isBuilderMode ? "text-sm" : compact ? "text-base" : "text-lg"}`}>
              {formatComponentPrice(component.price)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {mode === "builder" ? (
              <Button
                variant="default"
                className={`flex-1 gap-1 text-xs ${isBuilderMode ? "h-7" : "h-8"}`}
                onClick={() => addComponent(component.category, component)}
              >
                <Plus className="h-3.5 w-3.5" />
                Thêm vào cấu hình
              </Button>
            ) : (
              <>
                <Button
                  variant="default"
                  className="h-8 flex-1 gap-1 text-xs"
                  onClick={async () => {
                    try {
                      await addToCart(component);
                    } catch (error) {
                      window.alert(
                        error instanceof Error
                          ? error.message
                          : "Không thể thêm vào giỏ hàng",
                      );
                    }
                  }}
                  disabled={Number(component.stock ?? 0) <= 0}
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  {Number(component.stock ?? 0) <= 0 ? "Hết hàng" : "Thêm vào giỏ hàng"}
                </Button>
                <Button
                  variant="hero"
                  className="h-8 flex-1 gap-1 text-xs"
                  onClick={async () => {
                    try {
                      await addToCart(component);
                      navigate("/cart", {
                        state: { checkoutProductIds: [Number(component.id)] },
                      });
                    } catch (error) {
                      window.alert(
                        error instanceof Error
                          ? error.message
                          : "Không thể thanh toán ngay",
                      );
                    }
                  }}
                  disabled={Number(component.stock ?? 0) <= 0}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Mua ngay
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
  );
}
