import { useEffect, useMemo, useState } from "react";
import AOS from "aos";
import { Navbar } from "@/components/Navbar";
import { HeroSection } from "@/components/HeroSection";
import { ComponentCard } from "@/components/ComponentCard";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Cpu, Search, Sparkles, Shield, Truck,
  MessageCircle, Trophy, Tag, Layers,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

const CATEGORY_ICONS = {
  cpu: Cpu, gpu: Layers, ram: Layers, storage: Layers,
  mainboard: Layers, motherboard: Layers, psu: Layers,
  case: Layers, cooling: Layers, vga: Layers, ssd: Layers,
};

const Index = () => {
  const navigate = useNavigate();
  const [catalog, setCatalog] = useState({ categories: [], products: [], topBuyers: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [categorySearch, setCategorySearch] = useState("");
  const [isCategorySearchFocused, setIsCategorySearchFocused] = useState(false);

  useEffect(() => {
    AOS.init({ duration: 720, easing: "ease-out-cubic", offset: 60, once: false, mirror: true, disable: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches });
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadCatalog() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/products/overview");
        if (!response.ok) throw new Error("Không tải được dữ liệu");
        const payload = await response.json();
        if (!cancelled) {
          setCatalog({
            categories: Array.isArray(payload.categories) ? payload.categories : [],
            products: Array.isArray(payload.products) ? payload.products : [],
            topBuyers: Array.isArray(payload.topBuyers) ? payload.topBuyers : [],
          });
        }
      } catch {
        if (!cancelled) setCatalog({ categories: [], products: [], topBuyers: [] });
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    loadCatalog();
    return () => { cancelled = true; };
  }, []);

  const featuredComponents = useMemo(() => {
    const prioritized = catalog.products.filter((p) => Boolean(p.isHomepageFeatured)).sort((a, b) => Number(a.displayOrder ?? 9999) - Number(b.displayOrder ?? 9999));
    const fallback = catalog.products.filter((p) => !Boolean(p.isHomepageFeatured));
    return [...prioritized, ...fallback].slice(0, 8).map(mapProductToCardData);
  }, [catalog.products]);

  const categoryCards = useMemo(() => catalog.categories.map((c) => ({ id: c.id, name: c.name, slug: c.slug, productCount: Number(c.productCount ?? 0) })), [catalog.categories]);

  const totalProducts = useMemo(() => categoryCards.reduce((s, c) => s + c.productCount, 0), [categoryCards]);

  const filteredCategoryCards = useMemo(() => {
    const q = normalizeText(categorySearch);
    return q ? categoryCards.filter((c) => normalizeText(c.name).includes(q)) : categoryCards;
  }, [categoryCards, categorySearch]);

  const homepageSuggestions = useMemo(() => {
    const q = searchInput.trim();
    if (!q) return [];
    return catalog.products.map((p) => ({ id: p.id, slug: p.slug, label: p.name, score: scoreSearchCandidate(q, `${p.name} ${p.productCode ?? p.slug ?? ""}`) })).filter((i) => i.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);
  }, [catalog.products, searchInput]);

  const saleProducts = useMemo(() => catalog.products.filter((p) => p.isFlashSaleActive).slice(0, 4).map(mapProductToCardData), [catalog.products]);

  useEffect(() => { AOS.refresh(); }, [categoryCards.length, featuredComponents.length, isLoading]);

  const submitSearch = (value = searchInput) => {
    const kw = String(value ?? "").trim();
    navigate(kw ? `/components?keyword=${encodeURIComponent(kw)}` : "/components");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />

      {/* 3-Column Layout */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-6">

          {/* LEFT SIDEBAR */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1 homepage-sidebar">
              <div className="rounded-2xl border border-emerald-200/60 bg-white p-4 shadow-sm" data-aos="fade-right">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="font-display text-base font-semibold text-slate-800">Danh mục sản phẩm</h3>
                  <Cpu className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="relative mb-3">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                  <input value={categorySearch} onChange={(e) => setCategorySearch(e.target.value)} onFocus={() => setIsCategorySearchFocused(true)} onBlur={() => setTimeout(() => setIsCategorySearchFocused(false), 120)} placeholder="Tìm danh mục..." className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
                </div>
                <div className="space-y-1">
                  {filteredCategoryCards.map((cat) => (
                    <Link key={cat.id} to={`/components?category=${cat.id}`} className="group flex items-center justify-between rounded-lg px-3 py-2 transition-all duration-200 hover:bg-emerald-50">
                      <span className="text-sm font-medium text-slate-700 group-hover:text-emerald-700">{cat.name}</span>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500 group-hover:bg-emerald-100 group-hover:text-emerald-700">{cat.productCount}</span>
                    </Link>
                  ))}
                  {!isLoading && filteredCategoryCards.length === 0 && (
                    <p className="px-3 py-2 text-xs text-slate-400">Không tìm thấy danh mục.</p>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="rounded-2xl border border-emerald-200/60 bg-white p-4 shadow-sm" data-aos="fade-right" data-aos-delay="100">
                <h3 className="mb-3 font-display text-base font-semibold text-slate-800">Thống kê kho</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><span className="text-sm text-slate-500">Tổng sản phẩm</span><span className="text-sm font-bold text-emerald-600">{totalProducts}</span></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-slate-500">Danh mục</span><span className="text-sm font-bold text-emerald-600">{categoryCards.length}</span></div>
                  <div className="flex items-center justify-between"><span className="text-sm text-slate-500">Đang sale</span><span className="text-sm font-bold text-orange-500">{saleProducts.length} SP</span></div>
                </div>
              </div>
            </div>
          </aside>

          {/* CENTER CONTENT */}
          <main className="min-w-0">
            {/* Search Bar */}
            <section className="mb-8" data-aos="fade-up" data-aos-delay="80">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                <div className="relative flex gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => setTimeout(() => setIsSearchFocused(false), 120)} onKeyDown={(e) => { if (e.key === "Enter") submitSearch(); }} placeholder="Tìm linh kiện: RTX 4060, i5 12400F, B760..." className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50/80 pl-10 pr-3 text-sm text-slate-700 placeholder:text-slate-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
                  </div>
                  <Button onClick={() => submitSearch()} className="h-11">Tìm sản phẩm</Button>
                </div>
                {isSearchFocused && homepageSuggestions.length > 0 && (
                  <div className="mt-2 rounded-lg border border-slate-200 bg-white">
                    <p className="px-3 pt-3 pb-1 text-xs uppercase tracking-wide text-slate-400">Gợi ý</p>
                    <div className="py-1">
                      {homepageSuggestions.map((item) => (
                        <button key={item.id} type="button" className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700" onMouseDown={() => submitSearch(item.label)}>{item.label}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Mobile Sidebars */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 lg:hidden">
              <div className="rounded-2xl border border-emerald-200/60 bg-white p-4 shadow-sm">
                <h3 className="mb-2 font-display text-base font-semibold text-slate-800">Danh mục</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {categoryCards.slice(0, 6).map((cat) => (
                    <Link key={cat.id} to={`/components?category=${cat.id}`} className="rounded-lg bg-emerald-50/60 px-2 py-1.5 text-center text-xs font-medium text-slate-700 hover:bg-emerald-100">{cat.name} ({cat.productCount})</Link>
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-amber-200/60 bg-white p-4 shadow-sm">
                <h3 className="mb-2 font-display text-base font-semibold text-slate-800">Top người dùng</h3>
                {catalog.topBuyers.slice(0, 3).map((b, i) => (
                  <div key={b.id} className="flex items-center gap-2 py-1">
                    <RankBadge index={i} />
                    <span className="flex-1 truncate text-xs font-medium text-slate-700">{b.name}</span>
                    <span className="text-[11px] font-semibold text-emerald-600">{formatVnd(b.spend)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Featured Products */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-6" data-aos="fade-up">
                <div>
                  <h2 className="font-display text-2xl md:text-3xl font-bold text-slate-800">Sản phẩm <span className="text-gradient-accent">nổi bật</span></h2>
                  <p className="text-sm text-slate-500 mt-1">Tổng kho hiện có {totalProducts} sản phẩm từ MySQL</p>
                </div>
                <Link to="/components"><Button variant="outline" className="gap-2 text-sm">Xem tất cả <ArrowRight className="w-4 h-4" /></Button></Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                {featuredComponents.map((c, i) => (
                  <div key={c.id} data-aos="fade-up" data-aos-delay={Math.min(i * 80, 320)}><ComponentCard component={c} /></div>
                ))}
                {!isLoading && featuredComponents.length === 0 && (
                  <p className="col-span-full text-sm text-slate-400">Chưa có dữ liệu sản phẩm.</p>
                )}
              </div>
            </section>

            {/* Sale Products */}
            {saleProducts.length > 0 && (
              <section className="mb-10">
                <div className="flex items-center justify-between mb-6" data-aos="fade-up">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100"><Tag className="h-5 w-5 text-orange-600" /></div>
                    <div>
                      <h2 className="font-display text-2xl font-bold text-slate-800">Flash Sale 🔥</h2>
                      <p className="text-sm text-slate-500">Giá tốt có hạn</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {saleProducts.map((c, i) => (
                    <div key={c.id} data-aos="fade-up" data-aos-delay={i * 80}><ComponentCard component={c} /></div>
                  ))}
                </div>
              </section>
            )}

            {/* Features */}
            <section className="mb-10 rounded-2xl bg-emerald-50/50 p-6" data-aos="fade-up">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <FeatureItem icon={Sparkles} title="AI thông minh" description="Gợi ý cấu hình tối ưu" />
                <FeatureItem icon={Shield} title="Bảo hành chính hãng" description="Đến 36 tháng" />
                <FeatureItem icon={Truck} title="Giao hàng nhanh" description="Miễn phí toàn quốc" />
                <FeatureItem icon={MessageCircle} title="Hỗ trợ 24/7" description="Chat AI hoặc nhân viên" />
              </div>
            </section>

            {/* AI CTA */}
            <section className="mb-10" data-aos="zoom-in-up">
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 p-8 md:p-10 text-center text-white">
                <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 50%, white 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                <div className="relative z-10">
                  <h2 className="font-display text-2xl md:text-3xl font-bold mb-3">Chưa biết nên <span className="text-emerald-200">build gì</span>?</h2>
                  <p className="text-emerald-100 mb-6 max-w-xl mx-auto">Để AI gợi ý cấu hình tối ưu dựa trên ngân sách và nhu cầu của bạn!</p>
                  <Link to="/ai-recommend"><Button variant="glass" size="xl" className="gap-2 bg-white/20 border-white/30 text-white hover:bg-white/30"><Sparkles className="w-5 h-5" /> Thử AI Gợi ý ngay <ArrowRight className="w-5 h-5" /></Button></Link>
                </div>
              </div>
            </section>
          </main>

          {/* RIGHT SIDEBAR */}
          <aside className="hidden lg:block">
            <div className="sticky top-20 space-y-4 max-h-[calc(100vh-6rem)] overflow-y-auto pl-1 homepage-sidebar">
              {/* Top Buyers from MySQL */}
              <div className="rounded-2xl border border-amber-200/60 bg-white p-4 shadow-sm" data-aos="fade-left">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h3 className="font-display text-base font-semibold text-slate-800">Top người dùng</h3>
                  <Trophy className="h-4 w-4 text-amber-500" />
                </div>
                <div className="space-y-2">
                  {catalog.topBuyers.length > 0 ? catalog.topBuyers.map((buyer, i) => (
                    <div key={buyer.id} className="flex items-center gap-2.5 rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 transition-colors hover:bg-amber-50/50">
                      <RankBadge index={i} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-700">{buyer.name}</p>
                        <p className="text-[11px] text-slate-400">{buyer.orders} đơn hàng</p>
                      </div>
                      <p className="text-xs font-bold text-emerald-600 whitespace-nowrap">{formatVnd(buyer.spend)}</p>
                    </div>
                  )) : (
                    <p className="text-xs text-slate-400 py-2">Chưa có dữ liệu mua hàng.</p>
                  )}
                </div>
              </div>

              {/* Category Quick Links */}
              <div className="rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm" data-aos="fade-left" data-aos-delay="100">
                <h3 className="mb-3 font-display text-base font-semibold text-slate-800">Truy cập nhanh</h3>
                <div className="grid grid-cols-2 gap-1.5">
                  {categoryCards.slice(0, 8).map((cat) => (
                    <Link key={cat.id} to={`/components?category=${cat.id}`} className="group rounded-lg border border-slate-100 bg-slate-50/50 p-2 text-center transition-all duration-200 hover:border-emerald-300 hover:bg-emerald-50">
                      <p className="text-xs font-medium text-slate-600 group-hover:text-emerald-700 line-clamp-1">{cat.name}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{cat.productCount} SP</p>
                    </Link>
                  ))}
                </div>
              </div>

              {/* AI Banner */}
              <div className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-4 text-white shadow-sm" data-aos="fade-left" data-aos-delay="200">
                <Sparkles className="h-6 w-6 mb-2 text-emerald-200" />
                <h3 className="font-display text-sm font-bold mb-1">AI Tư vấn cấu hình</h3>
                <p className="text-xs text-emerald-100 mb-3">Nhập ngân sách, nhận cấu hình tối ưu ngay!</p>
                <Link to="/ai-recommend"><Button variant="glass" size="sm" className="w-full bg-white/20 border-white/30 text-white hover:bg-white/30 text-xs">Thử ngay →</Button></Link>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white py-8 mt-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center"><Cpu className="w-4 h-4 text-primary-foreground" /></div>
              <span className="font-display font-bold text-gradient-primary">TechBuiltAI</span>
            </div>
            <p className="text-sm text-slate-400">© {new Date().getFullYear()} TechBuiltAI. Tất cả quyền được bảo lưu.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

function RankBadge({ index }) {
  const cls = index === 0 ? "bg-amber-100 text-amber-700" : index === 1 ? "bg-slate-200 text-slate-600" : index === 2 ? "bg-orange-100 text-orange-700" : "bg-emerald-50 text-emerald-600";
  return <div className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${cls}`}>{index + 1}</div>;
}

function FeatureItem({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col items-center text-center gap-2 p-3">
      <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center"><Icon className="w-5 h-5 text-emerald-600" /></div>
      <h3 className="text-sm font-semibold text-slate-700">{title}</h3>
      <p className="text-xs text-slate-400">{description}</p>
    </div>
  );
}

export default Index;

function mapProductToCardData(product) {
  return {
    id: product.id, slug: product.slug, name: product.name,
    brand: product.category?.name ?? "PC Perfect",
    category: normalizeCategory(product.category?.slug),
    price: Number(product.price ?? 0),
    usedPrice: null,
    stock: Number(product.stockQuantity ?? 0),
    isOutOfStock: Number(product.stockQuantity ?? 0) <= 0,
    rating: Number(product.rating ?? 5),
    reviews: Number(product.reviewCount ?? 0),
    image: product.imageUrl || "/images/component-placeholder.svg",
    isNew: false,
    specs: sanitizeSpecs(product.specifications),
    compatibility: {},
    description: product.name,
    fullDescription: product.detail?.fullDescription ?? null,
    inTheBox: product.detail?.inTheBox ?? null,
    warrantyPolicy: product.detail?.warrantyPolicy ?? null,
    manualUrl: product.detail?.manualUrl ?? null,
  };
}

function sanitizeSpecs(specs) {
  if (!specs || typeof specs !== "object") return { thongTin: "San pham linh kien" };
  const entries = Object.entries(specs).slice(0, 3);
  return entries.length === 0 ? { thongTin: "San pham linh kien" } : Object.fromEntries(entries);
}

function normalizeCategory(slug) {
  const v = String(slug ?? "").toLowerCase();
  if (v === "mainboard") return "motherboard";
  if (v === "vga") return "gpu";
  if (v === "ssd") return "storage";
  return ["cpu", "gpu", "ram", "storage", "motherboard", "psu", "case", "cooling"].includes(v) ? v : "cpu";
}

function formatVnd(value) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND", maximumFractionDigits: 0 }).format(Number(value ?? 0));
}

function scoreSearchCandidate(query, candidate) {
  const q = normalizeText(query), c = normalizeText(candidate);
  if (!q || !c) return 0;
  if (c === q) return 100;
  if (c.startsWith(q)) return 90;
  if (c.includes(q)) return 75;
  return Math.max(...c.split(" ").map((t) => levenshteinRatio(q, t)), 0) * 60;
}

function normalizeText(v) { return String(v ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(); }
function levenshteinRatio(a, b) { return 1 - levenshteinDistance(a, b) / Math.max(a.length, b.length, 1); }
function levenshteinDistance(a, b) {
  const m = a.length, n = b.length, dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) { const cost = a[i-1] === b[j-1] ? 0 : 1; dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost); }
  return dp[m][n];
}
