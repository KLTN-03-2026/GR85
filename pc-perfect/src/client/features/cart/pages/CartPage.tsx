import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { useCart } from '@/contexts/CartContext';
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight, Package } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, totalPrice, clearCart } = useCart();

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="pt-24 pb-12">
          <div className="container mx-auto px-4">
            <div className="text-center py-20">
              <div className="w-24 h-24 rounded-full bg-secondary mx-auto mb-6 flex items-center justify-center">
                <ShoppingBag className="w-12 h-12 text-muted-foreground" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">Giỏ hàng trống</h2>
              <p className="text-muted-foreground mb-6">
                Bạn chưa thêm sản phẩm nào vào giỏ hàng
              </p>
              <Link to="/components">
                <Button variant="hero" className="gap-2">
                  <ShoppingBag className="w-4 h-4" />
                  Mua sắm ngay
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
                Giỏ <span className="text-gradient-primary">hàng</span>
              </h1>
              <p className="text-muted-foreground">
                {items.length} sản phẩm trong giỏ
              </p>
            </div>
            <Button variant="ghost" className="text-destructive" onClick={clearCart}>
              <Trash2 className="w-4 h-4 mr-2" />
              Xóa tất cả
            </Button>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left - Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item) => (
                <Card key={`${item.component.id}-${item.isUsed}`} className="glass border-border/50 p-4">
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="w-24 h-24 bg-secondary/50 rounded-lg flex-shrink-0 overflow-hidden">
                      <img
                        src={item.component.image}
                        alt={item.component.name}
                        className="w-full h-full object-contain p-2"
                      />
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground uppercase tracking-wider">
                            {item.component.brand}
                          </p>
                          <h3 className="font-semibold line-clamp-1">{item.component.name}</h3>
                          {item.isUsed && (
                            <span className="inline-flex items-center gap-1 text-xs text-storage mt-1">
                              <Package className="w-3 h-3" />
                              Đồ cũ
                            </span>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => removeFromCart(item.component.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="flex items-center justify-between mt-4">
                        {/* Quantity */}
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.component.id, item.quantity - 1)}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="w-8 text-center font-medium">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.component.id, item.quantity + 1)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        {/* Price */}
                        <p className="text-lg font-bold text-primary">
                          {formatPrice(
                            (item.isUsed && item.component.usedPrice
                              ? item.component.usedPrice
                              : item.component.price) * item.quantity
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            {/* Right - Order Summary */}
            <div className="lg:col-span-1">
              <Card className="glass border-primary/20 p-6 sticky top-24">
                <h2 className="font-display text-xl font-bold mb-6">Tóm tắt đơn hàng</h2>

                <div className="space-y-4 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tạm tính</span>
                    <span>{formatPrice(totalPrice)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Phí vận chuyển</span>
                    <span className="text-storage">Miễn phí</span>
                  </div>
                </div>

                <Separator className="mb-4" />

                <div className="flex justify-between mb-6">
                  <span className="font-semibold">Tổng cộng</span>
                  <span className="text-2xl font-bold text-gradient-primary">
                    {formatPrice(totalPrice)}
                  </span>
                </div>

                {/* Promo Code */}
                <div className="flex gap-2 mb-6">
                  <Input placeholder="Mã giảm giá" />
                  <Button variant="outline">Áp dụng</Button>
                </div>

                <Button variant="hero" className="w-full gap-2">
                  Tiến hành thanh toán
                  <ArrowRight className="w-4 h-4" />
                </Button>

                <p className="text-xs text-muted-foreground text-center mt-4">
                  Bằng việc đặt hàng, bạn đồng ý với điều khoản sử dụng
                </p>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
