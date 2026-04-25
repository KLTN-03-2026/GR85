import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import {
  usageTypes,
  brands,
} from "@/client/features/catalog/data/mock-components";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { requestAiBuildRecommendation } from "@/client/features/recommend/data/aiRecommend.api.js";
import { useCart } from "@/contexts/CartContext";
import {
  Sparkles,
  Loader2,
  Cpu,
  Monitor,
  MemoryStick,
  HardDrive,
  CircuitBoard,
  Zap,
  Box,
  Fan,
  ArrowRight,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

function getScoreLabel(score) {
  const value = Number(score ?? 0);
  if (value >= 80) {
    return "Tốt";
  }
  if (value >= 60) {
    return "Ổn";
  }
  return "Cần cải thiện";
}

function getScoreClass(score) {
  const value = Number(score ?? 0);
  if (value >= 80) {
    return "text-emerald-700 bg-emerald-50 border-emerald-200";
  }
  if (value >= 60) {
    return "text-amber-700 bg-amber-50 border-amber-200";
  }
  return "text-rose-700 bg-rose-50 border-rose-200";
}

export default function AIRecommendPage() {
  const navigate = useNavigate();
  const { addBuildToCart } = useCart();
  const [budget, setBudget] = useState(30000000);
  const [usage, setUsage] = useState("gaming");
  const [preferredBrands, setPreferredBrands] = useState([]);
  const [allowUsed, setAllowUsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendationData, setRecommendationData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAddingCombo, setIsAddingCombo] = useState(false);

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const toggleBrand = (brand) => {
    setPreferredBrands((prev) =>
      prev.includes(brand) ? prev.filter((b) => b !== brand) : [...prev, brand],
    );
  };

  const generateRecommendation = async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await requestAiBuildRecommendation({
        budget,
        usage,
        preferredBrands,
        allowUsed,
      });

      setRecommendationData(response);
    } catch (error) {
      setRecommendationData(null);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Không thể gửi yêu cầu AI tới backend",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const recommendation = recommendationData?.items ?? [];

  const totalPrice =
    recommendation.reduce((sum, c) => {
      const price = allowUsed && c.usedPrice ? c.usedPrice : c.price;
      return sum + price;
    }, 0) || Number(recommendationData?.totalPrice ?? 0);

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

  const addRecommendedComboToCart = async () => {
    if (!Array.isArray(recommendation) || recommendation.length === 0) {
      return;
    }

    setIsAddingCombo(true);
    try {
      await addBuildToCart({
        name: `Combo AI - ${usageTypes.find((u) => u.id === usage)?.name ?? "Tu van"}`,
        components: recommendation.map((item) => ({
          id: item.id,
          name: item.name,
          brand: item.brand,
          category: item.category,
          price: Number(item.price ?? 0),
          image: item.image,
        })),
        totalPrice,
        useUsedPrices: false,
      });

      navigate("/cart");
    } catch (error) {
      window.alert(
        error instanceof Error
          ? error.message
          : "Không thể thêm combo AI vào giỏ hàng",
      );
    } finally {
      setIsAddingCombo(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30 mb-4">
              <Sparkles className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm font-medium">Powered by AI</span>
            </div>
            <h1 className="font-display text-3xl md:text-5xl font-bold mb-4">
              AI <span className="text-gradient-primary">Gợi ý cấu hình</span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Nhập ngân sách và nhu cầu sử dụng, AI sẽ gợi ý cấu hình PC tối ưu
              nhất cho bạn
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left - Form */}
            <Card className="lg:col-span-1 glass border-primary/20 p-6 h-fit sticky top-24">
              <h2 className="font-display text-xl font-bold mb-6">
                Yêu cầu của bạn
              </h2>

              <div className="space-y-6">
                {/* Budget */}
                <div className="space-y-4">
                  <Label className="text-base">Ngân sách</Label>
                  <div className="text-3xl font-bold text-gradient-primary">
                    {formatPrice(budget)}
                  </div>
                  <Slider
                    value={[budget]}
                    onValueChange={(v) => setBudget(v[0])}
                    min={10000000}
                    max={100000000}
                    step={1000000}
                  />

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>10 triệu</span>
                    <span>100 triệu</span>
                  </div>
                </div>

                <Separator />

                {/* Usage */}
                <div className="space-y-3">
                  <Label className="text-base">Mục đích sử dụng</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {usageTypes.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setUsage(type.id)}
                        className={`p-3 rounded-lg border text-left transition-all ${usage === type.id
                            ? "border-primary bg-primary/10"
                            : "border-border/50 hover:border-primary/50"
                          }`}
                      >
                        <p className="font-medium text-sm">{type.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {type.description}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Preferred Brands */}
                <div className="space-y-3">
                  <Label className="text-base">Hãng yêu thích (tùy chọn)</Label>
                  <div className="flex flex-wrap gap-2">
                    {brands.slice(0, 8).map((brand) => (
                      <Badge
                        key={brand}
                        variant={
                          preferredBrands.includes(brand)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer"
                        onClick={() => toggleBrand(brand)}
                      >
                        {brand}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Allow Used */}
                <div className="flex items-center justify-between">
                  <Label>Cho phép đồ cũ</Label>
                  <Switch checked={allowUsed} onCheckedChange={setAllowUsed} />
                </div>

                {/* Generate Button */}
                <Button
                  variant="hero"
                  className="w-full gap-2"
                  onClick={generateRecommendation}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Đang phân tích...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Gợi ý cấu hình
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </div>
            </Card>

            {/* Right - Results */}
            <div className="lg:col-span-2">
              {!recommendationData ? (
                <div className="text-center py-20">
                  <div className="w-24 h-24 rounded-full bg-primary/10 mx-auto mb-6 flex items-center justify-center">
                    <Sparkles className="w-12 h-12 text-primary" />
                  </div>
                  <h3 className="font-display text-xl font-semibold mb-2">
                    Sẵn sàng gợi ý
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Điền thông tin ở bên trái và nhấn "Gợi ý cấu hình" để nhận
                    cấu hình PC tối ưu từ AI
                  </p>
                  {errorMessage && (
                    <p className="text-destructive text-sm mt-4">
                      {errorMessage}
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Summary */}
                  <Card className="glass border-primary/20 p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-display text-xl font-bold mb-1">
                          Cấu hình được gợi ý
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {recommendation.length} linh kiện • Tối ưu cho{" "}
                          {usageTypes.find((u) => u.id === usage)?.name}
                        </p>
                        {recommendationData?.summary && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {recommendationData.summary}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          Tổng cộng
                        </p>
                        <p className="text-2xl font-bold text-gradient-primary">
                          {formatPrice(totalPrice)}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Điểm tổng: {Number(recommendationData?.buildScore?.overall ?? 0)}/100
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                      <Button
                        variant="hero"
                        className="gap-2"
                        onClick={addRecommendedComboToCart}
                        disabled={recommendation.length === 0 || isAddingCombo}
                      >
                        {isAddingCombo ? "Dang them combo..." : "Mua ca combo"}
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-3">
                      {[
                        ["Bám ngân sách", recommendationData?.buildScore?.budget],
                        ["Tương thích", recommendationData?.buildScore?.compatibility],
                        ["Tổng thể", recommendationData?.buildScore?.overall],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-lg border border-border/60 bg-background/60 px-3 py-3">
                          <p className="text-xs text-muted-foreground">{label}</p>
                          <p className="text-sm font-semibold">{Number(value ?? 0)}/100 - {getScoreLabel(value)}</p>
                        </div>
                      ))}
                    </div>
                  </Card>

                  <Card className="glass border-border/50 p-4">
                    <h4 className="mb-3 font-semibold">Đánh giá nhanh</h4>
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <p className="mb-2 text-sm font-medium text-emerald-700">Điểm mạnh</p>
                        <div className="space-y-1.5 text-sm">
                          {(recommendationData?.strengths ?? []).slice(0, 3).map((line, index) => (
                            <p key={`${line}-${index}`}>- {line}</p>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mb-2 text-sm font-medium text-rose-700">Điểm cần cải thiện</p>
                        <div className="space-y-1.5 text-sm">
                          {(recommendationData?.weaknesses ?? []).slice(0, 3).map((line, index) => (
                            <p key={`${line}-${index}`}>- {line}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 rounded-md border border-border/60 bg-background/60 p-3">
                      <p className="mb-1 text-sm font-medium">Gợi ý hành động</p>
                      <div className="space-y-1.5 text-sm">
                        {(recommendationData?.recommendations ?? []).slice(0, 2).map((line, index) => (
                          <p key={`${line}-${index}`}>- {line}</p>
                        ))}
                      </div>
                    </div>
                  </Card>

                  {Array.isArray(recommendationData?.categoryAnalysis) && recommendationData.categoryAnalysis.length > 0 && (
                    <Card className="glass border-border/50 p-4">
                      <h4 className="mb-3 font-semibold">Đo cấu hình (dễ hiểu)</h4>
                      <div className="space-y-2">
                        {recommendationData.categoryAnalysis.slice(0, 6).map((row) => (
                          <div key={row.categorySlug} className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-3 py-2 text-sm">
                            <div>
                              <p className="font-medium uppercase">{row.category}</p>
                              <p className="text-xs text-muted-foreground">
                                Mục tiêu {formatPrice(row.targetBudget)} - Chọn {formatPrice(row.selectedPrice)}
                              </p>
                            </div>
                            <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${getScoreClass(row.selectedScore)}`}>
                              {getScoreLabel(row.selectedScore)} ({row.selectedScore})
                            </span>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}

                  {/* Components List */}
                  {recommendation.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {recommendation.map((component) => {
                        const Icon = categoryIcons[component.category] || Cpu;
                        return (
                          <Card
                            key={component.id}
                            className="glass border-border/50 p-4"
                          >
                            <div className="flex items-start gap-4">
                              <div
                                className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                                style={{
                                  backgroundColor: `hsl(var(--${component.category}) / 0.2)`,
                                }}
                              >
                                <Icon
                                  className="w-6 h-6"
                                  style={{
                                    color: `hsl(var(--${component.category}))`,
                                  }}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                  {component.category}
                                </p>
                                <p className="font-semibold line-clamp-1">
                                  {component.name}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  {component.brand}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  <Badge variant="outline">Điểm SP: {component.score?.total ?? 0}</Badge>
                                </div>
                                <p className="text-lg font-bold text-primary mt-1">
                                  {formatPrice(
                                    allowUsed && component.usedPrice
                                      ? component.usedPrice
                                      : component.price,
                                  )}
                                </p>
                                {component.slug && (
                                  <Link to={`/components/${component.slug}`} className="text-xs text-primary hover:underline">
                                    Xem chi tiết sản phẩm
                                  </Link>
                                )}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <Card className="glass border-border/50 p-6">
                      <p className="text-sm text-muted-foreground">
                        Backend đã nhận yêu cầu nhưng chưa trả về linh kiện cụ
                        thể.
                      </p>
                    </Card>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
