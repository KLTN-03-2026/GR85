import { MessageCircle, Minus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export function FloatingChatHeader({ adminTypingText, onClose }) {
  return (
    <div className="flex items-center justify-between border-b border-border/70 bg-primary px-4 py-2.5 text-primary-foreground">
      <div className="flex items-center gap-2.5">
        <Avatar className="h-8 w-8 border border-white/40">
          <AvatarFallback className="bg-white/20 text-primary-foreground">
            <MessageCircle className="h-4 w-4" />
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="text-sm font-semibold leading-none">Hỗ trợ khách hàng</div>
          <div className="mt-1 text-[11px] text-primary-foreground/85">
            {adminTypingText || "Đang hoạt động"}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
          onClick={onClose}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
          onClick={onClose}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}