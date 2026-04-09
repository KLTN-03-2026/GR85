import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import {
  mockComponents,
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

export default function AIRecommendPage() {
  const [budget, setBudget] = useState(30000000);
  const [usage, setUsage] = useState("gaming");
  const [preferredBrands, setPreferredBrands] = useState([]);
  const [allowUsed, setAllowUsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendation, setRecommendation] = useState(null);

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
    // Simulate AI processing
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simple recommendation logic based on budget
    const budgetPerCategory = budget / 8;
    const recommended = [];
    const categories = [
      "cpu",
      "gpu",
      "ram",
      "storage",
      "motherboard",
      "psu",
      "case",
      "cooling",
    ];

    categories.forEach((category) => {
      let categoryBudget = budgetPerCategory;
      // Adjust budget based on usage
      if (usage === "gaming") {
        if (category === "gpu") categoryBudget = budget * 0.35;
        else if (category === "cpu") categoryBudget = budget * 0.2;
        else categoryBudget = budget * 0.0625;
      } else if (usage === "workstation") {
        if (category === "cpu") categoryBudget = budget * 0.3;
        else if (category === "ram") categoryBudget = budget * 0.15;
        else categoryBudget = budget * 0.07;
      }

      const categoryComponents = mockComponents
        .filter((c) => c.category === category)
        .filter((c) => {
          const price = allowUsed && c.usedPrice ? c.usedPrice : c.price;
          return price <= categoryBudget * 1.2;
        })
        .filter(
          (c) =>
            preferredBrands.length === 0 || preferredBrands.includes(c.brand),
        )
        .sort((a, b) => b.rating - a.rating);

      if (categoryComponents.length > 0) {
        recommended.push(categoryComponents[0]);
      }
    });

    setRecommendation(recommended);
    setIsLoading(false);
  };

  const totalPrice =
    recommendation?.reduce((sum, c) => {
      const price = allowUsed && c.usedPrice ? c.usedPrice : c.price;
      return sum + price;
    }, 0) || 0;

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
                        className={`p-3 rounded-lg border text-left transition-all ${
                          usage === type.id
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
              {!recommendation ? (
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
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          Tổng cộng
                        </p>
                        <p className="text-2xl font-bold text-gradient-primary">
                          {formatPrice(totalPrice)}
                        </p>
                      </div>
                    </div>
                  </Card>

                  {/* Components List */}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {recommendation.map((component) => {
                      const Icon = categoryIcons[component.category];
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
                              <p className="text-lg font-bold text-primary mt-1">
                                {formatPrice(
                                  allowUsed && component.usedPrice
                                    ? component.usedPrice
                                    : component.price,
                                )}
                              </p>
                            </div>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
