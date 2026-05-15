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
  const [productMap, setProductMap] = useState({});
  const [productCacheTimestamps, setProductCacheTimestamps] = useState({});
  const PRODUCT_TTL = 1000 * 60 * 10; // 10 minutes

  // localStorage key for unauthenticated persistence
  const LOCAL_HISTORY_KEY = "aiAdvisorLocalHistory";

  // Load history from database on mount
  useEffect(() => {
    // Load local cached history first
    try {
      const raw = localStorage.getItem(LOCAL_HISTORY_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      }
    } catch (err) {
      console.error("Error loading local chat history:", err);
    }

    if (isAuthenticated) {
      loadHistory();
    } else {
      setIsLoadingHistory(false);
    }
  }, [isAuthenticated]);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_HISTORY_KEY, JSON.stringify(messages));
    } catch (err) {
      // ignore quota errors
    }
  }, [messages]);

  // When messages include recommended product slugs, fetch product details from API
  useEffect(() => {
    const slugs = new Set();
    for (const message of messages) {
      const parsed = message.parsedJson || tryParseJsonClient(message.content);
      if (!parsed) continue;
      const recommendedProducts = Array.isArray(parsed.recommendedProducts)
        ? parsed.recommendedProducts
        : Array.isArray(parsed.recommended)
          ? parsed.recommended.map((item) => item?.link?.split("/").pop() || item?.name || item).filter(Boolean)
          : [];

      for (const s of recommendedProducts) {
        if (typeof s === "string" && s.trim()) slugs.add(s.trim());
      }
    }

    const missing = Array.from(slugs).filter((s) => {
      const has = !!productMap[s];
      if (!has) return true;
      const ts = productCacheTimestamps[s] || 0;
      return Date.now() - ts > PRODUCT_TTL;
    });
    if (missing.length === 0) return;

    let cancelled = false;

    async function fetchMissing() {
      const newMap = {};
      await Promise.all(missing.map(async (slug) => {
        try {
          const res = await fetch(`/api/products/${encodeURIComponent(slug)}`);
          if (!res.ok) return;
          const data = await res.json().catch(() => null);
          if (data && !cancelled) {
            newMap[slug] = data;
            // mark timestamp
            newMap[`__ts_${slug}`] = Date.now();
          }
        } catch (err) {
          // ignore
        }
      }));

      if (!cancelled) {
        // separate timestamps from product data
        const tsUpdates = {};
        const prodUpdates = {};
        for (const k of Object.keys(newMap)) {
          if (k.startsWith("__ts_")) {
            const slug = k.replace("__ts_", "");
            tsUpdates[slug] = newMap[k];
          } else {
            prodUpdates[k] = newMap[k];
          }
        }
        setProductMap((prev) => ({ ...prev, ...prodUpdates }));
        setProductCacheTimestamps((prev) => ({ ...prev, ...tsUpdates }));
      }
    }

    fetchMissing();

    return () => { cancelled = true; };
  }, [messages, productMap]);

  async function loadHistory() {
    try {
      setIsLoadingHistory(true);
      const history = await fetchAiAdvisorHistory();
      if (Array.isArray(history)) {
        // Merge server history with local cached messages (avoid duplicates)
        const serverMsgs = history.map(msg => ({
          id: `s-${msg.id}`,
          role: msg.role,
          type: msg.type,
          content: msg.content,
          createdAt: msg.createdAt,
          isError: false,
          parsedJson: msg.parsedAssistantJson || null,
        }));

        // keep any local messages that are not present on server (by content+role+time)
        const localRaw = localStorage.getItem(LOCAL_HISTORY_KEY);
        let localMsgs = [];
        if (localRaw) {
          try { localMsgs = JSON.parse(localRaw) || []; } catch (_) { localMsgs = []; }
        }

        const merged = [...serverMsgs];
        for (const lm of localMsgs) {
          const dup = serverMsgs.some(sm => sm.role === lm.role && String(sm.content).trim() === String(lm.content).trim());
          if (!dup) merged.push(lm);
        }

        setMessages(merged.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)));
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
        parsedJson: chatReply?.parsedAssistantJson || null,
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
      try { localStorage.removeItem(LOCAL_HISTORY_KEY); } catch (_) { }
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
                  {(() => {
                    const parsed = message.parsedJson || tryParseJsonClient(message.content);
                    if (parsed) {
                      const recommendedProducts = Array.isArray(parsed.recommendedProducts)
                        ? parsed.recommendedProducts
                        : Array.isArray(parsed.recommended)
                          ? parsed.recommended.map((item) => item?.link?.split("/").pop() || item?.name || item).filter(Boolean)
                          : [];
                      const responseMessage = String(parsed.message || parsed.reason || "").trim();
                      const reasoning = String(parsed.reasoning || parsed.reason || "").trim();

                      return (
                        <div>
                          {responseMessage && (
                            <div className="mb-2 whitespace-pre-wrap">{responseMessage}</div>
                          )}

                          {recommendedProducts.length > 0 && (
                            <div className="mb-2">
                              <strong>Gợi ý sản phẩm:</strong>
                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {recommendedProducts.map((slug) => {
                                  const prod = productMap[slug];
                                  if (prod) {
                                    const img = (prod.images && prod.images[0] && prod.images[0].url) || prod.image || (prod.media && prod.media[0] && prod.media[0].url) || "";
                                    const name = prod.name || prod.title || slug;
                                    const price = prod.displayPrice || prod.price || prod.salePrice || 0;
                                    return (
                                      <a key={slug} href={`/components/${slug}`} className="flex items-center gap-3 rounded-lg border border-emerald-100 bg-emerald-50/30 p-2 no-underline hover:shadow-sm">
                                        <div className="w-16 h-12 flex-shrink-0 overflow-hidden rounded-md bg-white flex items-center justify-center">
                                          {img ? <img src={img} alt={name} className="w-full h-full object-contain" /> : null}
                                        </div>
                                        <div className="flex-1 text-sm">
                                          <div className="font-medium text-ellipsis overflow-hidden whitespace-nowrap text-ellipsis">{name}</div>
                                          <div className="text-sm text-emerald-600 font-semibold mt-1">{formatMoney(price)}</div>
                                        </div>
                                        <div className="text-muted-foreground text-lg">›</div>
                                      </a>
                                    );
                                  }

                                  return (
                                    <a key={slug} href={`/components/${slug}`} className="text-primary underline">{slug}</a>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {reasoning && (
                            <div className="text-sm text-muted-foreground">{reasoning}</div>
                          )}
                        </div>
                      );
                    }
                    return message.content;
                  })()}

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

// Client-side tolerant JSON parse for AI replies
function tryParseJsonClient(text) {
  if (!text || typeof text !== "string") return null;
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first === -1 || last <= first) return null;
  const candidate = text.substring(first, last + 1);
  try {
    return JSON.parse(candidate);
  } catch (err) {
    // Try simple fixes: replace smart quotes, remove trailing commas
    try {
      const normalized = candidate.replace(/[“”‘’]/g, '"').replace(/,\s*(}|\])/g, '$1');
      return JSON.parse(normalized);
    } catch (err2) {
      try {
        // last resort: evaluate as JS literal
        // eslint-disable-next-line no-new-func
        return Function('return (' + candidate + ')')();
      } catch (err3) {
        return null;
      }
    }
  }
}
