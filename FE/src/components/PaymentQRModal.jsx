// Importing necessary components and hooks from external libraries and local files
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

// Defining the PaymentQRModal component
export default function PaymentQRModal({
  isOpen, // Boolean to control the visibility of the modal
  onClose, // Function to handle closing the modal
  paymentData, // Object containing payment-related data
  title = "Thanh toán tạm thời", // Default title for the modal
  description = "Quét mã QR bên dưới hoặc sử dụng mã thanh toán để xác nhận", // Default description for the modal
  actionLabel = "Đã xác nhận", // Default label for the confirmation button
  confirmNote = "Tiếp tục mua sắm hoặc xem đơn hàng của bạn", // Default note after confirmation
  codeLabel = "Mã thanh toán", // Label for the payment code
  amountLabel = "Tổng tiền", // Label for the total amount
}) {
  const [copied, setCopied] = useState(false); // State to track if the payment code has been copied

  // If no payment data is provided, do not render the modal
  if (!paymentData) return null;

  // Function to copy the payment code to the clipboard
  const copyToClipboard = () => {
    navigator.clipboard.writeText(paymentData.paymentCode); // Copy the payment code to clipboard
    setCopied(true); // Set copied state to true
    setTimeout(() => setCopied(false), 2000); // Reset copied state after 2 seconds
  };

  // Function to format the price in VND currency format
  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(price);
  };

  // Determine the amount to display based on available payment data
  const displayAmount =
    paymentData.totalAmount ?? paymentData.topUpAmount ?? paymentData.amount ?? 0;

  return (
    // Dialog component to display the modal
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle> {/* Modal title */}
          <DialogDescription>{description}</DialogDescription> {/* Modal description */}
        </DialogHeader>

        <div className="space-y-6 py-6">
          {/* QR Code Section */}
          {paymentData.qrCodeDataUrl && (
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg border-2 border-primary/20">
                <img
                  src={paymentData.qrCodeDataUrl} // QR code image source
                  alt="Payment QR Code" // Alternative text for the QR code image
                  className="w-48 h-48" // Styling for the QR code image
                />
              </div>
            </div>
          )}

          {/* Payment Code Section */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{codeLabel}</label> {/* Label for payment code */}
            <div className="flex gap-2">
              <input
                type="text"
                value={paymentData.paymentCode} // Display the payment code
                readOnly
                className="flex-1 px-3 py-2 rounded-md border border-input bg-background text-center font-mono font-bold text-lg tracking-wide" // Styling for the input field
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard} // Copy payment code on button click
                title="Copy payment code"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-emerald-600" /> // Show check icon if copied
                ) : (
                  <Copy className="w-4 h-4" /> // Show copy icon if not copied
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Mã này đã được gửi đến email của bạn {/* Note about the payment code */}
            </p>
          </div>

          {/* Order Information Section */}
          <div className="space-y-2 rounded-lg bg-secondary/30 p-4">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Mã đơn hàng:</span> {/* Order ID label */}
              <span className="font-semibold">#{paymentData.orderId}</span> {/* Display order ID */}
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">{amountLabel}:</span> {/* Total amount label */}
              <span className="font-semibold text-primary">
                {formatPrice(displayAmount)} {/* Display formatted total amount */}
              </span>
            </div>
            {paymentData.expiresAt && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Hết hạn:</span> {/* Expiry label */}
                <span className="font-semibold">
                  {new Date(paymentData.expiresAt).toLocaleTimeString("vi-VN")} {/* Display expiry time */}
                </span>
              </div>
            )}
          </div>

          {/* Warning Section */}
          <div className="rounded-lg bg-amber-50/60 border border-amber-200 p-3 space-y-2">
            <p className="text-sm font-medium text-amber-900">
              ⚠️ Lưu ý {/* Warning title */}
            </p>
            <p className="text-xs text-amber-800">
              Đây là hình thức thanh toán tạm thời. Vui lòng giữ kín mã thanh toán và không chia sẻ cho ai khác. {/* Warning message */}
            </p>
          </div>

          {/* Action Buttons Section */}
          <div className="space-y-2">
            <Button
              variant="hero"
              className="w-full"
              onClick={onClose} // Close modal on button click
            >
              {actionLabel} {/* Confirmation button label */}
            </Button>
            <p className="text-xs text-muted-foreground text-center">
              {confirmNote} {/* Confirmation note */}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
