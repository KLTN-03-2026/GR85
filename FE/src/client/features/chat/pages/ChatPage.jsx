import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User, Sparkles, Loader2 } from "lucide-react";

// Further enhanced classifyInput function with additional specialized keywords
const classifyInput = (input) => {
  const relatedKeywords = [
    "PC", "linh kiện", "tư vấn", "build", "máy tính", "cấu hình", "phần cứng", "nâng cấp", "mua PC", "mua máy tính"
  ];
  const studyKeywords = [
    "học", "văn phòng", "làm việc", "sinh viên", "giá rẻ", "đại học", "học online", "laptop học tập", "máy tính cho sinh viên", "máy tính văn phòng"
  ];
  const gamingKeywords = [
    "gaming", "chơi game", "game AAA", "FPS", "đồ họa", "card màn hình", "máy chơi game", "game thủ", "máy tính chơi game"
  ];
  const streamingKeywords = [
    "streaming", "livestream", "phát trực tiếp", "máy quay", "stream game", "stream video", "máy tính stream"
  ];
  const renderingKeywords = [
    "render", "dựng phim", "3D", "AI/ML", "video editing", "thiết kế đồ họa", "máy render", "máy dựng phim"
  ];

  if (relatedKeywords.some((keyword) => input.toLowerCase().includes(keyword.toLowerCase()))) {
    return "related";
  } else if (studyKeywords.some((keyword) => input.toLowerCase().includes(keyword.toLowerCase()))) {
    return "study";
  } else if (gamingKeywords.some((keyword) => input.toLowerCase().includes(keyword.toLowerCase()))) {
    return "gaming";
  } else if (streamingKeywords.some((keyword) => input.toLowerCase().includes(keyword.toLowerCase()))) {
    return "streaming";
  } else if (renderingKeywords.some((keyword) => input.toLowerCase().includes(keyword.toLowerCase()))) {
    return "rendering";
  } else {
    return "unrelated";
  }
};

