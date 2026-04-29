import { useState, useEffect } from "react";
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
} from "recharts";
import { format } from "date-fns";
import { 
  Bot, Settings, Activity, FileText, Trash2, Save, Coins
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

export function AdminAIPanel() {
  const { token } = useAuth();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(true);
  
  const [settings, setSettings] = useState({
    isEnabled: true,
    model: "gpt-4o-mini",
    temperature: 0.7,
    maxToken: 2000,
    systemPrompt: ""
  });
  
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  
  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/admin/ai-settings", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data) setSettings(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/ai-stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/admin/ai-logs?pageSize=50", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLogs(data.data || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (token) {
      Promise.all([fetchSettings(), fetchStats(), fetchLogs()]).then(() => setIsLoading(false));
    }
  }, [token]);

  const handleSaveSettings = async () => {
    try {
      const res = await fetch("/api/admin/ai-settings", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          isEnabled: settings.isEnabled,
          model: settings.model,
          temperature: Number(settings.temperature),
          maxToken: Number(settings.maxToken),
          systemPrompt: settings.systemPrompt
        })
      });
      
      if (!res.ok) throw new Error("Lỗi lưu cấu hình");
      toast({ title: "Lưu cấu hình AI thành công" });
    } catch (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleAI = async (checked) => {
    setSettings(prev => ({ ...prev, isEnabled: checked }));
    try {
      await fetch("/api/admin/ai-settings", {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ isEnabled: checked })
      });
      toast({ title: checked ? "Đã bật AI toàn hệ thống" : "Đã tắt AI toàn hệ thống", variant: checked ? "default" : "destructive" });
    } catch (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteLog = async (id) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa log này?")) return;
    try {
      const res = await fetch(`/api/admin/ai-logs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Lỗi khi xóa");
      toast({ title: "Đã xóa log" });
      setLogs(prev => prev.filter(l => l.id !== id));
    } catch (error) {
      toast({ title: "Lỗi", description: error.message, variant: "destructive" });
    }
  };

  if (isLoading) return <div className="py-20 text-center text-muted-foreground">Đang tải cấu hình AI...</div>;

  const topicData = stats?.topicRatios ? Object.entries(stats.topicRatios).map(([name, value]) => ({ name, value })) : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border/50">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Quản lý Trợ lý AI Toàn Hệ Thống
          </h2>
          <p className="text-sm text-muted-foreground">Bật/tắt, cấu hình model và xem phân tích chi phí</p>
        </div>
        <div className="flex items-center gap-3">
          <Label htmlFor="ai-toggle" className="font-semibold text-lg">{settings.isEnabled ? "Đang bật" : "Đã tắt"}</Label>
          <Switch id="ai-toggle" checked={settings.isEnabled} onCheckedChange={handleToggleAI} />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid grid-cols-3 mb-6">
          <TabsTrigger value="overview"><Activity className="w-4 h-4 mr-2" /> Thống kê & Chi phí</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="w-4 h-4 mr-2" /> Cấu hình Model</TabsTrigger>
          <TabsTrigger value="logs"><FileText className="w-4 h-4 mr-2" /> Lịch sử Chat</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-6 bg-card rounded-2xl border border-border/50 flex flex-col gap-2">
              <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide flex items-center gap-2"><Bot className="w-4 h-4"/> Tổng Request</p>
              <h3 className="text-3xl font-bold">{stats?.totalRequests || 0}</h3>
            </div>
            <div className="p-6 bg-blue-50/50 rounded-2xl border border-blue-100 flex flex-col gap-2">
              <p className="text-sm text-blue-700 font-medium uppercase tracking-wide flex items-center gap-2"><Activity className="w-4 h-4"/> Tổng Token (Sử dụng)</p>
              <h3 className="text-3xl font-bold text-blue-800">{new Intl.NumberFormat().format(stats?.totalTokens || 0)}</h3>
            </div>
            <div className="p-6 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex flex-col gap-2">
              <p className="text-sm text-emerald-700 font-medium uppercase tracking-wide flex items-center gap-2"><Coins className="w-4 h-4"/> Tổng Chi Phí Ước Tính</p>
              <h3 className="text-3xl font-bold text-emerald-800">${Number(stats?.totalCost || 0).toFixed(4)}</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border/50 p-6 rounded-2xl">
              <h3 className="text-lg font-bold mb-6">Chủ Đề Được Hỏi Nhiều Nhất</h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={topicData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    >
                      {topicData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6 max-w-3xl">
          <div className="bg-card border border-border/50 p-6 rounded-2xl space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Model đang dùng</Label>
                <Input value={settings.model} onChange={e => setSettings({...settings, model: e.target.value})} placeholder="gpt-4o-mini" />
              </div>
              <div className="space-y-2">
                <Label>Max Token</Label>
                <Input type="number" value={settings.maxToken} onChange={e => setSettings({...settings, maxToken: e.target.value})} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Temperature ({settings.temperature})</Label>
              <input type="range" min="0" max="2" step="0.1" value={settings.temperature} onChange={e => setSettings({...settings, temperature: e.target.value})} className="w-full" />
            </div>
            <div className="space-y-2">
              <Label>System Prompt Chung (Prompt chỉ đạo AI toàn hệ thống)</Label>
              <Textarea rows={6} value={settings.systemPrompt} onChange={e => setSettings({...settings, systemPrompt: e.target.value})} />
            </div>
            <div className="pt-4 border-t">
              <Button onClick={handleSaveSettings} className="w-full sm:w-auto"><Save className="w-4 h-4 mr-2" /> Lưu Cấu Hình</Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="logs">
          <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
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
                    <tr><td colSpan="7" className="text-center py-6 text-muted-foreground">Chưa có dữ liệu</td></tr>
                  ) : logs.map(log => (
                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="px-4 py-3 whitespace-nowrap">{format(new Date(log.createdAt), "dd/MM/yyyy HH:mm")}</td>
                      <td className="px-4 py-3">{log.user ? log.user.fullName : "Khách"}</td>
                      <td className="px-4 py-3 font-mono text-xs">{log.endpoint}</td>
                      <td className="px-4 py-3">{log.totalTokens}</td>
                      <td className="px-4 py-3">${Number(log.cost).toFixed(6)}</td>
                      <td className="px-4 py-3">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="link" size="sm" className="h-auto p-0">Xem chi tiết</Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Chi tiết Request AI #{log.id}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div>
                                <Label className="text-muted-foreground">Prompt (Câu hỏi)</Label>
                                <div className="p-3 bg-muted rounded-md whitespace-pre-wrap font-mono text-sm mt-1">{log.prompt}</div>
                              </div>
                              <div>
                                <Label className="text-muted-foreground">Response (Trả lời)</Label>
                                <div className="p-3 bg-primary/10 text-primary-foreground rounded-md whitespace-pre-wrap font-mono text-sm mt-1 text-black">{log.response}</div>
                              </div>
                              <div className="flex gap-4 text-sm text-muted-foreground pt-2 border-t">
                                <span>Model: {log.modelUsed}</span>
                                <span>Tokens: {log.promptTokens} in / {log.completionTokens} out</span>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteLog(log.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
