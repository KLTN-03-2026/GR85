import { useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

export default function PayOSReturnPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    async function confirmPayment() {
      const orderId = Number(searchParams.get("orderId") ?? "");
      const isSuccessPath = location.pathname.endsWith("/success");

      if (!Number.isFinite(orderId) || orderId <= 0) {
        navigate(
          `/payment-result?status=failed&message=${encodeURIComponent("Thiếu mã đơn hàng")}`,
          { replace: true },
        );
        return;
      }

      if (!isSuccessPath) {
        navigate(
          `/payment-result?status=failed&orderId=${orderId}&message=${encodeURIComponent("Bạn đã hủy thanh toán")}`,
          { replace: true },
        );
        return;
      }

      try {
        const response = await fetch(`/api/payments/status?orderId=${orderId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.message ?? "Không thể xác nhận trạng thái thanh toán");
        }

        const status = payload?.success ? "success" : "failed";
        const currentStatus = String(payload?.status ?? "UNKNOWN").toUpperCase();

        if (!payload?.success && ["PENDING", "PROCESSING", "NOT_FOUND", "UNKNOWN"].includes(currentStatus)) {
          navigate(
            "/payment-payos",
            {
              replace: true,
              state: {
                paymentData: {
                  orderId,
                  checkoutUrl: payload?.checkoutUrl,
                  qrCode: payload?.qrCode,
                  remainingPayableAmount: null,
                },
              },
            },
          );
          return;
        }

        const message = payload?.success
          ? "Thanh toán thành công qua PayOS"
          : `Thanh toán chưa hoàn tất (${currentStatus})`;

        navigate(
          `/payment-result?status=${status}&orderId=${orderId}&txnNo=${encodeURIComponent(String(payload?.transactionNo ?? ""))}&message=${encodeURIComponent(message)}`,
          { replace: true },
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Lỗi xác nhận thanh toán";
        navigate(
          `/payment-result?status=failed&orderId=${orderId}&message=${encodeURIComponent(errorMessage)}`,
          { replace: true },
        );
      }
    }

    confirmPayment();
  }, [location.pathname, navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">Đang xác nhận thanh toán PayOS...</p>
    </div>
  );
}
