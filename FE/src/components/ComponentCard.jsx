import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Star, Plus, Eye, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useBuild } from "@/contexts/BuildContext";
import { useState } from "react";
import { ComponentDetailModal } from "./ComponentDetailModal";

export function ComponentCard({ component, mode = "shop" }) {
  const { addToCart } = useCart();
  const { addComponent } = useBuild();
  const [showDetail, setShowDetail] = useState(false);

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const getCategoryColor = (category) => {
    const colors = {
      cpu: "bg-cpu/20 text-cpu border-cpu/30",
      gpu: "bg-gpu/20 text-gpu border-gpu/30",
      ram: "bg-ram/20 text-ram border-ram/30",
      storage: "bg-storage/20 text-storage border-storage/30",
      motherboard: "bg-motherboard/20 text-motherboard border-motherboard/30",
      psu: "bg-psu/20 text-psu border-psu/30",
      case: "bg-case/20 text-case border-case/30",
      cooling: "bg-cooling/20 text-cooling border-cooling/30",
    };
    return colors[category];
  };

  const getCategoryName = (category) => {
    const names = {
      cpu: "CPU",
      gpu: "GPU",
      ram: "RAM",
      storage: "Ổ cứng",
      motherboard: "Mainboard",
      psu: "Nguồn",
      case: "Case",
      cooling: "Tản nhiệt",
    };
    return names[category];
  };

  return (
    <>
      <Card className="group gradient-card border-border/50 overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)]">
        {/* Image */}
        <div className="relative aspect-square bg-secondary/50 overflow-hidden">
          <img
            src={component.image}
            alt={component.name}
            className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500"
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <Badge className={getCategoryColor(component.category)}>
              {getCategoryName(component.category)}
            </Badge>
            {component.isNew && (
              <Badge className="bg-accent text-accent-foreground">Mới</Badge>
            )}
          </div>

          {/* Quick Actions */}
          <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="glass"
              size="icon"
              onClick={() => setShowDetail(true)}
            >
              <Eye className="w-4 h-4" />
            </Button>
          </div>

          {/* Used Price Badge */}
          {component.usedPrice && (
            <div className="absolute bottom-3 right-3 glass rounded-lg px-2 py-1 text-xs">
              <span className="text-muted-foreground">Đồ cũ: </span>
              <span className="text-storage font-semibold">
                {formatPrice(component.usedPrice)}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-3">
          {/* Brand & Rating */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {component.brand}
            </span>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-accent text-accent" />
              <span className="text-sm font-medium">{component.rating}</span>
            </div>
          </div>

          {/* Name */}
          <h3 className="font-semibold text-foreground line-clamp-2 min-h-[2.5rem]">
            {component.name}
          </h3>

          {/* Key Specs */}
          <div className="flex flex-wrap gap-1">
            {Object.entries(component.specs)
              .slice(0, 3)
              .map(([key, value]) => (
                <span
                  key={key}
                  className="text-xs px-2 py-1 rounded-md bg-secondary text-muted-foreground"
                >
                  {String(value)}
                </span>
              ))}
          </div>

          {/* Price */}
          <div className="pt-2 border-t border-border/50">
            <p className="text-xl font-bold text-primary">
              {formatPrice(component.price)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            {mode === "builder" ? (
              <Button
                variant="default"
                className="flex-1 gap-2"
                onClick={() => addComponent(component.category, component)}
              >
                <Plus className="w-4 h-4" />
                Thêm vào Build
              </Button>
            ) : (
              <>
                <Button
                  variant="default"
                  className="flex-1 gap-2"
                  onClick={() => addToCart(component)}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Mua ngay
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowDetail(true)}
                >
                  <Eye className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </Card>

      <ComponentDetailModal
        component={component}
        open={showDetail}
        onClose={() => setShowDetail(false)}
      />
    </>
  );
}
