import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { ComponentCard } from '@/components/ComponentCard';
import { mockComponents, componentCategories } from '@/client/features/catalog/data/mock-components';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useBuild } from '@/contexts/BuildContext';
import { useCart } from '@/contexts/CartContext';
import { ComponentCategory } from '@/types/pc-components';
import { 
  Cpu, Monitor, MemoryStick, HardDrive, CircuitBoard, 
  Zap, Box, Fan, Plus, X, Download, ShoppingCart, 
  Trash2, Package
} from 'lucide-react';

const categoryIcons: Record<ComponentCategory, React.ElementType> = {
  cpu: Cpu,
  gpu: Monitor,
  ram: MemoryStick,
  storage: HardDrive,
  motherboard: CircuitBoard,
  psu: Zap,
  case: Box,
  cooling: Fan,
};

export default function BuilderPage() {
  const { currentBuild, removeComponent, clearBuild, totalPrice, useUsedPrices, setUseUsedPrices } = useBuild();
  const { addToCart } = useCart();
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory>('cpu');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(price);
  };

  const availableComponents = mockComponents.filter(
    (c) => c.category === selectedCategory
  );

  const exportBuild = () => {
    const buildData = {
      name: currentBuild.name,
      date: new Date().toLocaleDateString('vi-VN'),
      useUsedPrices,
      components: Object.entries(currentBuild.components).map(([category, component]) => ({
        category,
        name: component?.name,
        brand: component?.brand,
        price: useUsedPrices && component?.usedPrice ? component.usedPrice : component?.price,
        specs: component?.specs,
      })),
      totalPrice,
    };

    const blob = new Blob([JSON.stringify(buildData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pc-build-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const addBuildToCart = () => {
    Object.values(currentBuild.components).forEach((component) => {
      if (component) {
        addToCart(component, useUsedPrices);
      }
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
              PC <span className="text-gradient-primary">Builder</span>
            </h1>
            <p className="text-muted-foreground">
              Tự chọn từng linh kiện để xây dựng PC hoàn hảo
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Left - Build Summary */}
            <div className="lg:col-span-1 space-y-4">
              <Card className="glass border-primary/20 p-6 sticky top-24">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-display text-xl font-bold">Cấu hình của bạn</h2>
                  {Object.keys(currentBuild.components).length > 0 && (
                    <Button variant="ghost" size="icon" onClick={clearBuild}>
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>

                {/* Use Used Prices Toggle */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-border/50">
                  <Label className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-storage" />
                    Sử dụng giá đồ cũ
                  </Label>
                  <Switch
                    checked={useUsedPrices}
                    onCheckedChange={setUseUsedPrices}
                  />
                </div>

                {/* Component List */}
                <div className="space-y-3 mb-6">
                  {componentCategories.map((cat) => {
                    const component = currentBuild.components[cat.id as ComponentCategory];
                    const Icon = categoryIcons[cat.id as ComponentCategory];
                    
                    return (
                      <div
                        key={cat.id}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                          selectedCategory === cat.id 
                            ? 'border-primary bg-primary/5' 
                            : 'border-border/50 hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedCategory(cat.id as ComponentCategory)}
                      >
                        <div className="flex items-center gap-3">
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center"
                            style={{ backgroundColor: `hsl(var(--${cat.color}) / 0.2)` }}
                          >
                            <Icon 
                              className="w-4 h-4" 
                              style={{ color: `hsl(var(--${cat.color}))` }}
                            />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{cat.name}</p>
                            {component ? (
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {component.name}
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Chưa chọn</p>
                            )}
                          </div>
                        </div>
                        
                        {component ? (
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-primary">
                              {formatPrice(
                                useUsedPrices && component.usedPrice 
                                  ? component.usedPrice 
                                  : component.price
                              )}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeComponent(cat.id as ComponentCategory);
                              }}
                            >
                              <X className="w-3 h-3" />
                            </Button>
                          </div>
                        ) : (
                          <Plus className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    );
                  })}
                </div>

                <Separator className="mb-4" />

                {/* Total */}
                <div className="flex items-center justify-between mb-6">
                  <span className="font-semibold">Tổng cộng:</span>
                  <span className="text-2xl font-bold text-gradient-primary">
                    {formatPrice(totalPrice)}
                  </span>
                </div>

                {/* Actions */}
                <div className="space-y-2">
                  <Button 
                    variant="hero" 
                    className="w-full gap-2"
                    onClick={addBuildToCart}
                    disabled={Object.keys(currentBuild.components).length === 0}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Thêm vào giỏ hàng
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={exportBuild}
                    disabled={Object.keys(currentBuild.components).length === 0}
                  >
                    <Download className="w-4 h-4" />
                    Xuất file cấu hình
                  </Button>
                </div>
              </Card>
            </div>

            {/* Right - Component Selection */}
            <div className="lg:col-span-2">
              <div className="mb-6">
                <h3 className="font-display text-xl font-semibold mb-2">
                  Chọn {componentCategories.find(c => c.id === selectedCategory)?.name}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {availableComponents.length} sản phẩm
                </p>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                {availableComponents.map((component) => (
                  <ComponentCard 
                    key={component.id} 
                    component={component} 
                    mode="builder"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
