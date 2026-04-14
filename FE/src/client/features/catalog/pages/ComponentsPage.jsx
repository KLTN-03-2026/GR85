import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Check, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { ComponentCard } from "@/components/ComponentCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const PAGE_SIZE = 12;

export default function ComponentsPage() {
  const [searchParams] = useSearchParams();
  const [keyword, setKeyword] = useState("");
  const [keywordInput, setKeywordInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [stockStatus, setStockStatus] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [priceRange, setPriceRange] = useState([0, 50000000]);
  const [customMinPrice, setCustomMinPrice] = useState(0);
  const [customMaxPrice, setCustomMaxPrice] = useState(50000000);
  const [page, setPage] = useState(1);
  const [searchPool, setSearchPool] = useState([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

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
    sortBy !== "newest" ||
    priceRange[0] > 0 ||
    priceRange[1] < 50000000;

  useEffect(() => {
    let cancelled = false;

    async function loadFilterMetadata() {
      try {
        const response = await fetch("/api/products/overview");
        if (!response.ok) {
          throw new Error("Khong tai duoc metadata san pham");
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

        if (sortBy !== "newest") {
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
          throw new Error(`Khong tai duoc san pham (${response.status})`);
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
            error instanceof Error ? error.message : "Khong tai duoc san pham",
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
  }, [keyword, selectedCategory, selectedBrand, stockStatus, sortBy, priceRange, page]);

  useEffect(() => {
    setCustomMinPrice(priceRange[0]);
    setCustomMaxPrice(priceRange[1]);
  }, [priceRange]);

  const totalPages = Math.max(1, Number(pagination.totalPages ?? 1));

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const applyKeywordSearch = () => {
    setPage(1);
    setKeyword(keywordInput.trim());
    setIsSearchFocused(false);
  };

  const clearFilters = () => {
    setKeyword("");
    setKeywordInput("");
    setSelectedCategory("all");
    setSelectedBrand("all");
    setStockStatus("all");
    setSortBy("newest");
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
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
              Linh kiện <span className="text-gradient-primary">PC</span>
            </h1>
            <p className="text-muted-foreground">
              Tìm kiếm theo tên hoặc mã sản phẩm, lọc kết hợp nhiều điều kiện
            </p>
          </div>

          <div className="flex flex-col md:flex-row gap-4 mb-8">
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
            </div>

            <select
              className="rounded-md border bg-background px-3 py-2 text-sm"
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value);
                setPage(1);
              }}
            >
              <option value="newest">Mới nhất</option>
              <option value="price_asc">Giá tăng dần</option>
              <option value="price_desc">Giá giảm dần</option>
              <option value="name_asc">Tên A-Z</option>
              <option value="stock_desc">Tồn kho cao</option>
            </select>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  Bộ lọc
                  {hasActiveFilters && (
                    <Badge className="bg-primary text-primary-foreground ml-1">
                      Đang lọc
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="glass border-border/50">
                <SheetHeader>
                  <SheetTitle className="font-display">Bộ lọc</SheetTitle>
                </SheetHeader>

                <div className="space-y-6 mt-6">
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
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/ai-recommend">
              <Button variant="accent" className="gap-2">
                <Sparkles className="w-4 h-4" />
                AI Gợi ý
              </Button>
            </Link>
          </div>

          <div className="hidden">
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
              variant={priceRange[1] <= 5000000 ? "default" : "outline"}
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
            <Button
              variant={selectedCategory === "all" ? "default" : "ghost"}
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
                variant={selectedCategory === category.id ? "default" : "ghost"}
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
                  {
                    categoryButtons.find((item) => item.id === selectedCategory)
                      ?.name
                  }
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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
              <Button variant="outline" onClick={clearFilters}>
                Xóa bộ lọc
              </Button>
            </div>
          )}

          {!isLoading && totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Trước
              </Button>

              {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageItem) => (
                <Button
                  key={pageItem}
                  variant={page === pageItem ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPage(pageItem)}
                >
                  {pageItem}
                </Button>
              ))}

              <Button
                variant="outline"
                size="sm"
                disabled={page === totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Sau
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function mapProductToCardData(product) {
  const categoryMap = {
    cpu: "cpu",
    ram: "ram",
    vga: "gpu",
    ssd: "storage",
    mainboard: "motherboard",
  };

  const categorySlug = String(product?.category?.slug ?? "cpu").toLowerCase();
  const category = categoryMap[categorySlug] ?? "cpu";

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
    rating: 5,
    reviews: 0,
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
    return { thongTin: "San pham linh kien" };
  }

  const entries = Object.entries(specifications).slice(0, 3);
  if (entries.length === 0) {
    return { thongTin: "San pham linh kien" };
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
