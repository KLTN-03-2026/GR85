import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function FloatingChatComposer({ isLoading, messageText, onChangeText, onSend }) {
  return (
    <div className="border-t border-border/60 bg-background p-2.5">
      <div className="flex items-center gap-2 rounded-full border border-border bg-muted/20 px-2 py-1">
        <Input
          value={messageText}
          onChange={(event) => onChangeText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              onSend();
            }
          }}
          placeholder="Aa"
          disabled={isLoading}
          className="h-9 border-0 bg-transparent shadow-none focus-visible:ring-0"
        />
        <Button
          type="button"
          size="icon"
          onClick={onSend}
          disabled={isLoading || !messageText.trim()}
          className="h-9 w-9 rounded-full"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}