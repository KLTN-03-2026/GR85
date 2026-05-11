import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requestAiAdvisorChat, requestAiAdvisorRecommendation, fetchAiAdvisorHistory, clearAiAdvisorHistory } from "@/client/features/recommend/data/aiRecommend.api";

export default function AIAdvisorChatPage() {
  const { isAuthenticated } = useAuth();
  const [scope, setScope] = useState("BOTH");
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [messages, setMessages] = useState([]);

  // Load history from database on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadHistory();
    } else {
      setIsLoadingHistory(false);
    }
  }, [isAuthenticated]);

  async function loadHistory() {
    try {
      setIsLoadingHistory(true);
      const history = await fetchAiAdvisorHistory();
      if (Array.isArray(history)) {
        setMessages(history.map(msg => ({
          id: msg.id,
          role: msg.role,
          type: msg.type,
          content: msg.content,
          createdAt: msg.createdAt,
          isError: false,
        })));
      }
    } catch (error) {
      console.error("Failed to load history:", error);
      setMessages([]);
    } finally {
      setIsLoadingHistory(false);
    }
  }

  const chatHistory = useMemo(
    () =>
      messages
        .filter((item) => item.type === "chat")
        .map((item) => ({ role: item.role, content: item.content })),
    [messages],
  );

  async function onSendMessage() {
    const question = String(input ?? "").trim();
    if (!question || isSending) {
      return;
    }

    setInput("");
    setIsSending(true);

    const userMessage = {
      id: crypto.randomUUID(),
      role: "user",
      type: "chat",
      content: question,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);

    try {
      const [advisorResult, chatReply] = await Promise.all([
        requestAiAdvisorRecommendation({
          question,
          scope,
        }),
        requestAiAdvisorChat({
          message: question,
          history: chatHistory,
          scope,
        }),
      ]);

      const suggestionLines = (advisorResult?.suggestions ?? [])
        .slice(0, 5)
        .map((item, index) => `${index + 1}. ${item.name} - ${formatMoney(item.price)}\nLy do: ${item.reason}`)
        .join("\n\n");

      const assistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        type: "chat",
        content:
          String(chatReply?.reply ?? "") ||
          "Mình đã phân tích xong. Bạn có thể hỏi thêm theo ngân sách hoặc mục đích dùng.",
        createdAt: new Date().toISOString(),
      };

      const suggestionMessage = suggestionLines
        ? {
          id: crypto.randomUUID(),
          role: "assistant",
          type: "suggestion",
          content: suggestionLines,
          createdAt: new Date().toISOString(),
        }
        : null;

      setMessages((prev) => [
        ...prev,
        assistantMessage,
        ...(suggestionMessage ? [suggestionMessage] : []),
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          type: "chat",
          content: error instanceof Error ? error.message : "Không thể xử lý yêu cầu AI",
          createdAt: new Date().toISOString(),
          isError: true,
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }

  async function handleClearHistory() {
    if (!window.confirm("Bạn chắc chắn muốn xóa lịch sử chat?")) {
      return;
    }

    try {
      await clearAiAdvisorHistory();
      setMessages([]);
    } catch (error) {
      console.error("Failed to clear history:", error);
      window.alert("Không thể xóa lịch sử");
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 pb-8 pt-24">
        <Card className="mx-auto flex min-h-[70vh] max-w-4xl flex-col border-border/70">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
            <div>
              <h1 className="text-lg font-semibold">AI Tu Van PC va Gear</h1>
              <p className="text-xs text-muted-foreground">Hoi dap tu do, follow-up, va goi y theo ngan sach</p>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Pham vi</label>
              <select
                className="rounded-md border border-border bg-background px-2 py-1 text-sm"
                value={scope}
                onChange={(event) => setScope(event.target.value)}
              >
                <option value="PC">Chi linh kien PC</option>
                <option value="GEAR">Chi gaming gear</option>
                <option value="BOTH">Ca PC va gear</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                onClick={handleClearHistory}
              >
                Xoa lich su
              </Button>
            </div>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {isLoadingHistory ? (
              <p className="text-sm text-muted-foreground">Đang tải lịch sử...</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">Thu nhap: "Toi co 30 trieu, tu van CPU de render"</p>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-[90%] rounded-xl px-3 py-2 text-sm whitespace-pre-wrap ${message.role === "user"
                      ? "ml-auto bg-primary text-primary-foreground"
                      : message.isError
                        ? "bg-destructive/10 text-destructive"
                        : "bg-muted"
                    }`}
                >
                  {message.content}
                </div>
              ))
            )}
          </div>

          <div className="border-t border-border/70 p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Nhap cau hoi..."
                className="min-h-[72px] flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm"
              />
              <Button
                onClick={onSendMessage}
                disabled={isSending || !String(input ?? "").trim() || !isAuthenticated}
              >
                {isSending ? "Dang gui..." : "Gui"}
              </Button>
            </div>
            {!isAuthenticated && (
              <p className="text-xs text-muted-foreground mt-2">Vui lòng đăng nhập để sử dụng tính năng này</p>
            )}
          </div>
        </Card>
      </main>
    </div>
  );
}

function formatMoney(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}
