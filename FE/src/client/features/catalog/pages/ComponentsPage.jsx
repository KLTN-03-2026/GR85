import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Search, Sparkles, X } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ComponentCard } from "@/components/ComponentCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE_MS = 300;
const SEARCH_HISTORY_KEY = "techbuiltai-search-history";

export default function ComponentsPage() {
  const [searchParams] = useSearchParams();
  const [keyword, setKeyword] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [stockStatus, setStockStatus] = useState("all");
  const [featuredOnly, setFeaturedOnly] = useState(false);
  const [sortBy, setSortBy] = useState("display_order");
  const [priceRange, setPriceRange] = useState([0, 50000000]);
  const [customMinPrice, setCustomMinPrice] = useState(0);
  const [customMaxPrice, setCustomMaxPrice] = useState(50000000);
  const [page, setPage] = useState(1);
  const [jumpPageInput, setJumpPageInput] = useState("1");
  const [searchPool, setSearchPool] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);

  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, totalItems: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const hasActiveFilters =
    Boolean(keyword) ||
    selectedCategory !== "all" ||
    selectedBrand !== "all" ||
    stockStatus !== "all" ||
    featuredOnly ||
    sortBy !== "display_order" ||
    priceRange[0] > 0 ||
    priceRange[1] < 50000000;

  useEffect(() => {
    setSearchHistory(readSearchHistory());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const nextKeyword = keywordInput.trim();
      if (nextKeyword === keyword) {
        return;
      }

      setKeyword(nextKeyword);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [keywordInput, keyword]);

  useEffect(() => {
    let cancelled = false;

    async function loadFilterMetadata() {
      try {
        const response = await fetch("/api/products/overview");
        if (!response.ok) {
          throw new Error("Không tải được metadata sản phẩm");
        }

        const payload = await response.json();

        if (!cancelled) {
          setCategories(Array.isArray(payload.categories) ? payload.categories : []);

          const allBrands = new Set();
          const products = Array.isArray(payload.products) ? payload.products : [];
          setSearchPool(products);
          products.forEach((item) => {
            const brand =
              item?.specifications?.brand ||
              item?.supplier?.name ||
              "PC Perfect";
            if (brand) {
              allBrands.add(String(brand));
            }
          });

          setBrands(Array.from(allBrands).sort((a, b) => a.localeCompare(b)));
        }
      } catch {
        if (!cancelled) {
          setCategories([]);
          setBrands([]);
          setSearchPool([]);
        }
      }
    }

    loadFilterMetadata();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const categoryFromQuery = String(searchParams.get("category") ?? "")
      .trim()
      .toLowerCase();
    const keywordFromQuery = String(searchParams.get("keyword") ?? "").trim();

    if (categoryFromQuery) {
      setSelectedCategory(categoryFromQuery);
    }

    if (keywordFromQuery) {
      setKeywordInput(keywordFromQuery);
      setKeyword(keywordFromQuery);
      setPage(1);
    }
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const query = new URLSearchParams();
        query.set("page", String(page));
        query.set("pageSize", String(PAGE_SIZE));

        if (keyword) {
          query.set("keyword", keyword);
        }

        if (selectedCategory !== "all") {
          query.set("category", selectedCategory);
        }

        if (selectedBrand !== "all") {
          query.set("brand", selectedBrand);
        }

        if (stockStatus !== "all") {
          query.set("stockStatus", stockStatus);
        }

        if (featuredOnly) {
          query.set("featuredOnly", "true");
        }

        if (sortBy !== "display_order") {
          query.set("sort", sortBy);
        }

        if (priceRange[0] > 0) {
          query.set("minPrice", String(priceRange[0]));
        }

        if (priceRange[1] < 50000000) {
          query.set("maxPrice", String(priceRange[1]));
        }

        const response = await fetch(`/api/products?${query.toString()}`);
        if (!response.ok) {
          throw new Error(`Không tải được sản phẩm (${response.status})`);
        }

        const payload = await response.json();

        if (!cancelled) {
          const mapped = (Array.isArray(payload.items) ? payload.items : []).map(
            mapProductToCardData,
          );

          setItems(mapped);
          setPagination(
            payload.pagination ?? { page: 1, totalPages: 1, totalItems: 0 },
          );
        }
      } catch (error) {
        if (!cancelled) {
          setItems([]);
          setPagination({ page: 1, totalPages: 1, totalItems: 0 });
          setErrorMessage(
            error instanceof Error ? error.message : "Không tải được sản phẩm",
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
  }, [keyword, selectedCategory, selectedBrand, stockStatus, featuredOnly, sortBy, priceRange, page]);

  useEffect(() => {
    setCustomMinPrice(priceRange[0]);
    setCustomMaxPrice(priceRange[1]);
  }, [priceRange]);

  const totalPages = Math.max(1, Number(pagination.totalPages ?? 1));
  const visiblePageItems = useMemo(
    () => buildVisiblePageItems(page, totalPages),
    [page, totalPages],
  );

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    setJumpPageInput(String(page));
  }, [page]);

  const applyKeywordSearch = () => {
    const normalizedKeyword = keywordInput.trim();
    setPage(1);
    setKeyword(normalizedKeyword);
    pushSearchHistory(normalizedKeyword, setSearchHistory);
    setIsSearchFocused(false);
  };

  const clearFilters = () => {
    setKeyword("");
    setKeywordInput("");
    setSelectedCategory("all");
    setSelectedBrand("all");
    setStockStatus("all");
    setFeaturedOnly(false);
    setSortBy("display_order");
    setPriceRange([0, 50000000]);
    setCustomMinPrice(0);
    setCustomMaxPrice(50000000);
    setPage(1);
  };

  const suggestions = useMemo(() => {
    const query = keywordInput.trim();
    if (!query) {
      return [];
    }

    return searchPool
      .map((product) => {
        const candidateName = String(product?.name ?? "");
        const candidateCode = String(product?.productCode ?? product?.slug ?? "");
        const score = scoreSearchCandidate(query, `${candidateName} ${candidateCode}`);
        return {
          id: product.id,
          label: candidateName,
          code: candidateCode,
          slug: product.slug,
          score,
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [keywordInput, searchPool]);

  const applySuggestedKeyword = (value) => {
    setKeywordInput(value);
    setKeyword(value);
    setPage(1);
    pushSearchHistory(value, setSearchHistory);
    setIsSearchFocused(false);
  };

  const applyPriceInputs = () => {
    const min = clampPrice(customMinPrice);
    const max = clampPrice(customMaxPrice);
    const normalizedMin = Math.min(min, max);
    const normalizedMax = Math.max(min, max);
    setPriceRange([normalizedMin, normalizedMax]);
    setPage(1);
  };

  const jumpToPage = () => {
    const parsed = Number.parseInt(jumpPageInput, 10);
    if (!Number.isFinite(parsed)) {
      setJumpPageInput(String(page));
      return;
    }

    const targetPage = Math.max(1, Math.min(totalPages, parsed));
    setPage(targetPage);
    setJumpPageInput(String(targetPage));
  };

  const categoryButtons = useMemo(
    () =>
      categories.map((item) => ({
        id: item.slug,
        name: item.name,
      })),
    [categories],
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <aside className="h-fit space-y-6 rounded-lg border border-border bg-card p-4 sticky top-24 self-start">
              <div className="space-y-3">
                <Label>Bộ lọc nhanh</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={stockStatus === "in-stock" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setStockStatus((prev) => (prev === "in-stock" ? "all" : "in-stock"));
                      setPage(1);
                    }}
                    className="gap-1"
                  >
                    {stockStatus === "in-stock" && <Check className="h-3.5 w-3.5" />}
                    Còn hàng
                  </Button>
                  <Button
                    variant={priceRange[0] === 0 && priceRange[1] <= 5000000 ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setPriceRange((prev) => {
                        if (prev[0] === 0 && prev[1] <= 5000000) {
                          return [0, 50000000];
                        }
                        return [0, 5000000];
                      });
                      setPage(1);
                    }}
                  >
                    Dưới 5 triệu
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <Label>Danh mục</Label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={selectedCategory === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      setSelectedCategory("all");
                      setPage(1);
                    }}
                  >
                    Tất cả
                  </Button>
                  {categoryButtons.map((category) => (
                    <Button
                      key={category.id}
                      variant={selectedCategory === category.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setSelectedCategory(category.id);
                        setPage(1);
                      }}
                    >
                      {category.name}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Hãng sản xuất</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={selectedBrand}
                  onChange={(event) => {
                    setSelectedBrand(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">Tất cả</option>
                  {brands.map((brand) => (
                    <option key={brand} value={brand}>
                      {brand}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Tình trạng hàng</Label>
                <select
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  value={stockStatus}
                  onChange={(event) => {
                    setStockStatus(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="all">Tất cả</option>
                  <option value="in-stock">Còn hàng</option>
                  <option value="out-of-stock">Hết hàng</option>
                </select>
              </div>

              <div className="space-y-4">
                <Label>Khoảng giá</Label>
                <Slider
                  value={priceRange}
                  onValueChange={(values) => {
                    setPriceRange(values);
                    setPage(1);
                  }}
                  min={0}
                  max={50000000}
                  step={500000}
                />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{formatPrice(priceRange[0])}</span>
                  <span>{formatPrice(priceRange[1])}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    type="number"
                    min={0}
                    step={500000}
                    value={customMinPrice}
                    onChange={(event) => setCustomMinPrice(Number(event.target.value || 0))}
                  />
                  <Input
                    type="number"
                    min={0}
                    step={500000}
                    value={customMaxPrice}
                    onChange={(event) => setCustomMaxPrice(Number(event.target.value || 0))}
                  />
                </div>
                <Button variant="outline" className="w-full" onClick={applyPriceInputs}>
                  Áp dụng khoảng giá
                </Button>
              </div>

              {hasActiveFilters && (
                <Button variant="outline" className="w-full" onClick={clearFilters}>
                  Xóa bộ lọc
                </Button>
              )}
            </aside>

            <section>
              <div className="sticky top-24 z-20 mb-8 rounded-lg border border-border/60 bg-background/95 p-3 backdrop-blur supports-[backdrop-filter]:bg-background/80">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="relative flex-1">
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                        <Input
                          type="text"
                          placeholder="Tìm tên hoặc mã sản phẩm..."
                          value={keywordInput}
                          onChange={(event) => setKeywordInput(event.target.value)}
                          onFocus={() => setIsSearchFocused(true)}
                          onBlur={() => {
                            setTimeout(() => setIsSearchFocused(false), 150);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              applyKeywordSearch();
                            }
                          }}
                          className="pl-10"
                        />
                      </div>
                      <Button onClick={applyKeywordSearch}>Tìm</Button>
                    </div>

                    {isSearchFocused && suggestions.length > 0 && (
                      <div className="absolute z-20 mt-2 w-full rounded-lg border border-border bg-background shadow-lg">
                        <p className="px-3 pt-3 pb-1 text-xs uppercase tracking-wide text-muted-foreground">
                          Gợi ý gần đúng
                        </p>
                        <div className="py-1">
                          {suggestions.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-secondary"
                              onMouseDown={() => applySuggestedKeyword(item.label)}
                            >
                              <span>{item.label}</span>
                              <span className="text-xs text-muted-foreground">{item.code}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {isSearchFocused && suggestions.length === 0 && searchHistory.length > 0 && !keywordInput.trim() && (
                      <div className="absolute z-20 mt-2 w-full rounded-lg border border-border bg-background shadow-lg">
                        <div className="flex items-center justify-between px-3 pt-3 pb-1">
                          <p className="text-xs uppercase tracking-wide text-muted-foreground">
                            Lịch sử tìm kiếm
                          </p>
                          <button
                            type="button"
                            className="text-xs text-muted-foreground hover:text-foreground"
                            onMouseDown={() => {
                              clearSearchHistory();
                              setSearchHistory([]);
                            }}
                          >
                            Xóa
                          </button>
                        </div>
                        <div className="py-1">
                          {searchHistory.map((item) => (
                            <button
                              key={item}
                              type="button"
                              className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-secondary"
                              onMouseDown={() => applySuggestedKeyword(item)}
                            >
                              <span>{item}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                <select
                  className="rounded-md border bg-background px-3 py-2 text-sm"
                  value={sortBy}
                  onChange={(event) => {
                    setSortBy(event.target.value);
                    setPage(1);
                  }}
                >
                  <option value="display_order">Thứ tự ưu tiên</option>
                  <option value="best_selling">Đang bán chạy</option>
                  <option value="newest">Mới nhất</option>
                  <option value="price_asc">Giá tăng dần</option>
                  <option value="price_desc">Giá giảm dần</option>
                  <option value="name_asc">Tên A-Z</option>
                  <option value="stock_desc">Tồn kho cao</option>
                </select>

                <Link to="/ai-recommend">
                  <Button variant="accent" className="gap-2">
                    <Sparkles className="w-4 h-4" />
                    AI Gợi ý
                  </Button>
                </Link>
                </div>
              </div>

              {hasActiveFilters && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {keyword && (
                    <Badge variant="secondary" className="gap-1">
                      Từ khóa: {keyword}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => {
                          setKeyword("");
                          setKeywordInput("");
                          setPage(1);
                        }}
                      />
                    </Badge>
                  )}
                  {selectedCategory !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      {categoryButtons.find((item) => item.id === selectedCategory)?.name}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => {
                          setSelectedCategory("all");
                          setPage(1);
                        }}
                      />
                    </Badge>
                  )}
                  {selectedBrand !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      Hãng: {selectedBrand}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => {
                          setSelectedBrand("all");
                          setPage(1);
                        }}
                      />
                    </Badge>
                  )}
                  {stockStatus !== "all" && (
                    <Badge variant="secondary" className="gap-1">
                      {stockStatus === "in-stock" ? "Còn hàng" : "Hết hàng"}
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => {
                          setStockStatus("all");
                          setPage(1);
                        }}
                      />
                    </Badge>
                  )}
                  {featuredOnly && (
                    <Badge variant="secondary" className="gap-1">
                      Sản phẩm nổi bật
                      <X
                        className="w-3 h-3 cursor-pointer"
                        onClick={() => {
                          setFeaturedOnly(false);
                          setPage(1);
                        }}
                      />
                    </Badge>
                  )}
                </div>
              )}

              <p className="text-sm text-muted-foreground mb-6">
                {isLoading
                  ? "Đang tải dữ liệu sản phẩm..."
                  : `Hiển thị ${items.length} / ${pagination.totalItems ?? 0} sản phẩm`}
              </p>

              {!isLoading && errorMessage && (
                <p className="mb-6 text-sm text-destructive">{errorMessage}</p>
              )}

              {!isLoading && items.length > 0 ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
                  {items.map((component) => (
                    <ComponentCard key={component.id} component={component} />
                  ))}
                </div>
              ) : isLoading ? (
                <div className="text-center py-20">
                  <p className="text-muted-foreground">Đang tải dữ liệu sản phẩm...</p>
                </div>
              ) : (
                <div className="text-center py-20">
                  <p className="text-muted-foreground mb-4">Không tìm thấy sản phẩm</p>
                  {featuredOnly && (
                    <p className="mb-4 text-xs text-amber-600">
                      Chưa có sản phẩm nổi bật. Vào trang admin sản phẩm để bật nút "Đặt nổi bật".
                    </p>
                  )}
                  <Button variant="outline" onClick={clearFilters}>
                    Xóa bộ lọc
                  </Button>
                </div>
              )}

              {!isLoading && totalPages > 1 && (
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
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
                      disabled={page === totalPages}
                      onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                    >
                      Sau
                    </Button>
                  </div>

                  <div className="ml-0 flex items-center gap-2 sm:ml-4">
                    <Input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={jumpPageInput}
                      onChange={(event) => setJumpPageInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          jumpToPage();
                        }
                      }}
                      className="h-9 w-24"
                    />
                    <Button size="sm" variant="secondary" onClick={jumpToPage}>
                      Đến
                    </Button>
                  </div>
                </div>
              )}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function buildVisiblePageItems(page, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const slidingStart = Math.max(1, Math.min(page - 1, totalPages - 5));

  return [
    slidingStart,
    slidingStart + 1,
    slidingStart + 2,
    "...",
    totalPages - 2,
    totalPages - 1,
    totalPages,
  ];
}

function mapProductToCardData(product) {
  const categoryMap = {
    cpu: "cpu",
    gpu: "gpu",
    ram: "ram",
    storage: "storage",
    motherboard: "motherboard",
    psu: "psu",
    case: "case",
    cooling: "cooling",
    hdd: "hdd",
    monitor: "monitor",
    mouse: "mouse",
    keyboard: "keyboard",
    headset: "headset",
    speaker: "speaker",
    webcam: "webcam",
    microphone: "microphone",
    cable: "cable",
    hub: "hub",
    stand: "stand",
    pad: "pad",
    vga: "gpu",
    ssd: "storage",
    mainboard: "motherboard",
  };

  const categorySlug = String(product?.category?.slug ?? "cpu").toLowerCase();
  const category = categoryMap[categorySlug] ?? categorySlug;

  const reviewCountRaw = Number(product?.reviewCount ?? product?.reviews ?? 0);
  const reviewCount = Number.isFinite(reviewCountRaw) && reviewCountRaw > 0 ? reviewCountRaw : 0;
  const ratingRaw = Number(product?.rating);
  const rating = reviewCount > 0 && Number.isFinite(ratingRaw)
    ? Math.max(0, Math.min(5, ratingRaw))
    : 5;

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    productCode: product.productCode,
    brand:
      product?.specifications?.brand ||
      product?.supplier?.name ||
      "PC Perfect",
    category,
    price: Number(product.price ?? 0),
    usedPrice: null,
    stock: Number(product.stockQuantity ?? 0),
    rating,
    reviews: reviewCount,
    image: product.imageUrl || "/images/component-placeholder.svg",
    isNew: false,
    isOutOfStock: Boolean(product.isOutOfStock),
    specs: sanitizeSpecs(product.specifications),
    compatibility: {},
    description: product.name,
  };
}

function sanitizeSpecs(specifications) {
  if (!specifications || typeof specifications !== "object") {
    return { thongTin: "Sản phẩm linh kiện" };
  }

  const entries = Object.entries(specifications).slice(0, 3);
  if (entries.length === 0) {
    return { thongTin: "Sản phẩm linh kiện" };
  }

  return Object.fromEntries(entries);
}

function formatPrice(value) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function scoreSearchCandidate(query, candidate) {
  const q = normalizeText(query);
  const c = normalizeText(candidate);

  if (!q || !c) {
    return 0;
  }

  if (c === q) {
    return 120;
  }

  if (c.startsWith(q)) {
    return 100;
  }

  if (c.includes(q)) {
    return 80;
  }

  const qTokens = q.split(" ").filter(Boolean);
  const cTokens = c.split(" ").filter(Boolean);
  const tokenHits = qTokens.filter((token) => cTokens.some((part) => part.startsWith(token))).length;
  const similarity = Math.max(...cTokens.map((token) => levenshteinRatio(q, token)), 0);

  return tokenHits * 18 + similarity * 60;
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function levenshteinRatio(a, b) {
  const dist = levenshteinDistance(a, b);
  const longest = Math.max(a.length, b.length, 1);
  return 1 - dist / longest;
}

function levenshteinDistance(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i += 1) {
    dp[i][0] = i;
  }

  for (let j = 0; j <= n; j += 1) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost,
      );
    }
  }

  return dp[m][n];
}

function clampPrice(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return 0;
  }
  return Math.max(0, Math.min(50000000, Math.round(num / 500000) * 500000));
}

function readSearchHistory() {
  try {
    const raw = window.localStorage.getItem(SEARCH_HISTORY_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === "string" && item.trim()).slice(0, 8)
      : [];
  } catch {
    return [];
  }
}

function pushSearchHistory(keyword, setHistory) {
  const normalizedKeyword = String(keyword ?? "").trim();
  if (!normalizedKeyword) {
    return;
  }

  const next = [
    normalizedKeyword,
    ...readSearchHistory().filter((item) => item.toLowerCase() !== normalizedKeyword.toLowerCase()),
  ].slice(0, 8);

  window.localStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(next));
  setHistory(next);
}

function clearSearchHistory() {
  window.localStorage.removeItem(SEARCH_HISTORY_KEY);
}