export default function ChatPage() {
  const [messages, setMessages] = useState([
    {
      id: "1",
      role: "assistant",
      content:
        "Xin chào! Tôi là trợ lý AI của PC Perfect. Tôi có thể giúp bạn:\n\n• Tư vấn cấu hình PC phù hợp\n• Giải đáp thắc mắc về linh kiện\n• So sánh sản phẩm\n• Hỗ trợ lắp PC\n\nBạn cần hỗ trợ gì hôm nay?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    const messageType = classifyInput(userMessage.content);

    let aiMessage;
    if (messageType === "related") {
      // Simulate AI response
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const responses = [
        "Đó là một câu hỏi hay! Để tư vấn chính xác, bạn có thể cho tôi biết thêm về ngân sách và mục đích sử dụng chính của bạn không?",
        "Dựa trên yêu cầu của bạn, tôi gợi ý cấu hình với CPU Ryzen 7 7800X3D + RTX 4070 Ti Super. Đây là combo gaming tuyệt vời trong tầm giá! Bạn có thể tham khảo thêm tại [CPU Ryzen 7 7800X3D](https://www.pcperfect.vn/cpu-ryzen-7-7800x3d) và [RTX 4070 Ti Super](https://www.pcperfect.vn/rtx-4070-ti-super).",
        "RAM 32GB DDR5 6000MHz là lựa chọn tối ưu cho gaming và làm việc đa nhiệm. Bạn có thể xem chi tiết tại [RAM DDR5 6000MHz](https://www.pcperfect.vn/ram-ddr5-6000mhz).",
        "Với ngân sách 30 triệu, bạn có thể build được một PC gaming chơi tốt các game AAA ở độ phân giải 1440p. Để tôi gợi ý chi tiết nhé!",
      ];

      aiMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responses[Math.floor(Math.random() * responses.length)],
        timestamp: new Date(),
      };
    } else if (messageType === "study") {
      const studyResponse = `Dựa trên yêu cầu của bạn, tôi gợi ý cấu hình phù hợp cho việc học tập:

- CPU: [Intel Core i5-13600K](https://www.pcperfect.vn/intel-core-i5-13600k)
- RAM: [16GB DDR5 5200MHz](https://www.pcperfect.vn/ram-16gb-ddr5-5200mhz)
- SSD: [1TB NVMe](https://www.pcperfect.vn/ssd-1tb-nvme)
- GPU: [NVIDIA GTX 1660 Super](https://www.pcperfect.vn/nvidia-gtx-1660-super)
- PSU: [650W 80+ Bronze](https://www.pcperfect.vn/psu-650w-80plus-bronze)
- Case: [Mid Tower](https://www.pcperfect.vn/mid-tower-case)

Cấu hình này sẽ đáp ứng tốt các nhu cầu học tập, làm việc văn phòng và giải trí cơ bản. Bạn có muốn tôi gợi ý thêm không?`;

      aiMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: studyResponse,
        timestamp: new Date(),
      };
    } else if (messageType === "gaming") {
      const gamingResponse = `Để chơi game, tôi gợi ý cấu hình sau:

- CPU: [AMD Ryzen 7 7800X3D](https://www.pcperfect.vn/amd-ryzen-7-7800x3d)
- GPU: [NVIDIA RTX 4070 Ti](https://www.pcperfect.vn/nvidia-rtx-4070-ti)
- RAM: [32GB DDR5 6000MHz](https://www.pcperfect.vn/ram-32gb-ddr5-6000mhz)
- SSD: [1TB NVMe](https://www.pcperfect.vn/ssd-1tb-nvme)
- PSU: [750W 80+ Gold](https://www.pcperfect.vn/psu-750w-80plus-gold)
- Case: [Mid Tower](https://www.pcperfect.vn/mid-tower-case)

Cấu hình này sẽ giúp bạn chơi tốt các tựa game AAA ở độ phân giải cao. Bạn có muốn thêm thông tin chi tiết không?`;

      aiMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: gamingResponse,
        timestamp: new Date(),
      };
    } else if (messageType === "streaming") {
      const streamingResponse = `Để phục vụ nhu cầu streaming, tôi gợi ý cấu hình sau:

- CPU: [Intel Core i7-13700K](https://www.pcperfect.vn/intel-core-i7-13700k)
- GPU: [NVIDIA RTX 3080](https://www.pcperfect.vn/nvidia-rtx-3080)
- RAM: [32GB DDR5 5600MHz](https://www.pcperfect.vn/ram-32gb-ddr5-5600mhz)
- SSD: [2TB NVMe](https://www.pcperfect.vn/ssd-2tb-nvme)
- PSU: [850W 80+ Gold](https://www.pcperfect.vn/psu-850w-80plus-gold)
- Case: [Full Tower](https://www.pcperfect.vn/full-tower-case)

Cấu hình này sẽ đảm bảo bạn có thể stream mượt mà và chơi game cùng lúc. Bạn có muốn thêm thông tin chi tiết không?`;

      aiMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: streamingResponse,
        timestamp: new Date(),
      };
    } else if (messageType === "rendering") {
      const renderingResponse = `Để làm việc đồ họa và render, tôi gợi ý cấu hình sau:

- CPU: [AMD Ryzen 9 7950X](https://www.pcperfect.vn/amd-ryzen-9-7950x)
- GPU: [NVIDIA RTX 4090](https://www.pcperfect.vn/nvidia-rtx-4090)
- RAM: [64GB DDR5 6000MHz](https://www.pcperfect.vn/ram-64gb-ddr5-6000mhz)
- SSD: [2TB NVMe](https://www.pcperfect.vn/ssd-2tb-nvme)
- PSU: [1000W 80+ Platinum](https://www.pcperfect.vn/psu-1000w-80plus-platinum)
- Case: [Full Tower](https://www.pcperfect.vn/full-tower-case)

Cấu hình này sẽ đáp ứng tốt các nhu cầu render video, thiết kế đồ họa và AI/ML. Bạn có muốn thêm thông tin chi tiết không?`;

      aiMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: renderingResponse,
        timestamp: new Date(),
      };
    } else {
      aiMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Xin lỗi, tôi không thể hỗ trợ câu hỏi này. Vui lòng hỏi về tư vấn linh kiện máy tính hoặc cung cấp thêm thông tin chi tiết!",
        timestamp: new Date(),
      };
    }

    setMessages((prev) => [...prev, aiMessage]);
    setIsLoading(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-24 pb-12 h-screen flex flex-col">
        <div className="container mx-auto px-4 flex-1 flex flex-col max-h-[calc(100vh-6rem)]">
          {/* Header */}
          <div className="mb-4">
            <h1 className="font-display text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              AI <span className="text-gradient-primary">Trợ lý</span>
            </h1>
            <p className="text-sm text-muted-foreground">
              Trò chuyện với AI để được tư vấn lắp PC
            </p>
          </div>

          {/* Chat Area */}
          <Card className="flex-1 glass border-border/50 flex flex-col overflow-hidden">
            <ScrollArea className="flex-1 p-4" ref={scrollRef}>
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${
                      message.role === "user" ? "flex-row-reverse" : ""
                    }`}
                  >
                    <Avatar className="w-8 h-8 flex-shrink-0">
                      <AvatarFallback
                        className={
                          message.role === "assistant"
                            ? "bg-primary text-primary-foreground"
                            : "bg-accent text-accent-foreground"
                        }
                      >
                        {message.role === "assistant" ? (
                          <Bot className="w-4 h-4" />
                        ) : (
                          <User className="w-4 h-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-secondary rounded-bl-md"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </p>
                      <p className="text-xs opacity-50 mt-1">
                        {message.timestamp.toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                {isLoading && (
                  <div className="flex gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        <Bot className="w-4 h-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t border-border/50">
              <div className="flex gap-2">
                <Input
                  placeholder="Nhập tin nhắn..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="flex-1"
                />

                <Button
                  variant="default"
                  size="icon"
                  onClick={handleSend}
                  disabled={!input.trim() || isLoading}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                AI có thể mắc lỗi. Vui lòng xác minh thông tin quan trọng.
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
