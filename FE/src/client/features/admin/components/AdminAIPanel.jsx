import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { format } from "date-fns";
import {
  Activity,
  Bot,
  Coins,
  FileText,
  RefreshCw,
  Save,
  Settings,
  Trash2,
  UserCircle2,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const COLORS = ["#2563eb", "#0f766e", "#ca8a04", "#dc2626", "#7c3aed", "#0891b2"];

const defaultSettings = {
  isEnabled: true,
  model: "gpt-4o-mini",
  temperature: 0.7,
  maxToken: 2000,
  systemPrompt: "",
};

const defaultStats = {
  aiEnabled: true,
  totalRequests: 0,
  totalTokens: 0,
  totalCost: 0,
  endpointDistribution: {},
  endpointCostBreakdown: [],
  dailyUsage: [],
  topUsers: [],
  topicRatios: {},
};

export function AdminAIPanel() {
  const { token } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  const [settings, setSettings] = useState(defaultSettings);
  const [stats, setStats] = useState(defaultStats);
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalItems: 0,
    totalPages: 1,
  });
  const [searchKeyword, setSearchKeyword] = useState("");
  const [endpointFilter, setEndpointFilter] = useState("all");

  const loadSettings = useCallback(async () => {
    const response = await fetch("/api/admin/ai-settings", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Không tải được cấu hình AI");
    }

    const payload = await response.json();
    setSettings((prev) => ({
      ...prev,
      ...payload,
    }));

    return payload;
  }, [token]);

  const loadStats = useCallback(async () => {
    const response = await fetch("/api/admin/ai-stats", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error("Không tải được thống kê AI");
    }

    const payload = await response.json();
    setStats((prev) => ({
      ...prev,
      ...payload,
    }));

    return payload;
  }, [token]);

  const loadLogs = useCallback(
    async (options = {}) => {
      const page = Number(options.page ?? pagination.page ?? 1);
      const pageSize = Number(options.pageSize ?? pagination.pageSize ?? 20);
      const search = String(options.search ?? searchKeyword).trim();
      const endpoint = String((options.endpoint ?? endpointFilter) || "all");

      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
      });

      if (search) {
        params.set("search", search);
      }
      if (endpoint && endpoint !== "all") {
        params.set("endpoint", endpoint);
      }

      const response = await fetch(`/api/admin/ai-logs?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Không tải được lịch sử chat AI");
      }

      const payload = await response.json();
      setLogs(Array.isArray(payload?.data) ? payload.data : []);
      setPagination({
        page: Number(payload?.pagination?.page ?? page),
        pageSize: Number(payload?.pagination?.pageSize ?? pageSize),
        totalItems: Number(payload?.pagination?.totalItems ?? 0),
        totalPages: Number(payload?.pagination?.totalPages ?? 1),
      });

      return payload;
    },
    [endpointFilter, pagination.page, pagination.pageSize, searchKeyword, token],
  );

  const refreshAll = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsRefreshing(true);
    try {
      await Promise.all([loadSettings(), loadStats(), loadLogs({ page: 1 })]);
    } catch (error) {
      toast({
        title: "Không thể tải dữ liệu AI",
        description: error instanceof Error ? error.message : "Vui lòng thử lại",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [loadLogs, loadSettings, loadStats, toast, token]);

  useEffect(() => {
    if (!token) {
      return;
    }

    let cancelled = false;

    async function init() {
      setIsLoading(true);
      try {
        await Promise.all([loadSettings(), loadStats(), loadLogs({ page: 1 })]);
      } catch (error) {
        if (!cancelled) {
          toast({
            title: "Không thể tải dữ liệu AI",
            description:
              error instanceof Error ? error.message : "Vui lòng kiểm tra kết nối API",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
    };
  }, [loadLogs, loadSettings, loadStats, toast, token]);

  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    try {
      const response = await fetch("/api/admin/ai-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isEnabled: Boolean(settings.isEnabled),
          model: String(settings.model ?? "").trim(),
          temperature: Number(settings.temperature),
          maxToken: Number(settings.maxToken),
          systemPrompt: String(settings.systemPrompt ?? ""),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Lỗi lưu cấu hình AI");
      }

      const payload = await response.json();
      setSettings((prev) => ({ ...prev, ...payload }));

      toast({
        title: "Đã lưu cấu hình AI",
        description: "Cấu hình mới đã áp dụng cho toàn bộ hệ thống.",
      });

      await loadStats();
    } catch (error) {
      toast({
        title: "Không thể lưu cấu hình",
        description: error instanceof Error ? error.message : "Vui lòng thử lại",
        variant: "destructive",
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleToggleAI = async (checked) => {
    setSettings((prev) => ({ ...prev, isEnabled: checked }));

    try {
      const response = await fetch("/api/admin/ai-settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isEnabled: checked }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Lỗi cập nhật trạng thái AI");
      }

      toast({
        title: checked ? "Đã bật AI toàn hệ thống" : "Đã tắt AI toàn hệ thống",
      });

      await loadStats();
    } catch (error) {
      setSettings((prev) => ({ ...prev, isEnabled: !checked }));
      toast({
        title: "Không thể cập nhật trạng thái",
        description: error instanceof Error ? error.message : "Vui lòng thử lại",
        variant: "destructive",
      });
    }
  };

  const handleDeleteLog = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa log này?")) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/ai-logs/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.message || "Xóa log thất bại");
      }

      toast({ title: "Đã xóa log AI" });
      await Promise.all([loadLogs({ page: pagination.page }), loadStats()]);
    } catch (error) {
      toast({
        title: "Không thể xóa log",
        description: error instanceof Error ? error.message : "Vui lòng thử lại",
        variant: "destructive",
      });
    }
  };

  const endpointChartData = useMemo(
    () =>
      Array.isArray(stats.endpointCostBreakdown)
        ? stats.endpointCostBreakdown.map((item) => ({
            endpoint: item.endpoint,
            requests: Number(item.requests ?? 0),
            tokens: Number(item.tokens ?? 0),
            cost: Number(item.cost ?? 0),
          }))
        : [],
    [stats.endpointCostBreakdown],
  );

  const pieData = useMemo(
    () =>
      endpointChartData.map((item) => ({
        name: item.endpoint,
        value: item.requests,
      })),
    [endpointChartData],
  );

  const dailyChartData = useMemo(
    () =>
      Array.isArray(stats.dailyUsage)
        ? stats.dailyUsage.map((item) => ({
            ...item,
            label: String(item.date ?? "").slice(5),
            requests: Number(item.requests ?? 0),
            tokens: Number(item.tokens ?? 0),
            cost: Number(item.cost ?? 0),
          }))
        : [],
    [stats.dailyUsage],
  );

  const endpointOptions = useMemo(() => {
    const values = new Set(["all"]);

    endpointChartData.forEach((item) => {
      if (item.endpoint) {
        values.add(item.endpoint);
      }
    });

    logs.forEach((item) => {
      if (item?.endpoint) {
        values.add(item.endpoint);
      }
    });

    return Array.from(values);
  }, [endpointChartData, logs]);

  const avgCostPerRequest =
    Number(stats.totalRequests) > 0
      ? Number(stats.totalCost) / Number(stats.totalRequests)
      : 0;

  if (isLoading) {
    return (
      <div className="py-20 text-center text-muted-foreground">
        Đang tải dashboard AI...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-xl border border-border/60 bg-secondary/30 p-4">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <Bot className="h-6 w-6 text-primary" />
            Quản lý AI toàn hệ thống
          </h2>
          <p className="text-sm text-muted-foreground">
            Theo dõi token, chi phí, lịch sử chat, báo cáo và sơ đồ tổng quan AI.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshAll}
            disabled={isRefreshing}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
          <Label htmlFor="ai-toggle" className="font-semibold">
            {settings.isEnabled ? "AI đang bật" : "AI đang tắt"}
          </Label>
          <Switch
            id="ai-toggle"
            checked={settings.isEnabled}
            onCheckedChange={handleToggleAI}
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-3">
          <TabsTrigger value="overview">
            <Activity className="mr-2 h-4 w-4" /> Tổng quan
          </TabsTrigger>
          <TabsTrigger value="settings">
            <Settings className="mr-2 h-4 w-4" /> Cấu hình
          </TabsTrigger>
          <TabsTrigger value="logs">
            <FileText className="mr-2 h-4 w-4" /> Lịch sử chat
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              title="Tổng request"
              value={new Intl.NumberFormat("vi-VN").format(stats.totalRequests || 0)}
              icon={<Bot className="h-4 w-4" />}
            />
            <MetricCard
              title="Tổng token"
              value={new Intl.NumberFormat("vi-VN").format(stats.totalTokens || 0)}
              icon={<Zap className="h-4 w-4" />}
              accent="blue"
            />
            <MetricCard
              title="Tổng chi phí"
              value={formatUsd(stats.totalCost || 0)}
              icon={<Coins className="h-4 w-4" />}
              accent="emerald"
            />
            <MetricCard
              title="Chi phí / request"
              value={formatUsd(avgCostPerRequest)}
              icon={<Activity className="h-4 w-4" />}
              accent="amber"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard title="Phân bố request theo endpoint">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={105}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`${entry.name}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Xu hướng 14 ngày gần nhất">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="label" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="requests"
                      stroke="#2563eb"
                      strokeWidth={2}
                      name="Requests"
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      dataKey="tokens"
                      stroke="#0f766e"
                      strokeWidth={2}
                      name="Tokens"
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      dataKey="cost"
                      stroke="#dc2626"
                      strokeWidth={2}
                      name="Cost (USD)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ChartCard title="So sánh request, token và chi phí theo endpoint">
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={endpointChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="endpoint" />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="requests" fill="#2563eb" name="Requests" />
                    <Bar yAxisId="left" dataKey="tokens" fill="#0f766e" name="Tokens" />
                    <Bar yAxisId="right" dataKey="cost" fill="#dc2626" name="Cost (USD)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Người dùng sử dụng AI nhiều nhất">
              <div className="space-y-3">
                {Array.isArray(stats.topUsers) && stats.topUsers.length > 0 ? (
                  stats.topUsers.map((item) => (
                    <div
                      key={item.userId}
                      className="rounded-xl border border-border/60 bg-background p-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 text-sm font-semibold">
                            <UserCircle2 className="h-4 w-4" />
                            {item.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.email || "Không có email"}
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {item.requests} request
                        </div>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs">
                        <span>Tokens: {new Intl.NumberFormat("vi-VN").format(item.tokens || 0)}</span>
                        <span>Cost: {formatUsd(item.cost || 0)}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-sm text-muted-foreground">
                    Chưa có dữ liệu người dùng AI.
                  </div>
                )}
              </div>
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <div className="max-w-3xl space-y-4 rounded-2xl border border-border/60 bg-card p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Mô hình AI</Label>
                <Input
                  value={settings.model}
                  onChange={(event) =>
                    setSettings((prev) => ({ ...prev, model: event.target.value }))
                  }
                  placeholder="gpt-4o-mini"
                />
              </div>

              <div className="space-y-2">
                <Label>Max token / request</Label>
                <Input
                  type="number"
                  min={1}
                  value={settings.maxToken}
                  onChange={(event) =>
                    setSettings((prev) => ({
                      ...prev,
                      maxToken: Number(event.target.value || 0),
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Temperature ({Number(settings.temperature).toFixed(1)})</Label>
              <input
                className="w-full"
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.temperature}
                onChange={(event) =>
                  setSettings((prev) => ({
                    ...prev,
                    temperature: Number(event.target.value),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>System prompt toàn hệ thống</Label>
              <Textarea
                rows={7}
                value={settings.systemPrompt}
                onChange={(event) =>
                  setSettings((prev) => ({ ...prev, systemPrompt: event.target.value }))
                }
              />
            </div>

            <div className="pt-4">
              <Button onClick={handleSaveSettings} disabled={isSavingSettings}>
                <Save className="mr-2 h-4 w-4" />
                {isSavingSettings ? "Đang lưu..." : "Lưu cấu hình"}
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card p-4">
            <div className="min-w-[220px] flex-1">
              <Input
                value={searchKeyword}
                onChange={(event) => setSearchKeyword(event.target.value)}
                placeholder="Tìm theo prompt, response, model..."
              />
            </div>

            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={endpointFilter}
              onChange={(event) => setEndpointFilter(event.target.value)}
            >
              {endpointOptions.map((item) => (
                <option key={item} value={item}>
                  {item === "all" ? "Tất cả endpoint" : item}
                </option>
              ))}
            </select>

            <Button
              variant="outline"
              onClick={() => loadLogs({ page: 1 })}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Áp dụng lọc
            </Button>
          </div>

          <div className="overflow-hidden rounded-2xl border border-border/60 bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-secondary text-secondary-foreground">
                  <tr>
                    <th className="px-4 py-3">Thời gian</th>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Endpoint</th>
                    <th className="px-4 py-3">Tokens</th>
                    <th className="px-4 py-3">Chi phí</th>
                    <th className="px-4 py-3">Nội dung</th>
                    <th className="px-4 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-muted-foreground">
                        Chưa có dữ liệu log AI.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="whitespace-nowrap px-4 py-3">
                          {format(new Date(log.createdAt), "dd/MM/yyyy HH:mm")}
                        </td>
                        <td className="px-4 py-3">{log.user ? log.user.fullName : "Khách"}</td>
                        <td className="px-4 py-3 font-mono text-xs">{log.endpoint}</td>
                        <td className="px-4 py-3">
                          {new Intl.NumberFormat("vi-VN").format(log.totalTokens || 0)}
                        </td>
                        <td className="px-4 py-3">{formatUsd(log.cost || 0)}</td>
                        <td className="px-4 py-3">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="link" size="sm" className="h-auto p-0">
                                Xem chi tiết
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>Chi tiết log AI #{log.id}</DialogTitle>
                              </DialogHeader>
                              <div className="space-y-4 pt-4">
                                <div>
                                  <Label className="text-muted-foreground">Prompt</Label>
                                  <div className="mt-1 whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-sm">
                                    {log.prompt}
                                  </div>
                                </div>
                                <div>
                                  <Label className="text-muted-foreground">Response</Label>
                                  <div className="mt-1 whitespace-pre-wrap rounded-md bg-primary/10 p-3 font-mono text-sm text-foreground">
                                    {log.response}
                                  </div>
                                </div>
                                <div className="flex flex-wrap gap-4 border-t pt-2 text-sm text-muted-foreground">
                                  <span>Model: {log.modelUsed}</span>
                                  <span>
                                    Tokens: {log.promptTokens} in / {log.completionTokens} out
                                  </span>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteLog(log.id)}
                            className="text-red-500 hover:bg-red-50 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t bg-secondary/20 px-4 py-3 text-sm">
              <div className="text-muted-foreground">
                Tổng {new Intl.NumberFormat("vi-VN").format(pagination.totalItems || 0)} log
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => loadLogs({ page: Math.max(1, pagination.page - 1) })}
                  disabled={pagination.page <= 1}
                >
                  Trang trước
                </Button>
                <span>
                  Trang {pagination.page} / {Math.max(1, pagination.totalPages)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    loadLogs({
                      page: Math.min(
                        Math.max(1, pagination.totalPages),
                        pagination.page + 1,
                      ),
                    })
                  }
                  disabled={pagination.page >= Math.max(1, pagination.totalPages)}
                >
                  Trang sau
                </Button>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MetricCard({ title, value, icon, accent = "default" }) {
  const toneClass =
    accent === "blue"
      ? "border-blue-100 bg-blue-50/50 text-blue-900"
      : accent === "emerald"
        ? "border-emerald-100 bg-emerald-50/50 text-emerald-900"
        : accent === "amber"
          ? "border-amber-100 bg-amber-50/50 text-amber-900"
          : "border-border/50 bg-card text-foreground";

  return (
    <div className={`rounded-2xl border p-5 ${toneClass}`}>
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide opacity-80">
        {icon}
        {title}
      </p>
      <h3 className="mt-2 text-2xl font-bold">{value}</h3>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card p-5">
      <h3 className="mb-4 text-base font-bold">{title}</h3>
      {children}
    </div>
  );
}

function formatUsd(value) {
  const numeric = Number(value || 0);
  return `$${numeric.toFixed(6)}`;
}
