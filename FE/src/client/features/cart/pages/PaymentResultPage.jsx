import { Link, useSearchParams } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PaymentResultPage() {
  const [searchParams] = useSearchParams();

  const status = String(searchParams.get("status") ?? "failed").toLowerCase();
  const orderId = searchParams.get("orderId");
  const message = decodeURIComponent(String(searchParams.get("message") ?? ""));
  const txnNo = searchParams.get("txnNo");

  const isSuccess = status === "success";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pb-12 pt-28">
        <Card className="mx-auto max-w-2xl border-border/70 p-6">
          <h1 className="text-2xl font-bold">
            {isSuccess ? "Thanh toán thành công" : "Thanh toán chưa thành công"}
          </h1>

          <p className="mt-3 text-sm text-muted-foreground">
            {isSuccess
              ? "Đơn hàng của bạn đã được ghi nhận và thanh toán thành công."
              : "Giao dịch chưa hoàn tất. Bạn có thể thử lại hoặc chọn phương thức thanh toán khác."}
          </p>

          <div className="mt-6 space-y-2 rounded-lg border border-border/60 p-4 text-sm">
            <p>
              Mã đơn: <span className="font-semibold">{orderId || "-"}</span>
            </p>
            <p>
              Mã giao dịch: <span className="font-semibold">{txnNo || "-"}</span>
            </p>
            <p>
              Trạng thái: <span className="font-semibold">{status}</span>
            </p>
            <p>
              Thông báo: <span className="font-semibold">{message || "-"}</span>
            </p>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/profile">
              <Button>Theo dõi đơn hàng</Button>
            </Link>
            <Link to="/cart">
              <Button variant="outline">Quay lại giỏ hàng</Button>
            </Link>
            <Link to="/components">
              <Button variant="ghost">Tiếp tục mua sắm</Button>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
