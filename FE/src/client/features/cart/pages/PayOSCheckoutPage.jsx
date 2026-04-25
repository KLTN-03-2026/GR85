import { useEffect, useMemo, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const POLL_INTERVAL_MS = 5000;
const PAYOS_PAYMENT_EVENT_KEY = "payos-payment-event";
const PAYOS_PAYMENT_EVENT_MAX_AGE_MS = 10 * 60 * 1000;

export default function PayOSCheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const paymentData = location.state?.paymentData ?? null;
  const [statusText, setStatusText] = useState("Đang chờ bạn thanh toán...");
  const [isPolling, setIsPolling] = useState(true);

  const orderId = Number(paymentData?.orderId);
  const checkoutUrl = String(paymentData?.checkoutUrl ?? "").trim();
  const qrValue = String(paymentData?.qrCode ?? "").trim();
  const qrImageUrl = useMemo(() => {
    if (!qrValue) {
      return "";
    }

    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrValue)}`;
  }, [qrValue]);

  useEffect(() => {
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return undefined;
    }

    function handlePaymentEvent(rawValue) {
      if (!rawValue) {
        return;
      }

      try {
        const event = JSON.parse(rawValue);
        if (Number(event?.orderId) !== orderId) {
          return;
        }
        if (Date.now() - Number(event?.timestamp ?? 0) > PAYOS_PAYMENT_EVENT_MAX_AGE_MS) {
          return;
        }

        setIsPolling(false);
        navigate(String(event?.redirectUrl ?? "/payment-result?status=failed"), {
          replace: true,
        });
      } catch (_error) {
        // Ignore malformed cross-tab events.
      }
    }

    function handleStorage(event) {
      if (event.key !== PAYOS_PAYMENT_EVENT_KEY) {
        return;
      }

      handlePaymentEvent(event.newValue);
    }

    window.addEventListener("storage", handleStorage);
    handlePaymentEvent(window.localStorage.getItem(PAYOS_PAYMENT_EVENT_KEY));

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [navigate, orderId]);

  useEffect(() => {
    if (!Number.isFinite(orderId) || orderId <= 0) {
      return;
    }

    let cancelled = false;

    async function checkStatus() {
      try {
        const response = await fetch(`/api/payments/status?orderId=${orderId}`, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload?.message ?? "Không thể lấy trạng thái thanh toán");
        }

        if (cancelled) {
          return;
        }

        if (payload?.success) {
          setIsPolling(false);
          navigate(
            `/payment-result?status=success&orderId=${orderId}&txnNo=${encodeURIComponent(String(payload?.transactionNo ?? ""))}&message=${encodeURIComponent("Thanh toán thành công qua PayOS")}`,
            { replace: true },
          );
          return;
        }

        const currentStatus = String(payload?.status ?? "PENDING").toUpperCase();
        if (["CANCELLED", "EXPIRED", "FAILED"].includes(currentStatus)) {
          setIsPolling(false);
          navigate(
            `/payment-result?status=failed&orderId=${orderId}&txnNo=${encodeURIComponent(String(payload?.transactionNo ?? ""))}&message=${encodeURIComponent(`Thanh toán thất bại (${currentStatus})`)}`,
            { replace: true },
          );
          return;
        }

        setStatusText(`Trạng thái hiện tại: ${currentStatus}. Hệ thống sẽ tự cập nhật khi nhận tiền.`);
      } catch (error) {
        if (!cancelled) {
          setStatusText(error instanceof Error ? error.message : "Lỗi kiểm tra trạng thái thanh toán");
        }
      }
    }

    checkStatus();
    const timer = setInterval(() => {
      if (isPolling) {
        checkStatus();
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isPolling, navigate, orderId]);

  if (!paymentData?.orderId) {
    return <Navigate to="/cart" replace />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pb-12 pt-28">
        <Card className="mx-auto max-w-2xl border-border/70 p-6">
          <h1 className="text-2xl font-bold">Thanh toán PayOS</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Quét QR bên dưới hoặc mở cổng PayOS để hoàn tất chuyển khoản. Sau khi PayOS xác nhận, trang sẽ tự chuyển sang kết quả thanh toán.
          </p>

          <div className="mt-6 space-y-4">
            <div className="rounded-lg border border-border/70 p-4 text-sm">
              <p>
                Mã đơn: <span className="font-semibold">#{orderId}</span>
              </p>
              <p>
                Số tiền: <span className="font-semibold text-primary">{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(paymentData?.remainingPayableAmount ?? paymentData?.totalAmount ?? 0))}</span>
              </p>
            </div>

            {qrImageUrl ? (
              <div className="flex justify-center">
                <div className="rounded-lg border border-border bg-white p-4">
                  <img src={qrImageUrl} alt="PayOS QR" className="h-72 w-72" />
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Không nhận được mã QR, bạn có thể mở cổng PayOS bên dưới.</p>
            )}

            <div className="rounded-lg border border-border/70 p-4 text-sm">
              <p className="font-medium">{statusText}</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() => {
                  if (checkoutUrl) {
                    window.open(checkoutUrl, "_blank", "noopener,noreferrer");
                  }
                }}
                disabled={!checkoutUrl}
              >
                Mở cổng PayOS
              </Button>
              <Link to="/profile">
                <Button variant="outline">Theo dõi đơn hàng</Button>
              </Link>
              <Link to="/components">
                <Button variant="ghost">Mua sắm lại</Button>
              </Link>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
