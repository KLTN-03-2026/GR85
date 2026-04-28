import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import {
  usageTypes,
  brands,
} from "@/client/features/catalog/data/mock-components";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { requestAiBuildRecommendation, requestAiAdvisorChat } from "@/client/features/recommend/data/aiRecommend.api.js";
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
  const [buildMode, setBuildMode] = useState("full"); // "full" | "partial"
  const [targetCategories, setTargetCategories] = useState(["cpu"]);
  const [preferredBrands, setPreferredBrands] = useState([]);
  const [allowUsed, setAllowUsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recommendationData, setRecommendationData] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isAddingCombo, setIsAddingCombo] = useState(false);
  
  const [aiReview, setAiReview] = useState("");
  const [isFetchingAiReview, setIsFetchingAiReview] = useState(false);

  // Chat UI state
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [isChatSending, setIsChatSending] = useState(false);
  const [chatMode, setChatMode] = useState("web"); // "web" or "external"

  const handleSendChatMessage = async () => {
    const question = chatInput.trim();
    if (!question || isChatSending) return;

    setChatInput("");
    setIsChatSending(true);

    const userMessage = { role: "user", content: question };
    setChatMessages((prev) => [...prev, userMessage]);

    try {
      const response = await requestAiAdvisorChat({
        message: chatMode === "web" ? `(Chỉ tư vấn sản phẩm có trên web) ${question}` : question,
        history: chatMessages,
      });

      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: response?.reply || "Xin lỗi, tôi không thể xử lý yêu cầu." },
      ]);
    } catch (error) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: error.message || "Đã xảy ra lỗi khi tư vấn.", isError: true },
      ]);
    } finally {
      setIsChatSending(false);
    }
  };

  const askAiAboutProduct = (productName) => {
    const question = `Hãy đánh giá chi tiết về linh kiện này giúp tôi: ${productName}`;
    setChatInput(question);
    // Cuộn xuống phần chat
    document.getElementById("ai-chat-section")?.scrollIntoView({ behavior: "smooth" });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(price);
  };

  const toggleTargetCategory = (cat) => {
    setTargetCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat],
    );
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
        targetCategories: buildMode === "partial" ? targetCategories : null,
        preferredBrands,
        allowUsed,
      });

      setRecommendationData(response);
      setAiReview(""); // Reset AI review when generating new build
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

  // Nếu là chế độ partial và người dùng chỉ chọn 1 loại linh kiện, hiển thị top 5 linh kiện đó.
  // Nếu chọn >= 2 loại linh kiện, hệ thống sẽ render ra thành combo như dàn PC bình thường.
  const isSingleModeResult = buildMode === "partial" && targetCategories.length === 1 && Boolean(recommendationData && recommendationData.categoryAnalysis?.length === 1);
  const displayItems = isSingleModeResult
    ? (recommendationData?.fullCatalog?.[0]?.products || []).slice(0, 5).map(p => ({
        ...p,
        category: recommendationData.categoryAnalysis[0].category,
        categorySlug: recommendationData.categoryAnalysis[0].categorySlug,
      }))
    : recommendationData?.items ?? [];

  const totalPrice = isSingleModeResult
    ? 0 // Không tính tổng giá trong chế độ single vì đang hiển thị các lựa chọn độc lập
    : displayItems.reduce((sum, c) => {
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
    if (!Array.isArray(displayItems) || displayItems.length === 0 || isSingleModeResult) {
      return;
    }

    setIsAddingCombo(true);
    try {
      await addBuildToCart({
        name: `Combo AI - ${usageTypes.find((u) => u.id === usage)?.name ?? "Tu van"}`,
        components: displayItems.map((item) => ({
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

  const fetchAiReviewForBuild = async () => {
    if (!displayItems || displayItems.length === 0) return;
    
    setIsFetchingAiReview(true);
    try {
      const componentsList = displayItems.map(c => `- ${c.category}: ${c.name}`).join('\n');
      const usageName = usageTypes.find((u) => u.id === usage)?.name || usage;
      const message = `Tôi vừa build cấu hình máy tính (nhu cầu ${usageName}) gồm:\n${componentsList}\n\nHãy phân tích chuyên sâu như một chuyên gia:\n1. Khả năng (Làm được gì cực tốt, chơi game gì max setting)?\n2. Hạn chế (Không nên dùng để làm gì, thắt cổ chai ở đâu)?\n3. Lời khuyên để tối ưu hóa hiệu năng và độ bền?`;
      
      const response = await requestAiAdvisorChat({ message });
      setAiReview(response.reply);
    } catch (error) {
      setAiReview("Không thể lấy đánh giá từ AI lúc này: " + error.message);
    } finally {
      setIsFetchingAiReview(false);
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

          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Left - Form */}
            <div className="lg:col-span-4 xl:col-span-3 sticky top-24 z-10">
              <Card className="glass border-primary/20 p-5 max-h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
              <h2 className="font-display text-xl font-bold mb-6">
                Yêu cầu của bạn
              </h2>

              <Tabs defaultValue="full" className="w-full mb-6" onValueChange={setBuildMode}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="full">Cả dàn PC</TabsTrigger>
                  <TabsTrigger value="partial">Từng linh kiện</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="space-y-6">
                {buildMode === "partial" && (
                  <div className="space-y-4">
                    <Label className="text-base">Các loại linh kiện muốn tìm</Label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { id: "cpu", label: "CPU" },
                        { id: "vga", label: "VGA" },
                        { id: "mainboard", label: "Mainboard" },
                        { id: "ram", label: "RAM" },
                        { id: "ssd", label: "SSD" },
                        { id: "psu", label: "Nguồn" },
                        { id: "case", label: "Vỏ Case" },
                        { id: "cooling", label: "Tản nhiệt" },
                        { id: "monitor", label: "Màn hình" },
                        { id: "mouse", label: "Chuột" },
                        { id: "keyboard", label: "Bàn phím" },
                        { id: "headset", label: "Tai nghe" },
                      ].map((cat) => (
                        <Badge
                          key={cat.id}
                          variant={targetCategories.includes(cat.id) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleTargetCategory(cat.id)}
                        >
                          {cat.label}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Budget */}
                <div className="space-y-4">
                  <Label className="text-base">Ngân sách</Label>
                  <div className="text-3xl font-bold text-gradient-primary">
                    {formatPrice(budget)}
                  </div>
                  <Slider
                    value={[budget]}
                    onValueChange={(v) => setBudget(v[0])}
                    min={buildMode === "partial" ? 500000 : 10000000}
                    max={buildMode === "partial" ? 30000000 : 100000000}
                    step={buildMode === "partial" ? 500000 : 10000000}
                  />

                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{buildMode === "partial" ? "500k" : "10 triệu"}</span>
                    <span>{buildMode === "partial" ? "30 triệu" : "100 triệu"}</span>
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
            </div>

            {/* Middle - Results */}
            <div className="lg:col-span-8 xl:col-span-6 space-y-6">
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
                          {isSingleModeResult ? displayItems.length : displayItems.length} linh kiện • Tối ưu cho{" "}
                          {usageTypes.find((u) => u.id === usage)?.name}
                        </p>
                        {recommendationData?.summary && (
                          <p className="text-sm text-muted-foreground mt-2">
                            {recommendationData.summary}
                          </p>
                        )}
                      </div>
                      {!isSingleModeResult && (
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
                      )}
                    </div>

                    {!isSingleModeResult && (
                      <div className="mt-4 flex justify-end">
                        <Button
                          variant="hero"
                          className="gap-2"
                          onClick={addRecommendedComboToCart}
                          disabled={displayItems.length === 0 || isAddingCombo}
                        >
                          {isAddingCombo ? "Đang thêm combo..." : "Mua cả combo"}
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {!isSingleModeResult && (
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
                    )}
                  </Card>

                  {/* AI Deep Review */}
                  {!isSingleModeResult && (
                    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-6 shadow-sm relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Sparkles className="w-24 h-24 text-primary" />
                      </div>
                      <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h4 className="font-bold text-lg text-primary">
                              AI Cố vấn chuyên sâu
                            </h4>
                            <p className="text-xs text-muted-foreground">Phân tích đa chiều về hiệu năng và trải nghiệm</p>
                          </div>
                        </div>
                        
                        {aiReview ? (
                          <div className="text-sm space-y-3 whitespace-pre-wrap leading-relaxed text-slate-700 bg-white/60 p-4 rounded-xl border border-white/40">
                            {aiReview}
                          </div>
                        ) : (
                          <div className="py-4">
                            <Button 
                              onClick={fetchAiReviewForBuild} 
                              disabled={isFetchingAiReview}
                              className="w-full md:w-auto bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                            >
                              {isFetchingAiReview ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang phân tích...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="w-4 h-4 mr-2" /> Xem bài phân tích chuyên sâu từ AI
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {!isSingleModeResult && (
                    <Card className="glass border-border/50 p-5">
                      <h4 className="mb-4 font-semibold text-lg flex items-center gap-2">
                        <Zap className="w-5 h-5 text-amber-500" /> Đánh giá nhanh (Hệ thống)
                      </h4>
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
                      
                      </Card>
                    )}



                  {!isSingleModeResult && Array.isArray(recommendationData?.categoryAnalysis) && recommendationData.categoryAnalysis.length > 0 && (
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
                  {displayItems.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {displayItems.map((component) => {
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
                                <div className="mt-2 flex items-center gap-3">
                                  {component.slug && (
                                    <Link 
                                      to={`/components/${component.slug}`} 
                                      target="_blank" 
                                      rel="noopener noreferrer"
                                      className="text-xs text-primary hover:underline font-medium"
                                    >
                                      Xem chi tiết
                                    </Link>
                                  )}
                                  <button
                                    onClick={() => askAiAboutProduct(component.name)}
                                    className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline font-medium flex items-center gap-1"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    Hỏi AI về mã này
                                  </button>
                                </div>
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

            {/* Right - ChatBox Component */}
            <div className="lg:col-span-12 xl:col-span-3 sticky top-24 z-10">
              <Card className="glass border-primary/20 flex flex-col h-[calc(100vh-120px)] shadow-lg">
                  <div className="p-4 border-b border-border/50 bg-primary/5 rounded-t-xl">
                    <div>
                      <h3 className="font-display text-lg font-bold flex items-center gap-2 text-primary">
                        <Sparkles className="w-5 h-5" />
                        Trợ lý AI
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        Hỏi AI về linh kiện hoặc cấu hình.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 mt-3 bg-background/50 p-2 rounded-lg border border-border/50">
                      <Label htmlFor="chat-mode" className="text-xs cursor-pointer">
                        {chatMode === "web" ? "Chỉ dùng SP trên web" : "Hỏi kiến thức mở rộng"}
                      </Label>
                      <Switch
                        id="chat-mode"
                        checked={chatMode === "web"}
                        onCheckedChange={(checked) => setChatMode(checked ? "web" : "external")}
                      />
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {chatMessages.length === 0 ? (
                      <div className="text-center text-sm text-muted-foreground pt-10">
                        Chưa có tin nhắn. Hãy hỏi AI về một linh kiện bạn đang quan tâm!
                      </div>
                    ) : (
                      chatMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[80%] rounded-xl px-4 py-2 text-sm whitespace-pre-wrap ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : msg.isError
                                ? "bg-destructive/10 text-destructive"
                                : "bg-muted"
                            }`}
                          >
                            {msg.content}
                          </div>
                        </div>
                      ))
                    )}
                    {isChatSending && (
                      <div className="flex justify-start">
                        <div className="bg-muted rounded-xl px-4 py-2 text-sm text-muted-foreground flex items-center gap-2">
                          <Loader2 className="w-4 h-4 animate-spin" /> Đang trả lời...
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-3 border-t border-border/50 bg-background/50">
                    <div className="flex gap-2">
                      <Input
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendChatMessage();
                          }
                        }}
                        placeholder="VD: Core i5 12400F hay Ryzen 5 5600X chơi game tốt hơn?"
                        className="flex-1 bg-background"
                      />
                      <Button onClick={handleSendChatMessage} disabled={isChatSending || !chatInput.trim()}>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
