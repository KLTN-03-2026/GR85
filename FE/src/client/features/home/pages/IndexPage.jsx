import { useEffect, useMemo, useState } from "react";
import AOS from "aos";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { ComponentCard } from "@/components/ComponentCard";
import { Button } from "@/components/ui/button";
import { TOP_BUYERS } from "@/client/features/home/data/top-buyers.data";
import {
  ArrowRight,
  Cpu,
  Search,
  Sparkles,
  Shield,
  Truck,
  MessageCircle,
  Trophy,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState({ categories: [], products: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [isCategorySearchFocused, setIsCategorySearchFocused] = useState(false);

  useEffect(() => {
    AOS.init({
      duration: 720,
      easing: "ease-out-cubic",
      offset: 60,
      once: false,
      mirror: true,
      disable: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      setIsLoading(true);

      try {
        const response = await fetch("/api/products/overview");
        if (!response.ok) {
          throw new Error("Không tải được dữ liệu sản phẩm");
        }

        const payload = await response.json();

        if (!cancelled) {
          setCatalog({
            categories: Array.isArray(payload.categories) ? payload.categories : [],
            products: Array.isArray(payload.products) ? payload.products : [],
          });
        }
      } catch {
        if (!cancelled) {
          setCatalog({ categories: [], products: [] });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, []);

  const featuredComponents = useMemo(() => {
    const prioritized = catalog.products
      .filter((item) => Boolean(item.isHomepageFeatured))
      .sort(
        (a, b) =>
          Number(a.displayOrder ?? 9999) - Number(b.displayOrder ?? 9999),
      );

    const fallback = catalog.products.filter(
      (item) => !Boolean(item.isHomepageFeatured),
    );

    return [...prioritized, ...fallback].slice(0, 4).map(mapProductToCardData);
  }, [catalog.products]);

  const categoryCards = useMemo(() => {
    return catalog.categories.map((category) => ({
      id: category.id,
      name: category.name,
      productCount: Number(category.productCount ?? 0),
      color: resolveCategoryColor(category.slug),
    }));
  }, [catalog.categories]);

  const totalProducts = useMemo(() => {
    return categoryCards.reduce((sum, category) => sum + category.productCount, 0);
  }, [categoryCards]);

  const filteredCategoryCards = useMemo(() => {
    const query = normalizeText(categorySearch);
    if (!query) {
      return categoryCards;
    }

    return categoryCards.filter((category) => normalizeText(category.name).includes(query));
  }, [categoryCards, categorySearch]);

  const topBuyers = useMemo(() => TOP_BUYERS, []);

  const homepageSuggestions = useMemo(() => {
    const query = searchInput.trim();
    if (!query) {
      return [];
    }

    return catalog.products
      .map((product) => {
        const candidate = `${product.name} ${product.productCode ?? product.slug ?? ""}`;
        return {
          id: product.id,
          slug: product.slug,
          label: product.name,
          score: scoreSearchCandidate(query, candidate),
        };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [catalog.products, searchInput]);

  useEffect(() => {
    AOS.refresh();
  }, [categoryCards.length, featuredComponents.length, isLoading]);

  const submitHomepageSearch = (value = searchInput) => {
    const keyword = String(value ?? "").trim();
    if (!keyword) {
      navigate("/components");
      return;
    }

    navigate(`/components?keyword=${encodeURIComponent(keyword)}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <HeroSection
        leftPanel={(
          <div className="rounded-2xl border border-primary/25 bg-background/80 p-4 shadow-[0_12px_30px_hsl(var(--primary)/0.15)] backdrop-blur-xl md:p-5" data-aos="fade-right">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-semibold text-foreground">Tìm kiếm theo danh mục</h3>
              <Cpu className="h-4 w-4 text-primary" />
            </div>

            <div className="relative mb-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={categorySearch}
                onChange={(event) => setCategorySearch(event.target.value)}
                onFocus={() => setIsCategorySearchFocused(true)}
                onBlur={() => setTimeout(() => setIsCategorySearchFocused(false), 120)}
                placeholder="Tìm danh mục..."
                className="h-10 w-full rounded-md border border-primary/20 bg-background/95 pl-10 pr-3 text-sm focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {(isCategorySearchFocused || categorySearch.trim()) && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {filteredCategoryCards.map((category) => (
                  <Link key={category.id} to={`/components?category=${category.id}`} className="group">
                    <div className="rounded-lg border border-border/70 bg-background/90 p-2 text-center transition-all duration-300 hover:border-primary/60 hover:bg-primary/10">
                      <p className="line-clamp-2 text-xs font-medium">{category.name}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{category.productCount} SP</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}

            {!isLoading && (isCategorySearchFocused || categorySearch.trim()) && filteredCategoryCards.length === 0 && (
              <p className="mt-3 text-xs text-muted-foreground">Không tìm thấy danh mục phù hợp.</p>
            )}
          </div>
        )}
        rightPanel={(
          <div className="rounded-2xl border border-primary/25 bg-background/80 p-4 shadow-[0_12px_30px_hsl(var(--primary)/0.15)] backdrop-blur-xl md:p-5" data-aos="fade-left" data-aos-delay="80">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-semibold">Top người dùng</h3>
              <Trophy className="h-4 w-4 text-primary" />
            </div>

            <div className="space-y-2">
              {topBuyers.map((buyer, index) => (
                <div key={buyer.id} className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/90 p-2">
                  <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${index === 0
                    ? "bg-amber-100 text-amber-700"
                    : index === 1
                      ? "bg-slate-200 text-slate-700"
                      : index === 2
                        ? "bg-orange-100 text-orange-700"
                        : "bg-primary/10 text-primary"
                    }`}>
                    {index + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold">{buyer.name}</p>
                    <p className="text-[10px] text-muted-foreground">{buyer.orders} đơn</p>
                  </div>
                  <p className="text-[11px] font-semibold text-emerald-600">{formatVnd(buyer.spend)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      />

      <section className="relative z-20 mt-4 pb-2 sm:mt-6">
        <div className="container mx-auto px-4">
          <div
            className="mx-auto max-w-4xl rounded-2xl border border-border/60 bg-background/95 p-4 shadow-[0_20px_45px_rgba(15,23,42,0.12)] backdrop-blur"
            data-aos="fade-up"
            data-aos-delay="80"
          >
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input
                  value={searchInput}
                  onChange={(event) => setSearchInput(event.target.value)}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setTimeout(() => setIsSearchFocused(false), 120)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      submitHomepageSearch();
                    }
                  }}
                  placeholder="Tìm linh kiện nhanh: RTX 4060, i5 12400F, B760..."
                  className="h-11 w-full rounded-md border border-input bg-background pl-10 pr-3 text-sm"
                />
              </div>
              <Button onClick={() => submitHomepageSearch()} className="h-11">
                Tìm sản phẩm
              </Button>
            </div>

            {isSearchFocused && homepageSuggestions.length > 0 && (
              <div className="mt-2 rounded-lg border border-border bg-background">
                <p className="px-3 pt-3 pb-1 text-xs uppercase tracking-wide text-muted-foreground">
                  Tên gần giống
                </p>
                <div className="py-1">
                  {homepageSuggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="block w-full px-3 py-2 text-left text-sm hover:bg-secondary"
                      onMouseDown={() => submitHomepageSearch(item.label)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-12 bg-background">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-8">
            <div data-aos="fade-right">
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">
                Sản phẩm <span className="text-gradient-accent">nổi bật</span>
              </h2>
              <p className="text-muted-foreground">
                Tổng kho hiện có {totalProducts} sản phẩm từ MySQL
              </p>
            </div>
            <Link to="/components" data-aos="fade-left" data-aos-delay="80">
              <Button variant="outline" className="gap-2">
                Xem tất cả
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredComponents.map((component, index) => (
              <div
                key={component.id}
                data-aos="fade-up"
                data-aos-delay={Math.min(index * 90, 320)}
              >
                <ComponentCard component={component} />
              </div>
            ))}
            {!isLoading && featuredComponents.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground">
                Chưa có dữ liệu sản phẩm trong hệ thống.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-12 bg-emerald-50/60">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-6">
            <FeatureItem
              icon={Sparkles}
              delay={0}
              title="AI Gợi ý thông minh"
              description="Nhập ngân sách, nhận cấu hình tối ưu"
            />

            <FeatureItem
              icon={Shield}
              delay={90}
              title="Bảo hành chính hãng"
              description="Đến 36 tháng cho tất cả linh kiện"
            />

            <FeatureItem
              icon={Truck}
              delay={180}
              title="Giao hàng nhanh"
              description="Miễn phí ship toàn quốc"
            />

            <FeatureItem
              icon={MessageCircle}
              delay={270}
              title="Hỗ trợ 24/7"
              description="Chat với AI hoặc nhân viên"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-12 relative overflow-hidden bg-background">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10" />
        <div className="container mx-auto px-4 relative z-10">
          <div
            className="glass rounded-2xl p-8 md:p-12 text-center max-w-4xl mx-auto border-primary/30"
            data-aos="zoom-in-up"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Chưa biết nên{" "}
              <span className="text-gradient-primary">build gì</span>?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Để AI của chúng tôi gợi ý cấu hình tối ưu dựa trên ngân sách và
              nhu cầu sử dụng của bạn!
            </p>
            <Link to="/ai-recommend">
              <Button variant="hero" size="xl" className="gap-2">
                <Sparkles className="w-5 h-5" />
                Thử AI Gợi ý ngay
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2" data-aos="fade-right">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Cpu className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-gradient-primary">
                PC Builder
              </span>
            </div>
            <p className="text-sm text-muted-foreground" data-aos="fade-left" data-aos-delay="80">
              © 2024 PC Builder. Tất cả quyền được bảo lưu.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

function FeatureItem({ icon: Icon, title, description, delay = 0 }) {
  return (
    <div className="flex items-start gap-4 p-3" data-aos="fade-up" data-aos-delay={delay}>
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export default Index;

function mapProductToCardData(product) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    brand: product.category?.name ?? "PC Perfect",
    category: normalizeCategory(product.category?.slug),
    price: Number(product.price ?? 0),
    usedPrice: null,
    stock: Number(product.stockQuantity ?? 0),
    isOutOfStock: Number(product.stockQuantity ?? 0) <= 0,
    rating: 5,
    reviews: 0,
    image: "/images/component-placeholder.svg",
    isNew: false,
    specs: sanitizeSpecs(product.specifications),
    compatibility: {},
    description: product.name,
    // ProductDetail fields
    fullDescription: product.detail?.fullDescription ?? null,
    inTheBox: product.detail?.inTheBox ?? null,
    warrantyPolicy: product.detail?.warrantyPolicy ?? null,
    manualUrl: product.detail?.manualUrl ?? null,
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

function normalizeCategory(slug) {
  const value = String(slug ?? "").toLowerCase();

  if (value === "mainboard") {
    return "motherboard";
  }

  if (value === "vga") {
    return "gpu";
  }

  if (value === "ssd") {
    return "storage";
  }

  if (["cpu", "gpu", "ram", "storage", "motherboard", "psu", "case", "cooling"].includes(value)) {
    return value;
  }

  return "cpu";
}

function resolveCategoryColor(slug) {
  const normalized = normalizeCategory(slug);
  return normalized;
}

function formatVnd(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function scoreSearchCandidate(query, candidate) {
  const q = normalizeText(query);
  const c = normalizeText(candidate);

  if (!q || !c) {
    return 0;
  }

  if (c === q) {
    return 100;
  }

  if (c.startsWith(q)) {
    return 90;
  }

  if (c.includes(q)) {
    return 75;
  }

  const tokens = c.split(" ");
  const bestRatio = Math.max(...tokens.map((token) => levenshteinRatio(q, token)), 0);
  return bestRatio * 60;
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
