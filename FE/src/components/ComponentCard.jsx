// Importing necessary components and hooks from external libraries and local files
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Star, Plus, Eye, ShoppingCart, Heart, Trash2 } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useFavorite } from "@/client/features/favorite/context/FavoriteContext";
import { useBuild } from "@/contexts/BuildContext";
import {
  formatComponentPrice, // Utility function to format the price of a component
  getComponentCategoryLabel, // Utility function to get the label for a component category
  getComponentCategoryStyle, // Utility function to get the style for a component category
} from "@/components/component-card/componentCard.utils.js";

// ComponentCard is a reusable component to display information about a PC component
export function ComponentCard({ component, mode = "shop", compact = false }) {
  const { addToCart } = useCart();
  const { addComponent } = useBuild();
  const { isFavorite, toggleFavorite } = useFavorite();
  const navigate = useNavigate();
  const fallbackImage = "/images/component-placeholder.svg";
  const isBuilderMode = mode === "builder";
  const isFavoritesMode = mode === "favorites";
  const isFav = isFavorite(component.id);
  const stock = Number(component.stock ?? component.stockQuantity ?? 0);
  const categorySlug = typeof component.category === "object" ? component.category?.slug : component.category;
  const brand = component.brand || component.specifications?.brand || component.supplier?.name || "TechBuildAi";
  const specs = component.specs || component.specifications || {};

  return (
    <Card
      className={`group gradient-card flex flex-col border-border/50 hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_24px_hsl(var(--primary)/0.18)] ${compact ? "shadow-sm" : ""}`}
      data-aos="flip-right"
      data-aos-duration="1000"
    >
      {/* Image Section */}
      <div className="relative aspect-[4/3] bg-white overflow-hidden group/img flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50 to-white pointer-events-none" />
        <img
          src={component.imageUrl || component.image || (Array.isArray(component.images) && component.images[0]) || fallbackImage}
          alt={component.name}
          className="h-full w-full object-contain relative z-10 p-5 transition-all duration-700 group-hover:scale-110 group-hover/img:rotate-1"
          onError={(event) => {
            if (event.currentTarget.src.includes(fallbackImage)) {
              return;
            }
            event.currentTarget.src = fallbackImage;
          }}
        />

        {/* Badges Section */}
        <div className="absolute left-2 top-2 z-50 flex flex-col gap-1.5">
          <Badge className={`glass text-[11px] ${getComponentCategoryStyle(categorySlug)}`}>
            {getComponentCategoryLabel(categorySlug)}
          </Badge>
          {component.isNew && <Badge className="bg-accent text-[11px] text-accent-foreground">Mới</Badge>}
          {stock <= 0 && <Badge className="bg-rose-100 text-[11px] text-rose-700">Hết hàng</Badge>}
        </div>

        {/* Quick Actions Section */}
        <div className="absolute right-2 top-2 flex flex-col gap-2 z-50">
          <Button
            variant="glass"
            size="icon"
            className="h-8 w-8 opacity-100 z-50"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              toggleFavorite(component.id);
            }}
          >
            <Heart className={`h-4 w-4 ${isFav ? "fill-rose-500 text-rose-500" : ""}`} />
          </Button>
          <Button
            asChild
            variant="glass"
            size="icon"
            className="h-8 w-8 opacity-100 z-50"
          >
            <Link to={`/components/${component.slug || component.id}`}>
              <Eye className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>

        {/* Used Price Badge Section */}
        {component.usedPrice && (
          <div className="absolute bottom-2 right-2 glass rounded-lg px-2 py-1 text-[11px]">
            <span className="text-muted-foreground">Đồ cũ: </span>
            <span className="text-storage font-semibold">
              {formatComponentPrice(component.usedPrice)}
            </span>
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className={`${isBuilderMode ? "space-y-1.5 p-2" : compact ? "space-y-2 p-2.5" : "space-y-2.5 p-3"} flex flex-1 flex-col`}>
        {/* Brand & Rating Section */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
            {brand}
          </span>
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-accent text-accent" />
            <span className="text-xs font-medium">{component.rating}</span>
          </div>
        </div>

        {/* Name Section */}
        <h3 className={`line-clamp-2 font-semibold text-foreground ${isBuilderMode ? "min-h-[1.9rem] text-[0.84rem]" : compact ? "min-h-[2rem] text-sm" : "min-h-[2.2rem] text-[0.95rem]"}`}>
          <Link to={`/components/${component.slug || component.id}`} className="text-left hover:underline">
            {component.name}
          </Link>
        </h3>

        {/* Key Specifications Section */}
        <div className="flex flex-wrap gap-1">
          {Object.entries(specs)
            .slice(0, isBuilderMode ? 1 : compact ? 2 : 3)
            .map(([key, value]) => (
              <span key={key} className="rounded-md bg-secondary px-2 py-1 text-[11px] text-muted-foreground">
                {String(value)}
              </span>
            ))}
        </div>

        {/* Price Section */}
        <div className="border-t border-border/50 pt-1.5">
          <p className={`font-bold text-primary ${isBuilderMode ? "text-sm" : compact ? "text-base" : "text-lg"}`}>
            {formatComponentPrice(component.price)}
          </p>
        </div>

        {/* Actions Section */}
        <div className="mt-auto flex gap-2 pt-1 w-full">
          {isFavoritesMode ? (
            <>
              <Button
                variant="outline"
                className="h-8 flex-1 gap-1 text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleFavorite(component.id);
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Bỏ yêu thích
              </Button>
              <Button
                variant="default"
                className="h-8 flex-1 gap-1 text-xs"
                onClick={async () => {
                  try {
                    await addToCart(component);
                  } catch (error) {
                    window.alert(
                      error instanceof Error ? error.message : "Không thể thêm vào giỏ hàng"
                    );
                  }
                }}
                disabled={stock <= 0}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                {stock <= 0 ? "Hết hàng" : "Thêm vào giỏ hàng"}
              </Button>
            </>
          ) : mode === "builder" ? (
            <Button
              variant="default"
              className={`w-full gap-1 text-xs ${isBuilderMode ? "h-7" : "h-8"}`}
              onClick={() => addComponent(component.category, component)}
            >
              <Plus className="h-3.5 w-3.5" />
              Thêm vào cấu hình
            </Button>
          ) : stock <= 0 ? (
            <Button
              variant="outline"
              className="h-8 w-full gap-1 text-xs text-rose-500"
              disabled
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              Hết hàng
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
                      error instanceof Error ? error.message : "Không thể thêm vào giỏ hàng"
                    );
                  }
                }}
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                Thêm vào giỏ hàng
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
                      error instanceof Error ? error.message : "Không thể thanh toán ngay"
                    );
                  }
                }}
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