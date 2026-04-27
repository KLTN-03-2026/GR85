import { ScrollArea } from "@/components/ui/scroll-area";
import { FloatingChatMessageItem } from "@/components/floating-chat/FloatingChatMessageItem.jsx";

export function FloatingChatMessageList({ isLoading, isReady, messages, scrollRef, userId }) {
  return (
    <ScrollArea
      className="flex-1 bg-[radial-gradient(circle_at_1px_1px,hsl(var(--muted))_1px,transparent_0)] [background-size:14px_14px] p-3"
      ref={scrollRef}
    >
      <div className="space-y-3">
        {!isReady && isLoading ? (
          <div className="text-xs text-muted-foreground">Đang tải hội thoại...</div>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border/70 bg-background/80 p-3 text-xs text-muted-foreground">
            Xin chào! Bạn cần hỗ trợ gì hôm nay?
          </div>
        ) : (
          messages.map((message) => (
            <FloatingChatMessageItem key={`${message.id}-${message.createdAt}`} message={message} userId={userId} />
          ))
        )}
      </div>
    </ScrollArea>
  );
}