import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Link, useNavigate } from "react-router-dom";
import { Star, Plus, Eye, ShoppingCart } from "lucide-react";
import { useCart } from "@/contexts/CartContext";
import { useBuild } from "@/contexts/BuildContext";
import { useState } from "react";
import { ComponentDetailModal } from "./ComponentDetailModal";

export function ComponentCard({ component, mode = "shop", compact = false }) {
  const { addToCart } = useCart();
  const { addComponent } = useBuild();
  const navigate = useNavigate();
  const [showDetail, setShowDetail] = useState(false);
  const fallbackImage = "/images/component-placeholder.svg";

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
      monitor: "bg-blue-500/20 text-blue-700 border-blue-500/30",
      mouse: "bg-purple-500/20 text-purple-700 border-purple-500/30",
      keyboard: "bg-indigo-500/20 text-indigo-700 border-indigo-500/30",
      headset: "bg-orange-500/20 text-orange-700 border-orange-500/30",
      speaker: "bg-rose-500/20 text-rose-700 border-rose-500/30",
      webcam: "bg-teal-500/20 text-teal-700 border-teal-500/30",
      microphone: "bg-amber-500/20 text-amber-700 border-amber-500/30",
      cable: "bg-slate-500/20 text-slate-700 border-slate-500/30",
      hub: "bg-cyan-500/20 text-cyan-700 border-cyan-500/30",
      stand: "bg-lime-500/20 text-lime-700 border-lime-500/30",
      pad: "bg-fuchsia-500/20 text-fuchsia-700 border-fuchsia-500/30",
      hdd: "bg-gray-500/20 text-gray-700 border-gray-500/30",
    };
    return colors[category] || "bg-gray-100/20 text-gray-700 border-gray-100/30";
  };

  const getCategoryName = (category) => {
    const names = {
      cpu: "CPU",
      gpu: "GPU",
      ram: "RAM",
      storage: "SSD",
      motherboard: "Mainboard",
      psu: "PSU",
      case: "Case",
      cooling: "Tản nhiệt",
      monitor: "Màn hình",
      mouse: "Chuột",
      keyboard: "Bàn phím",
      headset: "Tai nghe",
      speaker: "Loa",
      webcam: "Webcam",
      microphone: "Mic",
      cable: "Cáp",
      hub: "Hub",
      stand: "Giá đỡ",
      pad: "Lót chuột",
      hdd: "HDD",
    };
    return names[category] || "Sản phẩm";
  };

  return (
    <>
      <Card
        className={`group gradient-card border-border/50 overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)] ${compact ? "shadow-sm" : ""}`}
        data-aos="flip-right"
        data-aos-duration="1000"
      >
        {/* Image */}
        <div className={`relative ${compact ? "aspect-[4/3]" : "aspect-square"} bg-secondary/50 overflow-hidden`}>
          <img
            src={component.image || fallbackImage}
            alt={component.name}
            className="w-full h-full object-contain p-4 group-hover:scale-110 transition-transform duration-500"
            onError={(event) => {
              if (event.currentTarget.src.includes(fallbackImage)) {
                return;
              }
              event.currentTarget.src = fallbackImage;
            }}
          />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col gap-2">
            <Badge className={getCategoryColor(component.category)}>
              {getCategoryName(component.category)}
            </Badge>
            {component.isNew && (
              <Badge className="bg-accent text-accent-foreground">Mới</Badge>
            )}
            {Number(component.stock ?? 0) <= 0 && (
              <Badge className="bg-rose-100 text-rose-700">Hết hàng</Badge>
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
        <div className={`${compact ? "p-3 space-y-2.5" : "p-4 space-y-3"}`}>
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
          <h3 className={`font-semibold text-foreground line-clamp-2 ${compact ? "min-h-[2.25rem] text-[0.98rem]" : "min-h-[2.5rem]"}`}>
            <Link to={`/components/${component.slug || component.id}`} className="hover:underline">
              {component.name}
            </Link>
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
          <div className={`pt-2 border-t border-border/50 ${compact ? "pt-1.5" : ""}`}>
            <p className={`font-bold text-primary ${compact ? "text-lg" : "text-xl"}`}>
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
                Thêm vào cấu hình
              </Button>
            ) : (
              <>
                <Button
                  variant="default"
                  className="flex-1 gap-1"
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
                  <ShoppingCart className="w-4 h-4" />
                  {Number(component.stock ?? 0) <= 0 ? "Hết hàng" : "Thêm vào giỏ hàng"}
                </Button>
                <Button
                  variant="hero"
                  className="flex-1 gap-0.8"
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
                  <Plus className="w-4 h-4" />
                  Mua ngay
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
