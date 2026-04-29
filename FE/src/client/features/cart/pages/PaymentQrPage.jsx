import { useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Copy, Check } from "lucide-react";
import { useCart } from "@/contexts/CartContext";

export default function PaymentQrPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { confirmMockPayment } = useCart();
  const [copied, setCopied] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");
  const [copiedField, setCopiedField] = useState("");

  const paymentData = location.state?.paymentData ?? null;
  const bankTransfer = paymentData?.bankTransfer ?? null;
  const paymentProvider = String(paymentData?.paymentProvider ?? "VNPAY").toUpperCase();

  if (!paymentData?.orderId) {
    return <Navigate to="/cart" replace />;
  }

  const displayAmount =
    paymentData.totalAmount ?? paymentData.topUpAmount ?? paymentData.amount ?? 0;

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const copyField = async (value, field) => {
    await navigator.clipboard.writeText(String(value ?? ""));
    setCopiedField(field);
    if (field === "paymentCode") {
      setCopied(true);
    }
    setTimeout(() => {
      setCopiedField("");
      if (field === "paymentCode") {
        setCopied(false);
      }
    }, 1600);
  };

  const copyToClipboard = async () => {
    await copyField(paymentData.paymentCode, "paymentCode");
  };

  const handleConfirmPaid = async () => {
    setError("");
    try {
      setIsConfirming(true);
      const result = await confirmMockPayment({
        orderId: Number(paymentData.orderId),
        paymentCode: paymentData.paymentCode,
      });

      const status = String(result?.status ?? "success").toLowerCase();
      const message = encodeURIComponent(String(result?.message ?? "Payment confirmed"));
      navigate(
        `/payment-result?status=${status}&orderId=${paymentData.orderId}&txnNo=${encodeURIComponent(String(paymentData.paymentCode ?? ""))}&message=${message}`,
        { replace: true },
      );
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Xác nhận thanh toán thất bại",
      );
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 pb-12 pt-28">
        <Card className="mx-auto max-w-2xl border-border/70 p-6">
          <h1 className="text-2xl font-bold">Quét mã QR để thanh toán</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Quét mã VNPAY/SePay/VietQR bằng app ngân hàng hoặc ví điện tử, kiểm tra đúng số tiền và nội dung chuyển khoản rồi nhấn "Đã quét xong".
          </p>

          <div className="mt-6 space-y-5">
            {paymentData.qrCodeDataUrl && (
              <div className="flex justify-center">
                <div className="rounded-lg border border-border bg-white p-4">
                  <img
                    src={paymentData.qrCodeDataUrl}
                    alt="QR thanh toan"
                    className="h-56 w-56"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2 rounded-lg border border-border/70 p-4">
              <p className="text-sm text-muted-foreground">Mã thanh toán</p>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={String(paymentData.paymentCode ?? "")}
                  className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-center font-mono text-sm font-semibold"
                />
                <Button type="button" variant="outline" size="icon" onClick={copyToClipboard}>
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border border-border/70 p-4 text-sm">
              <p>
                Mã đơn: <span className="font-semibold">#{paymentData.orderId}</span>
              </p>
              <p>
                Số tiền cần thanh toán: <span className="font-semibold text-primary">{formatPrice(displayAmount)}</span>
              </p>
              {paymentData.expiresAt && (
                <p>
                  Hết hạn: <span className="font-semibold">{new Date(paymentData.expiresAt).toLocaleString("vi-VN")}</span>
                </p>
              )}
            </div>

            {bankTransfer && (
              <div className="space-y-3 rounded-lg border border-primary/25 bg-primary/5 p-4 text-sm">
                <p className="font-semibold text-primary">Thông tin chuyển khoản chi tiết</p>

                <div className="grid gap-2">
                  <p>
                    Ngân hàng: <span className="font-semibold">{bankTransfer.bankName || "-"}</span>
                    {bankTransfer.bankBin ? ` (${bankTransfer.bankBin})` : ""}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <p>
                      Số tài khoản: <span className="font-semibold">{bankTransfer.accountNumber || "-"}</span>
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => copyField(bankTransfer.accountNumber, "accountNumber")}
                    >
                      {copiedField === "accountNumber" ? "Đã copy" : "Copy STK"}
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p>
                      Chủ tài khoản: <span className="font-semibold">{bankTransfer.accountName || "-"}</span>
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => copyField(bankTransfer.accountName, "accountName")}
                    >
                      {copiedField === "accountName" ? "Đã copy" : "Copy tên"}
                    </Button>
                  </div>
                  <p>
                    Số tiền chuyển: <span className="font-semibold text-primary">{formatPrice(bankTransfer.amount ?? displayAmount)}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <p>
                      Nội dung CK: <span className="font-semibold">{bankTransfer.transferContent || paymentData.paymentCode}</span>
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyField(
                          bankTransfer.transferContent || paymentData.paymentCode,
                          "transferContent",
                        )
                      }
                    >
                      {copiedField === "transferContent" ? "Đã copy" : "Copy nội dung"}
                    </Button>
                  </div>
                </div>

                {Array.isArray(bankTransfer.supportedApps) && bankTransfer.supportedApps.length > 0 && (
                  <div className="rounded-md border border-border/70 bg-background/80 p-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      App thường hỗ trợ quét
                    </p>
                    <p className="text-xs leading-relaxed text-muted-foreground">
                      {bankTransfer.supportedApps.join(" • ")}
                    </p>
                  </div>
                )}
              </div>
            )}

            {error && <p className="text-sm text-destructive">{error}</p>}

            <div className="flex flex-wrap gap-3">
              <Button variant="hero" onClick={handleConfirmPaid} disabled={isConfirming}>
                {isConfirming ? "Đang xác nhận..." : "Đã quét xong"}
              </Button>
              <Link to="/cart">
                <Button variant="outline">Quay lại giỏ hàng</Button>
              </Link>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
