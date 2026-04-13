import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { ComponentCard } from "@/components/ComponentCard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useBuild } from "@/contexts/BuildContext";
import { useCart } from "@/contexts/CartContext";
import {
  Cpu,
  Monitor,
  MemoryStick,
  HardDrive,
  CircuitBoard,
  Zap,
  Box,
  Fan,
  Download,
  ShoppingCart,
  Trash2,
  Package,
} from "lucide-react";

const PAGE_SIZE = 10;

const categoryIcons = {
  cpu: Cpu,
  gpu: Monitor,
  ram: MemoryStick,
  storage: HardDrive,
  motherboard: CircuitBoard,
  psu: Zap,
  case: Box,
  cooling: Fan,
};

const defaultBuilderCategories = [
  { id: "cpu", name: "CPU", color: "cpu" },
  { id: "gpu", name: "VGA", color: "gpu" },
  { id: "motherboard", name: "Mainboard", color: "motherboard" },
  { id: "ram", name: "RAM", color: "ram" },
  { id: "storage", name: "SSD", color: "storage" },
  { id: "psu", name: "PSU", color: "psu" },
  { id: "case", name: "Case", color: "case" },
  { id: "cooling", name: "Tản nhiệt", color: "cooling" },
];

export default function BuilderPage() {
  const navigate = useNavigate();
  const {
    currentBuild,
    removeComponent,
    clearBuild,
    totalPrice,
    useUsedPrices,
    setUseUsedPrices,
  } = useBuild();
  const { addBuildToCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState("cpu");
  const [components, setComponents] = useState([]);
  const [categories, setCategories] = useState(defaultBuilderCategories);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: PAGE_SIZE,
    totalPages: 1,
    totalItems: 0,
  });
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      try {
        const response = await fetch("/api/products/overview");
        if (!response.ok) {
          throw new Error(`Không tải được dữ liệu danh mục (${response.status})`);
        }

        const payload = await response.json();
        const databaseCategories = Array.isArray(payload.categories)
          ? payload.categories
          : [];

        const categoryMap = new Map(
          defaultBuilderCategories.map((category) => [category.id, { ...category }]),
        );

        databaseCategories.forEach((item) => {
          const normalizedId = normalizeCategorySlug(item.slug ?? item.id);
          if (!normalizedId || !categoryMap.has(normalizedId)) {
            return;
          }

          const existing = categoryMap.get(normalizedId);
          const normalizedName = String(item.name ?? "").trim();
          if (normalizedName) {
            existing.name = normalizedName;
          }
        });

        if (!cancelled) {
          const nextCategories = Array.from(categoryMap.values());
          setCategories(nextCategories);
          setSelectedCategory((current) =>
            nextCategories.some((item) => item.id === current)
              ? current
              : nextCategories[0]?.id ?? current,
          );
        }
      } catch {
        if (!cancelled) {
          setCategories(defaultBuilderCategories);
        }
      }
    }

    loadCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const query = new URLSearchParams();
        query.set("page", String(page));
        query.set("pageSize", String(PAGE_SIZE));
        query.set("category", toApiCategorySlug(selectedCategory));
        query.set("sort", "newest");

        const response = await fetch(`/api/products?${query.toString()}`);
        if (!response.ok) {
          throw new Error(`Không tải được linh kiện (${response.status})`);
        }

        const payload = await response.json();
        if (cancelled) {
          return;
        }

        setComponents(
          (Array.isArray(payload.items) ? payload.items : [])
            .map(mapProductToBuilderComponent)
            .filter(Boolean),
        );
        setPagination(
          payload.pagination ?? {
            page: 1,
            pageSize: PAGE_SIZE,
            totalPages: 1,
            totalItems: 0,
          },
        );
      } catch (error) {
        if (!cancelled) {
          setComponents([]);
          setPagination({
            page: 1,
            pageSize: PAGE_SIZE,
            totalPages: 1,
            totalItems: 0,
          });
          setErrorMessage(
            error instanceof Error ? error.message : "Không tải được linh kiện",
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      cancelled = true;
    };
  }, [page, selectedCategory]);

  useEffect(() => {
    const totalPages = Math.max(1, Number(pagination.totalPages ?? 1));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, pagination.totalPages]);

  const selectedCategoryMeta = useMemo(
    () => categories.find((item) => item.id === selectedCategory) ?? categories[0],
    [categories, selectedCategory],
  );

  const visiblePageItems = useMemo(
    () => buildVisiblePageItems(page, Math.max(1, Number(pagination.totalPages ?? 1))),
    [page, pagination.totalPages],
  );

  const selectedComponents = useMemo(
    () => Object.values(currentBuild.components).filter(Boolean),
    [currentBuild.components],
  );

  const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);

  const exportBuild = () => {
    const buildData = {
      name: currentBuild.name,
      date: new Date().toLocaleDateString("vi-VN"),
      useUsedPrices,
      components: Object.entries(currentBuild.components).map(([category, component]) => ({
        category,
        id: component?.id,
        name: component?.name,
        brand: component?.brand,
        price:
          useUsedPrices && component?.usedPrice ? component.usedPrice : component?.price,
        specs: component?.specs,
      })),
      totalPrice,
    };

    const blob = new Blob([JSON.stringify(buildData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pc-build-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addBuildToCartHandler = async () => {
    if (selectedComponents.length === 0) {
      return;
    }

    setIsAddingToCart(true);
    try {
      await addBuildToCart({
        name: currentBuild.name || "Cấu hình tự ráp",
        components: selectedComponents,
        totalPrice,
        useUsedPrices,
      });
      navigate("/cart");
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : "Không thể thêm combo vào giỏ hàng",
      );
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-8">
        <div className="container mx-auto px-4">
          <div className="mb-6">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
              Trình <span className="text-gradient-primary">tự ráp PC</span>
            </h1>
            <p className="text-muted-foreground">
              Chọn linh kiện từ cơ sở dữ liệu, tạo combo và xem kết quả theo từng trang.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)] lg:min-h-[calc(100vh-9rem)]">
            <Card className="glass border-primary/20 p-5 lg:sticky lg:top-24 lg:h-[calc(100vh-9rem)] lg:overflow-y-auto">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-xl font-bold">Cấu hình của bạn</h2>
                  <p className="text-xs text-muted-foreground">
                    {selectedComponents.length} linh kiện đã chọn
                  </p>
                </div>
                {selectedComponents.length > 0 && (
                  <Button variant="ghost" size="icon" onClick={clearBuild}>
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                )}
              </div>

              <div className="mb-4 flex items-center justify-between rounded-xl border border-border/50 bg-background/70 px-3 py-2">
                <Label className="flex items-center gap-2 text-sm">
                  <Package className="w-4 h-4 text-storage" />
                  Dùng giá máy cũ
                </Label>
                <Switch checked={useUsedPrices} onCheckedChange={setUseUsedPrices} />
              </div>

              <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-1 lg:max-h-none">
                {categories.map((cat) => {
                  const component = currentBuild.components[cat.id];
                  const Icon = categoryIcons[cat.id] ?? Cpu;
                  const isActive = selectedCategory === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      className={`w-full rounded-2xl border p-3 text-left transition-all duration-300 ${isActive
                          ? "border-primary bg-primary/5 shadow-[0_10px_24px_hsl(var(--primary)/0.12)]"
                          : "border-border/50 hover:border-primary/50 hover:bg-primary/5"
                        }`}
                      onClick={() => setSelectedCategory(cat.id)}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `hsl(var(--${cat.color}) / 0.2)` }}
                        >
                          <Icon
                            className="h-4 w-4"
                            style={{ color: `hsl(var(--${cat.color}))` }}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{cat.name}</p>
                          {component ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {component.name}
                            </p>
                          ) : (
                            <p className="text-xs text-muted-foreground">Chưa chọn</p>
                          )}
                        </div>
                        {component ? (
                          <button
                            type="button"
                            className="rounded-full p-1 text-muted-foreground hover:bg-background/80 hover:text-destructive"
                            onClick={(event) => {
                              event.stopPropagation();
                              removeComponent(cat.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        ) : (
                          <span className="text-muted-foreground">+</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <Separator className="my-4" />

              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold">Tổng cộng</span>
                <span className="text-2xl font-bold text-gradient-primary">
                  {formatPrice(totalPrice)}
                </span>
              </div>

              <div className="space-y-2">
                <Button
                  variant="hero"
                  className="w-full gap-2"
                  onClick={addBuildToCartHandler}
                  disabled={selectedComponents.length === 0 || isAddingToCart}
                >
                  <ShoppingCart className="w-4 h-4" />
                  {isAddingToCart ? "Đang thêm combo..." : "Thêm vào giỏ hàng"}
                </Button>
                <Button
                  variant="destructive"
                  className="w-full gap-2"
                  onClick={clearBuild}
                  disabled={selectedComponents.length === 0}
                >
                  <Trash2 className="w-4 h-4" />
                  Xóa combo
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={exportBuild}
                  disabled={selectedComponents.length === 0}
                >
                  <Download className="w-4 h-4" />
                  Xuất file cấu hình
                </Button>
              </div>
            </Card>

            <div className="flex min-h-0 flex-col gap-4">
              <div className="flex flex-col justify-between gap-3 rounded-3xl border border-border/60 bg-background/80 p-4 shadow-sm md:flex-row md:items-end">
                <div>
                  <h3 className="font-display text-xl font-semibold">
                    Chọn {selectedCategoryMeta?.name ?? "linh kiện"}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isLoading
                      ? "Đang tải dữ liệu..."
                      : `${pagination.totalItems ?? 0} sản phẩm | Trang ${page}/${Math.max(
                        1,
                        Number(pagination.totalPages ?? 1),
                      )}`}
                  </p>
                </div>
                {Math.max(1, Number(pagination.totalPages ?? 1)) > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                    >
                      Trước
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= Math.max(1, Number(pagination.totalPages ?? 1))}
                      onClick={() =>
                        setPage((prev) =>
                          Math.min(Math.max(1, Number(pagination.totalPages ?? 1)), prev + 1),
                        )
                      }
                    >
                      Sau
                    </Button>
                  </div>
                )}
              </div>

              {errorMessage && (
                <p className="text-sm text-destructive">{errorMessage}</p>
              )}

              {isLoading ? (
                <Card className="p-6 border-border/50">
                  <p className="text-sm text-muted-foreground">Đang tải linh kiện...</p>
                </Card>
              ) : components.length > 0 ? (
                <>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
                    {components.map((component) => (
                      <ComponentCard
                        key={component.id}
                        component={component}
                        mode="builder"
                        compact
                      />
                    ))}
                  </div>

                  {Math.max(1, Number(pagination.totalPages ?? 1)) > 1 && (
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                      >
                        Trước
                      </Button>

                      {visiblePageItems.map((item, index) =>
                        item === "..." ? (
                          <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                            ...
                          </span>
                        ) : (
                          <Button
                            key={item}
                            variant={page === item ? "default" : "outline"}
                            size="sm"
                            onClick={() => setPage(item)}
                          >
                            {item}
                          </Button>
                        ),
                      )}

                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= Math.max(1, Number(pagination.totalPages ?? 1))}
                        onClick={() =>
                          setPage((prev) =>
                            Math.min(Math.max(1, Number(pagination.totalPages ?? 1)), prev + 1),
                          )
                        }
                      >
                        Sau
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <Card className="p-6 border-border/50">
                  <p className="text-sm text-muted-foreground">
                    Không có sản phẩm trong nhóm này.
                  </p>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function normalizeCategorySlug(value) {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) {
    return "";
  }

  if (normalized === "vga") {
    return "gpu";
  }

  if (normalized === "ssd") {
    return "storage";
  }

  if (normalized === "mainboard") {
    return "motherboard";
  }

  return normalized;
}

function toApiCategorySlug(categoryId) {
  const normalized = normalizeCategorySlug(categoryId);

  if (normalized === "gpu") {
    return "vga";
  }

  if (normalized === "motherboard") {
    return "mainboard";
  }

  if (normalized === "storage") {
    return "ssd";
  }

  return normalized;
}

function mapProductToBuilderComponent(product) {
  const category = normalizeCategorySlug(product?.category?.slug);

  if (!categoryIcons[category]) {
    return null;
  }

  return {
    id: Number(product.id),
    slug: product.slug,
    name: String(product.name ?? "Sản phẩm"),
    brand:
      product?.specifications?.brand ||
      product?.supplier?.name ||
      "TechBuiltAI",
    category,
    price: Number(product.price ?? 0),
    usedPrice: null,
    stock: Number(product.stockQuantity ?? 0),
    rating: 5,
    reviews: 0,
    image: product.imageUrl || "/images/component-placeholder.svg",
    isNew: false,
    isOutOfStock: Number(product.stockQuantity ?? 0) <= 0,
    specs: sanitizeSpecs(product.specifications),
    compatibility: {},
    description: String(product.name ?? ""),
  };
}

function sanitizeSpecs(specifications) {
  if (!specifications || typeof specifications !== "object") {
    return { thongTin: "Linh kiện PC" };
  }

  const entries = Object.entries(specifications).slice(0, 3);
  if (entries.length === 0) {
    return { thongTin: "Linh kiện PC" };
  }

  return entries.reduce((accumulator, [key, value]) => {
    const safeKey = String(key ?? "").trim() || "spec";
    const safeValue = String(value ?? "").trim() || "-";
    accumulator[safeKey] = safeValue;
    return accumulator;
  }, {});
}

function buildVisiblePageItems(page, totalPages) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items = new Set([1, totalPages, page]);
  if (page > 1) {
    items.add(page - 1);
  }
  if (page < totalPages) {
    items.add(page + 1);
  }

  return Array.from(items)
    .sort((a, b) => a - b)
    .reduce((accumulator, value, index, array) => {
      accumulator.push(value);
      const nextValue = array[index + 1];
      if (nextValue && nextValue - value > 1) {
        accumulator.push("...");
      }
      return accumulator;
    }, []);
}
