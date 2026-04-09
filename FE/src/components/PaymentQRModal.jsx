import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

export default function PaymentQRModal({
  isOpen,
  onClose,
  paymentData,
  title = "Thanh toán tạm thời",
  description = "Quét mã QR bên dưới hoặc sử dụng mã thanh toán để xác nhận",
  actionLabel = "Đã xác nhận",
  confirmNote = "Tiếp tục mua sắm hoặc xem đơn hàng của bạn",
  codeLabel = "Mã thanh toán",
  amountLabel = "Tổng tiền",
}) {
  const [copied, setCopied] = useState(false);

  if (!paymentData) return null;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(paymentData.paymentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  const displayAmount =
    paymentData.totalAmount ?? paymentData.topUpAmount ?? paymentData.amount ?? 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* QR Code */}
          {paymentData.qrCodeDataUrl && (
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg border-2 border-primary/20">
                <img
                  src={paymentData.qrCodeDataUrl}
                  alt="Payment QR Code"
                  className="w-48 h-48"
                />
              </div>
            </div>
          )}

          {/* Payment Code */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{codeLabel}</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={paymentData.paymentCode}
                readOnly
                className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-center font-mono font-bold text-lg tracking-wide"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                title="Copy payment code"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Mã này đã được gửi đến email của bạn
            </p>
          </div>

          {/* Order Info */}
          <div className="space-y-2 rounded-lg bg-secondary/30 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mã đơn hàng:</span>
              <span className="font-semibold">#{paymentData.orderId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{amountLabel}:</span>
              <span className="font-semibold text-primary">
                {formatPrice(displayAmount)}
              </span>
            </div>
            {paymentData.expiresAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hết hạn:</span>
                <span className="font-semibold">
                  {new Date(paymentData.expiresAt).toLocaleTimeString("vi-VN")}
                </span>
              </div>
            )}
          </div>

          {/* Warning */}
          <div className="rounded-lg bg-amber-50/60 border border-amber-200 p-3 space-y-2">
            <p className="text-sm font-medium text-amber-900">
              ⚠️ Lưu ý
            </p>
            <p className="text-xs text-amber-800">
              Đây là hình thức thanh toán tạm thời. Vui lòng giữ kín mã thanh toán và không chia sẻ cho ai khác.
            </p>
          </div>

          {/* Buttons */}
          <div className="space-y-2">
            <Button
              variant="hero"
              className="w-full"
              onClick={onClose}
            >
              {actionLabel}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {confirmNote}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
