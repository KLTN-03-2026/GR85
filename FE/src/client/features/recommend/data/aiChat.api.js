const CHAT_ENDPOINT = "/api/ai/chat-build";

export async function requestAiBuildChatReply(input) {
  const response = await fetch(CHAT_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: String(input?.message ?? "").trim(),
      history: Array.isArray(input?.history)
        ? input.history
            .map((item) => ({
              role: String(item?.role ?? "user"),
              content: String(item?.content ?? ""),
            }))
            .filter((item) => item.content.trim().length > 0)
        : [],
    }),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload?.message || "Backend không xử lý được tin nhắn AI build PC",
    );
  }

  return {
    content: String(
      payload?.reply ?? payload?.content ?? payload?.message ?? "",
    ).trim(),
  };
}
