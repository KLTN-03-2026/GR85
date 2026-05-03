// Importing necessary components and hooks from external libraries and local files
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Star, Plus, Eye, ShoppingCart, Heart } from "lucide-react";
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
  const { addToCart } = useCart(); // Hook to add items to the cart
  const { addComponent } = useBuild(); // Hook to add components to a build configuration
  const { isFavorite, toggleFavorite } = useFavorite(); // Hook to manage favorite components
  const navigate = useNavigate(); // Hook to navigate between routes
  const fallbackImage = "/images/component-placeholder.svg"; // Fallback image for components without an image
  const isBuilderMode = mode === "builder"; // Check if the component is in builder mode
  const isFav = isFavorite(component.id); // Check if the component is marked as favorite
  const stock = Number(component.stock ?? component.stockQuantity ?? 0); // Determine the stock quantity
  const categorySlug = typeof component.category === "object" ? component.category?.slug : component.category; // Get the category slug
  const brand = component.brand || component.specifications?.brand || component.supplier?.name || "PC Perfect"; // Determine the brand of the component
  const specs = component.specs || component.specifications || {}; // Get the specifications of the component

  return (
      <Card
        className={`group gradient-card border-border/50 overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_24px_hsl(var(--primary)/0.18)] ${compact ? "shadow-sm" : ""}`}
        data-aos="flip-right"
        data-aos-duration="1000"
      >
        {/* Image Section */}
        <div className={`relative ${isBuilderMode ? "aspect-[16/10]" : compact ? "aspect-[16/11]" : "aspect-[4/3]"} bg-secondary/50 overflow-hidden`}>
          <img
            src={component.image || component.imageUrl || fallbackImage} // Display the component image or fallback image
            alt={component.name} // Alt text for the image
            className={`h-full w-full object-contain transition-transform duration-500 group-hover:scale-105 ${isBuilderMode ? "p-2" : compact ? "p-2.5" : "p-3"}`}
            onError={(event) => {
              if (event.currentTarget.src.includes(fallbackImage)) {
                return;
              }
              event.currentTarget.src = fallbackImage; // Replace with fallback image if the original fails to load
            }}
          />

          {/* Badges Section */}
          <div className="absolute left-2 top-2 flex flex-col gap-1.5">
            <Badge className={`text-[11px] ${getComponentCategoryStyle(categorySlug)}`}>
              {getComponentCategoryLabel(categorySlug)} {/* Display category label */}
            </Badge>
            {component.isNew && (
              <Badge className="bg-accent text-[11px] text-accent-foreground">Mới</Badge> // Badge for new components
            )}
            {stock <= 0 && (
              <Badge className="bg-rose-100 text-[11px] text-rose-700">Hết hàng</Badge> // Badge for out-of-stock components
            )}
          </div>

          {/* Quick Actions Section */}
          <div className="absolute right-2 top-2 flex flex-col gap-2">
            <Button
              variant="glass"
              size="icon"
              className={`h-8 w-8 ${isFav ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 transition-opacity'}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                toggleFavorite(component.id); // Toggle favorite status for the component
              }}
            >
              <Heart className={`h-4 w-4 ${isFav ? 'fill-rose-500 text-rose-500' : ''}`} />
            </Button>
            <Button
              asChild
              variant="glass"
              size="icon"
              className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
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
                {formatComponentPrice(component.usedPrice)} {/* Display formatted used price */}
              </span>
            </div>
          )}
        </div>

        {/* Content Section */}
        <div className={`${isBuilderMode ? "space-y-1.5 p-2" : compact ? "space-y-2 p-2.5" : "space-y-2.5 p-3"}`}>
          {/* Brand & Rating Section */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {brand} {/* Display the brand */}
            </span>
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-accent text-accent" />
              <span className="text-xs font-medium">{component.rating} {/* Display the rating */}</span>
            </div>
          </div>

          {/* Name Section */}
          <h3 className={`line-clamp-2 font-semibold text-foreground ${isBuilderMode ? "min-h-[1.9rem] text-[0.84rem]" : compact ? "min-h-[2rem] text-sm" : "min-h-[2.2rem] text-[0.95rem]"}`}>
            <Link
              to={`/components/${component.slug || component.id}`} // Link to component details
              className="text-left hover:underline"
            >
              {component.name} {/* Display the component name */}
            </Link>
          </h3>

          {/* Key Specifications Section */}
          <div className="flex flex-wrap gap-1">
            {Object.entries(specs)
              .slice(0, isBuilderMode ? 1 : compact ? 2 : 3) // Display a limited number of specifications based on mode
              .map(([key, value]) => (
                <span
                  key={key}
                  className="rounded-md bg-secondary px-2 py-1 text-[11px] text-muted-foreground"
                >
                  {String(value)} {/* Display each specification */}
                </span>
              ))}
          </div>

          {/* Price Section */}
          <div className="border-t border-border/50 pt-1.5">
            <p className={`font-bold text-primary ${isBuilderMode ? "text-sm" : compact ? "text-base" : "text-lg"}`}>
              {formatComponentPrice(component.price)} {/* Display formatted price */}
            </p>
          </div>

          {/* Actions Section */}
          <div className="flex gap-2">
            {mode === "builder" ? (
              <Button
                variant="default"
                className={`flex-1 gap-1 text-xs ${isBuilderMode ? "h-7" : "h-8"}`}
                onClick={() => addComponent(component.category, component)} // Add component to the build configuration
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
                      await addToCart(component); // Add component to the cart
                    } catch (error) {
                      window.alert(
                        error instanceof Error
                          ? error.message
                          : "Không thể thêm vào giỏ hàng", // Error message if adding to cart fails
                      );
                    }
                  }}
                  disabled={stock <= 0} // Disable button if stock is 0
                >
                  <ShoppingCart className="h-3.5 w-3.5" />
                  {stock <= 0 ? "Hết hàng" : "Thêm vào giỏ hàng"} {/* Button label based on stock */}
                </Button>
                <Button
                  variant="hero"
                  className="h-8 flex-1 gap-1 text-xs"
                  onClick={async () => {
                    try {
                      await addToCart(component); // Add component to the cart
                      navigate("/cart", {
                        state: { checkoutProductIds: [Number(component.id)] }, // Navigate to the cart with the component ID
                      });
                    } catch (error) {
                      window.alert(
                        error instanceof Error
                          ? error.message
                          : "Không thể thanh toán ngay", // Error message if checkout fails
                      );
                    }
                  }}
                  disabled={stock <= 0} // Disable button if stock is 0
                >
                  <Plus className="h-3.5 w-3.5" />
                  Mua ngay {/* Button label for immediate purchase */}
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>
  );
}
