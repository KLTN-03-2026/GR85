import React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export function BuildComparisonView({ configs, onClose }) {
  if (!configs || configs.length === 0) {
    return null;
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(price);
  };

  // Lấy tất cả categories từ các configs
  const allCategories = new Set();
  configs.forEach((config) => {
    config.items?.forEach((item) => {
      allCategories.add(item.category || item.categorySlug);
    });
  });

  // Nhóm items theo category cho mỗi config
  const configsByCategory = configs.map((config) => {
    const grouped = {};
    config.items?.forEach((item) => {
      const category = item.category || item.categorySlug;
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    return grouped;
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-auto">
        <CardHeader className="flex flex-row items-center justify-between sticky top-0 bg-white border-b">
          <CardTitle className="text-2xl">So sánh cấu hình PC</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-6">
          {/* Header - Tên & giá cấu hình */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            {configs.map((config, idx) => (
              <div key={config.id} className="text-center">
                <h3 className="font-bold text-lg mb-2">{config.name}</h3>
                <div className="text-sm text-muted-foreground mb-1">
                  Nhu cầu: {config.usage === "gaming" ? "Gaming" : config.usage === "workstation" ? "Workstation" : "Chung"}
                </div>
                <div className="text-xl font-bold text-primary">
                  {formatPrice(config.totalPrice)}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4 space-y-4">
            {/* Comparison Table */}
            {Array.from(allCategories).map((category) => (
              <div key={category} className="border-b pb-4">
                <h4 className="font-semibold text-base mb-3 capitalize">
                  {category}
                </h4>
                <div className="grid grid-cols-3 gap-4">
                  {configs.map((config, idx) => {
                    const items = configsByCategory[idx][category];
                    if (!items || items.length === 0) {
                      return (
                        <div
                          key={config.id}
                          className="text-sm text-muted-foreground italic"
                        >
                          Không có
                        </div>
                      );
                    }

                    return (
                      <div key={config.id} className="space-y-2">
                        {items.map((item, itemIdx) => (
                          <div
                            key={itemIdx}
                            className="bg-gray-50 p-3 rounded-md border border-gray-200"
                          >
                            <p className="text-sm font-medium truncate">
                              {item.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {item.brand}
                            </p>
                            <p className="text-sm font-semibold text-primary mt-1">
                              {formatPrice(item.price)}
                            </p>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Price Difference */}
            <div className="mt-6 pt-4 border-t">
              <h4 className="font-semibold mb-3">So sánh giá</h4>
              <div className="grid grid-cols-3 gap-4">
                {configs.map((config, idx) => {
                  const basePriceIdx = 0;
                  const basePrice = configs[basePriceIdx].totalPrice;
                  const diff = config.totalPrice - basePrice;
                  const diffPercent =
                    basePrice > 0 ? ((diff / basePrice) * 100).toFixed(1) : 0;

                  return (
                    <div
                      key={config.id}
                      className="p-3 rounded-md border"
                      style={{
                        backgroundColor:
                          diff > 0
                            ? "#fef2f2"
                            : diff < 0
                              ? "#f0fdf4"
                              : "#f9fafb",
                        borderColor:
                          diff > 0
                            ? "#fecaca"
                            : diff < 0
                              ? "#86efac"
                              : "#d1d5db",
                      }}
                    >
                      {idx === basePriceIdx ? (
                        <p className="text-sm font-medium">Giá cơ sở</p>
                      ) : (
                        <>
                          <p className="text-sm font-medium">
                            {diff > 0 ? "+" : ""}
                            {formatPrice(diff)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {diff > 0 ? "+" : ""}
                            {diffPercent}%
                          </p>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
