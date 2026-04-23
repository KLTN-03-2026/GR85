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
  CheckCircle2,
  CircleDashed,
  ArrowRight,
} from "lucide-react";

const PAGE_SIZE = 10;
const ACCESSORY_GROUP_ID = "accessories";
const DEFAULT_ACCESSORY_CATEGORY = "monitor";
const ACCESSORY_CATEGORY_IDS = [
  "monitor",
  "mouse",
  "keyboard",
  "headset",
  "speaker",
  "webcam",
  "microphone",
  "cable",
  "hub",
  "stand",
  "pad",
];

const categoryIcons = {
  cpu: Cpu,
  gpu: Monitor,
  ram: MemoryStick,
  storage: HardDrive,
  motherboard: CircuitBoard,
  psu: Zap,
  case: Box,
  cooling: Fan,
  monitor: Monitor,
  mouse: Package,
  keyboard: Package,
  headset: Package,
  speaker: Package,
  webcam: Package,
  microphone: Package,
  cable: Package,
  hub: Package,
  stand: Package,
  pad: Package,
};

const defaultBuilderCategories = [
  { id: "cpu", name: "Bộ xử lý (CPU)", color: "cpu" },
  { id: "gpu", name: "Card đồ họa (VGA)", color: "gpu" },
  { id: "motherboard", name: "Bo mạch chủ", color: "motherboard" },
  { id: "ram", name: "Bộ nhớ RAM", color: "ram" },
  { id: "storage", name: "Ổ lưu trữ (SSD)", color: "storage" },
  { id: "psu", name: "Nguồn (PSU)", color: "psu" },
  { id: "case", name: "Vỏ máy", color: "case" },
  { id: "cooling", name: "Tản nhiệt", color: "cooling" },
  { id: "monitor", name: "Màn hình", color: "monitor" },
  { id: "mouse", name: "Chuột", color: "mouse" },
  { id: "keyboard", name: "Bàn phím", color: "keyboard" },
  { id: "headset", name: "Tai nghe", color: "headset" },
  { id: "speaker", name: "Loa", color: "speaker" },
  { id: "webcam", name: "Webcam", color: "webcam" },
  { id: "microphone", name: "Micrô", color: "microphone" },
  { id: "cable", name: "Cáp", color: "cable" },
  { id: "hub", name: "Bộ chia cổng", color: "hub" },
  { id: "stand", name: "Giá đỡ", color: "stand" },
  { id: "pad", name: "Lót chuột", color: "pad" },
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
  const [selectedAccessoryCategory, setSelectedAccessoryCategory] = useState(
    DEFAULT_ACCESSORY_CATEGORY,
  );
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
        const categoryToLoad =
          selectedCategory === ACCESSORY_GROUP_ID
            ? selectedAccessoryCategory
            : selectedCategory;

        query.set("category", toApiCategorySlug(categoryToLoad));
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
  }, [page, selectedCategory, selectedAccessoryCategory]);

  useEffect(() => {
    setPage(1);
  }, [selectedCategory, selectedAccessoryCategory]);

  const accessoryCategories = useMemo(
    () => categories.filter((item) => isAccessoryCategory(item.id)),
    [categories],
  );

  const displayCategories = useMemo(() => {
    const primaryCategories = categories.filter((item) => !isAccessoryCategory(item.id));

    if (accessoryCategories.length > 0) {
      primaryCategories.push({
        id: ACCESSORY_GROUP_ID,
        name: "Linh kiện phụ",
        color: "monitor",
      });
    }

    return primaryCategories;
  }, [categories, accessoryCategories]);

  useEffect(() => {
    const totalPages = Math.max(1, Number(pagination.totalPages ?? 1));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, pagination.totalPages]);

  const selectedCategoryMeta = useMemo(() => {
    if (selectedCategory === ACCESSORY_GROUP_ID) {
      return (
        accessoryCategories.find((item) => item.id === selectedAccessoryCategory) ??
        accessoryCategories[0]
      );
    }

    return categories.find((item) => item.id === selectedCategory) ?? categories[0];
  }, [categories, selectedCategory, accessoryCategories, selectedAccessoryCategory]);

  const visiblePageItems = useMemo(
    () => buildVisiblePageItems(page, Math.max(1, Number(pagination.totalPages ?? 1))),
    [page, pagination.totalPages],
  );

  const selectedComponents = useMemo(
    () => Object.values(currentBuild.components).filter(Boolean),
    [currentBuild.components],
  );

  const selectedAccessoryCount = useMemo(
    () =>
      Object.entries(currentBuild.components).filter(
        ([category, component]) => isAccessoryCategory(category) && Boolean(component),
      ).length,
    [currentBuild.components],
  );

  const selectedAccessoryCategoryMeta = useMemo(
    () => accessoryCategories.find((item) => item.id === selectedAccessoryCategory),
    [accessoryCategories, selectedAccessoryCategory],
  );

  const selectedAccessoryComponent = useMemo(
    () => currentBuild.components[selectedAccessoryCategory] ?? null,
    [currentBuild.components, selectedAccessoryCategory],
  );

  const selectedAccessoryEntries = useMemo(
    () =>
      accessoryCategories
        .map((category) => ({
          categoryId: category.id,
          categoryName: category.name,
          component: currentBuild.components[category.id] ?? null,
        }))
        .filter((item) => Boolean(item.component)),
    [accessoryCategories, currentBuild.components],
  );

  const selectedMainEntries = useMemo(
    () =>
      categories
        .filter((category) => !isAccessoryCategory(category.id))
        .map((category) => ({
          categoryId: category.id,
          categoryName: category.name,
          component: currentBuild.components[category.id] ?? null,
        }))
        .filter((item) => Boolean(item.component)),
    [categories, currentBuild.components],
  );

  const primaryCategories = useMemo(
    () => categories.filter((category) => !isAccessoryCategory(category.id)),
    [categories],
  );

  const missingPrimaryCategories = useMemo(
    () =>
      primaryCategories.filter((category) => !currentBuild.components[category.id]),
    [primaryCategories, currentBuild.components],
  );

  const completedPrimaryCount = primaryCategories.length - missingPrimaryCategories.length;
  const completionPercent =
    primaryCategories.length > 0
      ? Math.round((completedPrimaryCount / primaryCategories.length) * 100)
      : 0;

  const categoryNameMap = useMemo(
    () => new Map(categories.map((item) => [item.id, item.name])),
    [categories],
  );

  const formatPrice = (price) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);

  const exportRows = useMemo(
    () =>
      Object.entries(currentBuild.components)
        .filter(([, component]) => Boolean(component))
        .map(([category, component]) => ({
          category: categoryNameMap.get(category) ?? category,
          name: component?.name ?? "",
          brand: component?.brand ?? "",
          price: useUsedPrices && component?.usedPrice ? component.usedPrice : component?.price,
        })),
    [currentBuild.components, categoryNameMap, useUsedPrices],
  );

  const exportBuildExcel = () => {
    const header = ["Danh mục", "Tên linh kiện", "Hãng", "Giá (VND)"];
    const lines = [
      header,
      ...exportRows.map((item) => [item.category, item.name, item.brand, String(item.price ?? 0)]),
      ["", "", "Tổng cộng", String(totalPrice)],
    ];

    const csvContent = lines
      .map((line) =>
        line
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(","),
      )
      .join("\n");

    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `pc-build-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportBuildPdf = () => {
    const contentRows = exportRows
      .map(
        (item) => `
          <tr>
            <td>${escapeHtml(item.category)}</td>
            <td>${escapeHtml(item.name)}</td>
            <td>${escapeHtml(item.brand)}</td>
            <td style="text-align:right;">${formatPrice(item.price ?? 0)}</td>
          </tr>`,
      )
      .join("");

    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=960,height=720");
    if (!printWindow) {
      return;
    }

    printWindow.document.write(`
      <html>
        <head>
          <title>Cau hinh PC</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            p { margin: 0 0 16px; color: #444; }
            table { width: 100%; border-collapse: collapse; margin-top: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; font-size: 13px; }
            th { background: #f6f6f6; text-align: left; }
            .total { margin-top: 14px; font-size: 16px; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Cau hinh tu rap</h1>
          <p>Ngay xuat: ${new Date().toLocaleDateString("vi-VN")}</p>
          <table>
            <thead>
              <tr>
                <th>Danh muc</th>
                <th>Ten linh kien</th>
                <th>Hang</th>
                <th>Gia</th>
              </tr>
            </thead>
            <tbody>${contentRows}</tbody>
          </table>
          <p class="total">Tong cong: ${formatPrice(totalPrice)}</p>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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

  const jumpToNextMissingPrimary = () => {
    const nextMissing = missingPrimaryCategories[0];
    if (!nextMissing) {
      return;
    }
    setSelectedCategory(nextMissing.id);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-20 pb-6">
        <div className="container mx-auto px-4">
          <div className="mb-4">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
              Tự <span className="text-gradient-primary">ráp PC</span>
            </h1>
            <p className="text-muted-foreground">
              Chọn linh kiện theo cách của bạn
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[295px_minmax(0,1fr)] lg:min-h-[calc(100vh-8.25rem)]">
            <Card className="glass border-primary/20 p-3.5 lg:sticky lg:top-20 lg:h-[calc(100vh-8.25rem)] lg:overflow-y-auto">
              <div className="sticky top-0 z-10 mb-3 flex items-center justify-between bg-card/95 pb-2 backdrop-blur">
                <div>
                  <h2 className="font-display text-lg font-bold">Cấu hình của bạn</h2>
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

              <div className="mb-3 rounded-lg border border-border/70 bg-background/70 p-2">
                <p className="text-xs font-semibold text-foreground">
                  Bước 1: Chọn linh kiện chính ({completedPrimaryCount}/{primaryCategories.length})
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${completionPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-[0.72rem] text-muted-foreground">
                  {missingPrimaryCategories.length > 0
                    ? `Còn thiếu: ${missingPrimaryCategories.map((item) => item.name).join(", ")}`
                    : "Bạn đã chọn đủ linh kiện chính. Có thể thêm linh kiện phụ ở bước 2."}
                </p>
                {missingPrimaryCategories.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2 h-7 w-full justify-between text-[0.72rem]"
                    onClick={jumpToNextMissingPrimary}
                  >
                    Chọn linh kiện còn thiếu tiếp theo
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                )}
              </div>


              <div className="grid max-h-[38vh] grid-cols-2 gap-1 overflow-y-auto pr-1 lg:max-h-none">
                {displayCategories.map((cat) => {
                  const isAccessoryGroup = cat.id === ACCESSORY_GROUP_ID;
                  const component = isAccessoryGroup ? null : currentBuild.components[cat.id];
                  const Icon = categoryIcons[cat.id] ?? Cpu;
                  const isActive = selectedCategory === cat.id;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      title={cat.name}
                      className={`w-full rounded-xl border px-2 py-1.5 text-left transition-all duration-300 ${isActive
                        ? "border-primary bg-primary/5 shadow-[0_10px_24px_hsl(var(--primary)/0.12)]"
                        : "border-border/50 hover:border-primary/50 hover:bg-primary/5"
                        }`}
                      onClick={() => {
                        setSelectedCategory(cat.id);
                        if (cat.id === ACCESSORY_GROUP_ID && accessoryCategories.length > 0) {
                          setSelectedAccessoryCategory(
                            accessoryCategories.some((item) => item.id === selectedAccessoryCategory)
                              ? selectedAccessoryCategory
                              : accessoryCategories[0].id,
                          );
                        }
                      }}
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                          style={{ backgroundColor: `hsl(var(--${cat.color}) / 0.2)` }}
                        >
                          <Icon
                            className="h-3 w-3"
                            style={{ color: `hsl(var(--${cat.color}))` }}
                          />
                        </div>
                        {isAccessoryGroup ? (
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[0.82rem] font-medium leading-tight">
                              {cat.name}
                            </p>
                            <p className="truncate text-[0.7rem] text-muted-foreground">
                              {selectedAccessoryCategoryMeta?.name ?? "Chưa chọn loại"}
                            </p>
                          </div>
                        ) : (
                          <p className="min-w-0 flex-1 text-[0.82rem] font-medium leading-tight line-clamp-2">
                            {cat.name}
                          </p>
                        )}
                        {!isAccessoryGroup && (
                          Boolean(component) ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <CircleDashed className="h-3.5 w-3.5 text-muted-foreground" />
                          )
                        )}
                        {(isAccessoryGroup ? selectedAccessoryCount > 0 : Boolean(component)) ? (
                          <button
                            type="button"
                            className="rounded-full p-0.5 text-muted-foreground hover:bg-background/80 hover:text-destructive"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (isAccessoryGroup) {
                                ACCESSORY_CATEGORY_IDS.forEach((categoryId) => {
                                  removeComponent(categoryId);
                                });
                                return;
                              }
                              removeComponent(cat.id);
                            }}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        ) : (
                          <span className="text-sm text-muted-foreground">+</span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <Separator className="my-4" />

              <div className="flex items-center justify-between mb-4">
                <span className="font-semibold">Tổng cộng</span>
                <span className="text-xl font-bold text-gradient-primary">
                  {formatPrice(totalPrice)}
                </span>
              </div>

              {(selectedMainEntries.length > 0 || selectedAccessoryEntries.length > 0) && (
                <div className="mb-3 rounded-lg border border-border/70 bg-background/60 p-2">
                  <p className="mb-1 text-[0.72rem] font-semibold uppercase tracking-wide text-muted-foreground">
                    Linh kiện đã chọn
                  </p>
                  <div className="max-h-28 space-y-1 overflow-y-auto pr-1">
                    {selectedMainEntries.map((item) => (
                      <p key={`main-${item.categoryId}`} className="truncate text-[0.74rem] text-foreground">
                        {item.categoryName}: {item.component?.name}
                      </p>
                    ))}
                    {selectedAccessoryEntries.map((item) => (
                      <p key={`acc-${item.categoryId}`} className="truncate text-[0.74rem] text-foreground">
                        {item.categoryName}: {item.component?.name}
                      </p>
                    ))}
                  </div>
                </div>
              )}

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
                  onClick={exportBuildExcel}
                  disabled={selectedComponents.length === 0}
                >
                  <Download className="w-4 h-4" />
                  Xuất Excel
                </Button>
                <Button
                  variant="outline"
                  className="w-full gap-2"
                  onClick={exportBuildPdf}
                  disabled={selectedComponents.length === 0}
                >
                  <Download className="w-4 h-4" />
                  Xuất PDF
                </Button>
              </div>
            </Card>

            <div className="flex min-h-0 flex-col gap-4">
              <div className="flex flex-col justify-between gap-3 rounded-3xl border border-border/60 bg-background/80 p-4 shadow-sm md:flex-row md:items-end">
                <div>
                  <h3 className="font-display text-xl font-semibold">
                    {selectedCategory === ACCESSORY_GROUP_ID
                      ? `Bước 2: Chọn linh kiện phụ (${selectedAccessoryCategoryMeta?.name ?? ""})`
                      : `Bước 1: Chọn ${selectedCategoryMeta?.name ?? "linh kiện"}`}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isLoading
                      ? "Đang tải dữ liệu..."
                      : `${pagination.totalItems ?? 0} sản phẩm | Trang ${page}/${Math.max(
                        1,
                        Number(pagination.totalPages ?? 1),
                      )}`}
                  </p>
                  {selectedCategory === ACCESSORY_GROUP_ID && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Đang ở: Linh kiện phụ &gt; {selectedAccessoryCategoryMeta?.name ?? "-"}
                      {selectedAccessoryComponent
                        ? ` | Đã chọn: ${selectedAccessoryComponent.name}`
                        : " | Chưa chọn sản phẩm"}
                    </p>
                  )}
                  {selectedCategory === ACCESSORY_GROUP_ID && selectedAccessoryEntries.length > 0 && (
                    <p className="mt-1 max-w-full truncate text-xs text-foreground">
                      Đã chọn khác: {selectedAccessoryEntries
                        .map((item) => `${item.categoryName} - ${item.component?.name}`)
                        .join(" | ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {selectedCategory === ACCESSORY_GROUP_ID && accessoryCategories.length > 0 && (
                    <select
                      className="h-9 rounded-md border bg-background px-3 text-sm"
                      value={selectedAccessoryCategory}
                      onChange={(event) => setSelectedAccessoryCategory(event.target.value)}
                    >
                      {accessoryCategories.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name}
                        </option>
                      ))}
                    </select>
                  )}

                  {Math.max(1, Number(pagination.totalPages ?? 1)) > 1 && (
                    <>
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
                    </>
                  )}
                </div>
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
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
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

function isAccessoryCategory(categoryId) {
  return ACCESSORY_CATEGORY_IDS.includes(categoryId);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
