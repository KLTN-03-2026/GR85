import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch(`/api/products/${slug}`);
        if (!response.ok) {
          throw new Error("Không tải được chi tiết sản phẩm");
        }

        const payload = await response.json();
        if (!cancelled) {
          setProduct(payload);
        }
      } catch (error) {
        if (!cancelled) {
          setProduct(null);
          setErrorMessage(error instanceof Error ? error.message : "Có lỗi xảy ra");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    if (slug) {
      loadDetail();
    }

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 pt-24 pb-12">
        <Link to="/components" className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <ArrowLeft className="w-4 h-4" />
          Quay lại danh sách
        </Link>

        {isLoading ? (
          <p className="mt-8 text-muted-foreground">Đang tải chi tiết sản phẩm...</p>
        ) : errorMessage ? (
          <p className="mt-8 text-destructive">{errorMessage}</p>
        ) : product ? (
          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <div className="rounded-2xl border bg-white p-6">
              <img
                src={product.imageUrl || "/robots.txt"}
                alt={product.name}
                className="h-[360px] w-full rounded-xl object-contain"
              />
            </div>

            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">Mã sản phẩm: {product.productCode}</p>
              <h1 className="text-3xl font-bold">{product.name}</h1>
              <p className="text-sm text-muted-foreground">Danh mục: {product?.category?.name}</p>
              <p className="text-2xl font-bold text-primary">{formatMoney(product.price)}</p>
              <p className="text-sm">
                {Number(product.stockQuantity) > 0 ? (
                  <span className="text-emerald-600">Còn hàng ({product.stockQuantity})</span>
                ) : (
                  <span className="text-rose-600">Hết hàng</span>
                )}
              </p>

              <div className="space-y-2">
                <h2 className="font-semibold">Thông số chính</h2>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(product.specifications ?? {}).map(([key, value]) => (
                    <div key={key} className="rounded-lg border bg-secondary/40 px-3 py-2 text-sm">
                      <span className="font-medium">{key}:</span> {String(value)}
                    </div>
                  ))}
                </div>
              </div>

              <Button
                disabled={Number(product.stockQuantity) <= 0}
                onClick={async () => {
                  try {
                    await addToCart({ id: product.id });
                  } catch (error) {
                    window.alert(
                      error instanceof Error
                        ? error.message
                        : "Không thể thêm vào giỏ hàng",
                    );
                  }
                }}
              >
                {Number(product.stockQuantity) > 0 ? "Thêm vào giỏ" : "Hết hàng"}
              </Button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function formatMoney(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}
