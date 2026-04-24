import { useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";

const PAYOS_PAYMENT_EVENT_KEY = "payos-payment-event";

export default function PayOSReturnPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    function broadcastRedirect(orderId, redirectUrl) {
      if (typeof window === "undefined") {
        return;
      }

      window.localStorage.setItem(
        PAYOS_PAYMENT_EVENT_KEY,
        JSON.stringify({
          orderId,
          redirectUrl,
          timestamp: Date.now(),
        }),
      );
    }

    async function confirmPayment() {
      const orderId = Number(searchParams.get("orderId") ?? searchParams.get("orderCode") ?? "");
      const isSuccessPath = location.pathname.endsWith("/success");
      const returnCode = String(searchParams.get("code") ?? "").trim();
      const returnStatus = String(searchParams.get("status") ?? "").trim().toUpperCase();
      const isCancelled = String(searchParams.get("cancel") ?? "").trim().toLowerCase() === "true";
      const paymentLinkId = String(searchParams.get("id") ?? "").trim();

      if (!Number.isFinite(orderId) || orderId <= 0) {
        const redirectUrl = `/payment-result?status=failed&message=${encodeURIComponent("Thieu ma don hang")}`;
        broadcastRedirect(orderId, redirectUrl);
        navigate(redirectUrl, { replace: true });
        return;
      }

      if (!isSuccessPath) {
        const redirectUrl =
          `/payment-result?status=failed&orderId=${orderId}` +
          `&message=${encodeURIComponent("Ban da huy thanh toan")}`;
        broadcastRedirect(orderId, redirectUrl);
        navigate(redirectUrl, { replace: true });
        return;
      }

      if (returnCode === "00" && returnStatus === "PAID" && !isCancelled) {
        const redirectUrl =
          `/payment-result?status=success&orderId=${orderId}` +
          `&txnNo=${encodeURIComponent(paymentLinkId)}` +
          `&message=${encodeURIComponent("Thanh toan thanh cong qua PayOS")}`;

        fetch(`/api/payments/confirm-return?${searchParams.toString()}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }).catch(() => null);

        broadcastRedirect(orderId, redirectUrl);
        navigate(redirectUrl, { replace: true });
        return;
      }

      try {
        const response = await fetch(`/api/payments/confirm-return?orderId=${orderId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.message ?? "Khong the xac nhan trang thai thanh toan");
        }

        const status = payload?.success ? "success" : "failed";
        const currentStatus = String(payload?.status ?? "UNKNOWN").toUpperCase();

        if (!payload?.success && ["PENDING", "PROCESSING", "NOT_FOUND", "UNKNOWN"].includes(currentStatus)) {
          const redirectUrl = "/payment-payos";
          navigate(redirectUrl, {
            replace: true,
            state: {
              paymentData: {
                orderId,
                checkoutUrl: payload?.checkoutUrl,
                qrCode: payload?.qrCode,
                remainingPayableAmount: null,
              },
            },
          });
          return;
        }

        const message = payload?.success
          ? "Thanh toan thanh cong qua PayOS"
          : `Thanh toan chua hoan tat (${currentStatus})`;
        const redirectUrl =
          `/payment-result?status=${status}&orderId=${orderId}` +
          `&txnNo=${encodeURIComponent(String(payload?.transactionNo ?? ""))}` +
          `&message=${encodeURIComponent(message)}`;

        broadcastRedirect(orderId, redirectUrl);
        navigate(redirectUrl, { replace: true });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Loi xac nhan thanh toan";
        const redirectUrl =
          `/payment-result?status=failed&orderId=${orderId}` +
          `&message=${encodeURIComponent(errorMessage)}`;
        broadcastRedirect(orderId, redirectUrl);
        navigate(redirectUrl, { replace: true });
      }
    }

    confirmPayment();
  }, [location.pathname, navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <p className="text-sm text-muted-foreground">Dang xac nhan thanh toan PayOS...</p>
    </div>
  );
}
