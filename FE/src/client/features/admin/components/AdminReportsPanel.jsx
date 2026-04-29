import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { format, subDays } from "date-fns";
import { Download, RefreshCw, DollarSign, Package, Users, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d", "#ffc658", "#a4de6c"];

export function AdminReportsPanel() {
  const { token } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(true);
  const [reportData, setReportData] = useState(null);
  
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });

  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiMessages, setAiMessages] = useState([]);
  const [aiChatInput, setAiChatInput] = useState("");

  const analyzeWithAI = async () => {
    if (!reportData) return;
    setIsAiAnalyzing(true);
    setAiMessages([]);
    try {
      const prompt = "Bỏ qua vai trò tư vấn PC trước đó. Bây giờ bạn là một chuyên gia phân tích dữ liệu kinh doanh tài ba. Dưới đây là dữ liệu báo cáo kinh doanh của cửa hàng từ " + dateRange.startDate + " đến " + dateRange.endDate + ":\n" + JSON.stringify({
        sales: reportData.sales,
        profit: reportData.profit,
        imports: reportData.imports
      }) + "\n\nHãy phân tích tình hình kinh doanh, chỉ ra điểm mạnh, điểm yếu và đưa ra 3 lời khuyên ngắn gọn để cải thiện.";
      
      const res = await fetch("/api/ai/chat-build", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ message: prompt, history: [] })
      });
      if (!res.ok) throw new Error("Lỗi khi gọi AI");
      const data = await res.json();
      setAiMessages([{ role: "assistant", content: data.reply || "AI không thể trả lời." }]);
    } catch (error) {
      console.error(error);
      toast({ title: "Lỗi phân tích AI", description: error.message, variant: "destructive" });
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const sendAiChat = async (e) => {
    e.preventDefault();
    if (!aiChatInput.trim() || isAiAnalyzing) return;
    
    const userMsg = aiChatInput.trim();
    const newHistory = [...aiMessages, { role: "user", content: userMsg }];
    setAiMessages(newHistory);
    setAiChatInput("");
    setIsAiAnalyzing(true);

    try {
      const res = await fetch("/api/ai/chat-build", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg, history: aiMessages })
      });
      if (!res.ok) throw new Error("Lỗi khi gọi AI");
      const data = await res.json();
      setAiMessages([...newHistory, { role: "assistant", content: data.reply || "AI không thể trả lời." }]);
    } catch (error) {
      console.error(error);
      toast({ title: "Lỗi Chat AI", description: error.message, variant: "destructive" });
      setAiMessages([...newHistory, { role: "assistant", content: "Xin lỗi, đã xảy ra lỗi khi kết nối AI." }]);
    } finally {
      setIsAiAnalyzing(false);
    }
  };

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error("Không thể tải báo cáo");
      const data = await res.json();
      setReportData(data);
    } catch (error) {
      console.error(error);
      toast({ title: "Lỗi tải báo cáo", description: error.message, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchReports();
    }
  }, [token]);

  const handleExportCSV = () => {
    if (!reportData) return;
    
    // Xuất cơ bản ra CSV
    const rows = [
      ["BÁO CÁO TỔNG QUAN DOANH THU"],
      ["Từ ngày:", dateRange.startDate, "Đến ngày:", dateRange.endDate],
      [],
      ["Tổng doanh thu", reportData.sales.totalRevenue],
      ["Tổng đơn hàng", reportData.sales.totalOrders],
      ["Đơn thành công", reportData.sales.successOrders],
      ["Đơn hủy/hoàn", reportData.sales.cancelledOrders],
      ["Lợi nhuận ước tính", reportData.profit.totalProfit],
    ];

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + rows.map(e => e.join(",")).join("\n");
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `bao-cao-doanh-thu-${dateRange.startDate}-${dateRange.endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
  };

  if (isLoading && !reportData) {
    return <div className="py-20 text-center"><RefreshCw className="animate-spin h-8 w-8 mx-auto text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-secondary/30 p-4 rounded-xl border border-border/50">
        <div className="flex items-center gap-2">
          <Input 
            type="date" 
            value={dateRange.startDate} 
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="w-auto"
          />
          <span>-</span>
          <Input 
            type="date" 
            value={dateRange.endDate} 
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="w-auto"
          />
          <Button onClick={fetchReports} disabled={isLoading}>
            Lọc
          </Button>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50 hover:bg-emerald-100" onClick={analyzeWithAI} disabled={isAiAnalyzing || !reportData}>
             {isAiAnalyzing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Activity className="h-4 w-4 mr-2" />}
             AI Phân Tích
          </Button>
          <Button variant="outline" onClick={handleExportCSV}>
            <Download className="h-4 w-4 mr-2" />
            Xuất báo cáo
          </Button>
        </div>
      </div>

      {(isAiAnalyzing || aiMessages.length > 0) && (
        <div className="bg-emerald-50/50 border border-emerald-200 rounded-2xl relative flex flex-col max-h-[500px]">
          <div className="p-4 border-b border-emerald-200">
            <h3 className="font-bold text-emerald-800 flex items-center gap-2">
              <Activity className="h-5 w-5" />
              AI Phân Tích Báo Cáo
            </h3>
          </div>
          
          <div className="p-4 overflow-y-auto flex-1 space-y-4">
            {aiMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl p-3 ${msg.role === "user" ? "bg-emerald-600 text-white" : "bg-white border border-emerald-100 text-emerald-900"}`}>
                  <div className="prose prose-sm max-w-none whitespace-pre-wrap">
                    {msg.content}
                  </div>
                </div>
              </div>
            ))}
            
            {isAiAnalyzing && (
              <div className="flex items-center gap-3 text-emerald-700 bg-white border border-emerald-100 p-3 rounded-2xl max-w-fit">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <p className="text-sm">AI đang suy nghĩ...</p>
              </div>
            )}
          </div>
          
          <div className="p-3 border-t border-emerald-200 bg-white rounded-b-2xl">
            <form onSubmit={sendAiChat} className="flex gap-2">
              <Input
                value={aiChatInput}
                onChange={(e) => setAiChatInput(e.target.value)}
                placeholder="Hỏi thêm AI về báo cáo này..."
                disabled={isAiAnalyzing}
                className="flex-1"
              />
              <Button type="submit" disabled={isAiAnalyzing || !aiChatInput.trim()}>
                Gửi
              </Button>
            </form>
          </div>
        </div>
      )}

      {reportData && (
        <>
          {/* Tổng quan Doanh Thu & Lợi Nhuận */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-primary/5 border border-primary/20 p-5 rounded-2xl flex flex-col justify-center">
              <div className="flex items-center gap-3 text-primary mb-2">
                <DollarSign className="h-5 w-5" />
                <h3 className="font-semibold text-sm uppercase tracking-wide">Doanh Thu</h3>
              </div>
              <p className="text-3xl font-bold text-primary">{formatCurrency(reportData.sales.totalRevenue)}</p>
              <p className="text-xs text-muted-foreground mt-2">{reportData.sales.successOrders} đơn thành công</p>
            </div>
            
            <div className="bg-green-500/5 border border-green-500/20 p-5 rounded-2xl flex flex-col justify-center">
              <div className="flex items-center gap-3 text-green-600 mb-2">
                <Activity className="h-5 w-5" />
                <h3 className="font-semibold text-sm uppercase tracking-wide">Lợi Nhuận</h3>
              </div>
              <p className="text-3xl font-bold text-green-600">{formatCurrency(reportData.profit.totalProfit)}</p>
              <p className="text-xs text-muted-foreground mt-2">Dựa trên chênh lệch nhập xuất</p>
            </div>
            
            <div className="bg-amber-500/5 border border-amber-500/20 p-5 rounded-2xl flex flex-col justify-center">
              <div className="flex items-center gap-3 text-amber-600 mb-2">
                <Package className="h-5 w-5" />
                <h3 className="font-semibold text-sm uppercase tracking-wide">Đơn hàng</h3>
              </div>
              <p className="text-3xl font-bold text-amber-600">{reportData.sales.totalOrders}</p>
              <p className="text-xs text-muted-foreground mt-2">
                TB: {formatCurrency(reportData.sales.averageOrderValue)} / đơn
              </p>
            </div>
            
            <div className="bg-red-500/5 border border-red-500/20 p-5 rounded-2xl flex flex-col justify-center">
              <div className="flex items-center gap-3 text-red-600 mb-2">
                <RefreshCw className="h-5 w-5" />
                <h3 className="font-semibold text-sm uppercase tracking-wide">Đơn hủy/hoàn</h3>
              </div>
              <p className="text-3xl font-bold text-red-600">{reportData.sales.cancelledOrders}</p>
              <p className="text-xs text-muted-foreground mt-2">Tỷ lệ: {reportData.sales.totalOrders > 0 ? Math.round((reportData.sales.cancelledOrders / reportData.sales.totalOrders) * 100) : 0}%</p>
            </div>
          </div>

          {/* Biểu đồ Doanh thu (Line Chart) */}
          <div className="bg-card border border-border/50 p-6 rounded-2xl">
            <h3 className="text-lg font-bold mb-6">Biểu đồ Doanh Thu & Lợi Nhuận</h3>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={reportData.charts.revenueTrend} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="date" tick={{fontSize: 12}} />
                  <YAxis tickFormatter={(val) => `${val / 1000000}M`} width={80} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Line type="monotone" name="Doanh Thu" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                  <Line type="monotone" name="Lợi Nhuận" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Sản phẩm bán chạy */}
            <div className="bg-card border border-border/50 p-6 rounded-2xl">
              <h3 className="text-lg font-bold mb-6">Top Sản Phẩm Bán Chạy</h3>
              <div className="space-y-4">
                {reportData.products.topSelling.length > 0 ? (
                  reportData.products.topSelling.map((product, index) => (
                    <div key={product.id} className="flex justify-between items-center border-b border-border/30 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          #{index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                          <p className="text-xs text-muted-foreground">{product.quantity} đã bán</p>
                        </div>
                      </div>
                      <p className="font-bold text-sm text-primary">{formatCurrency(product.revenue)}</p>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">Chưa có dữ liệu</p>
                )}
              </div>
            </div>

            {/* Doanh thu theo danh mục */}
            <div className="bg-card border border-border/50 p-6 rounded-2xl">
              <h3 className="text-lg font-bold mb-6">Doanh Thu Theo Danh Mục</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reportData.categories.revenue}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {reportData.categories.revenue.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Khách hàng VIP */}
            <div className="bg-card border border-border/50 p-6 rounded-2xl">
              <h3 className="text-lg font-bold mb-6">Top 10 Khách Hàng VIP</h3>
              <div className="space-y-4">
                {reportData.customers.topVIP.length > 0 ? (
                  reportData.customers.topVIP.map((customer, index) => (
                    <div key={customer.id} className="flex justify-between items-center border-b border-border/30 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold text-xs">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium text-sm">{customer.fullName}</p>
                          <p className="text-xs text-muted-foreground">{customer.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-sm text-amber-600">{formatCurrency(customer.totalSpent)}</p>
                        <p className="text-xs text-muted-foreground">{customer.orderCount} đơn hàng</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">Chưa có dữ liệu</p>
                )}
              </div>
            </div>

            {/* Cảnh báo tồn kho */}
            <div className="bg-card border border-border/50 p-6 rounded-2xl">
              <h3 className="text-lg font-bold text-red-500 mb-6 flex items-center gap-2">
                Cảnh Báo Sắp Hết Hàng
              </h3>
              <div className="space-y-4">
                {reportData.products.lowStock.length > 0 ? (
                  reportData.products.lowStock.map((product) => (
                    <div key={product.id} className="flex justify-between items-center border-b border-border/30 pb-3 last:border-0 last:pb-0">
                      <div>
                        <p className="font-medium text-sm line-clamp-1">{product.name}</p>
                        <p className="text-xs text-muted-foreground">Ngưỡng: {product.lowStockThreshold || 5}</p>
                      </div>
                      <div className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap">
                        Còn {product.stockQuantity}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-muted-foreground text-center py-4">Kho hàng dồi dào, không có cảnh báo</p>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
