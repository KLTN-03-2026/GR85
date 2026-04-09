import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { ComponentCard } from '@/components/ComponentCard';
import { mockComponents, componentCategories, usageTypes, brands } from '@/client/features/catalog/data/mock-components';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Search, SlidersHorizontal, X, Sparkles, ArrowRight } from 'lucide-react';
import { ComponentCategory } from '@/types/pc-components';
import { Link } from 'react-router-dom';

export default function ComponentsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<ComponentCategory | 'all'>('all');
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState([0, 50000000]);
  const [showUsedOnly, setShowUsedOnly] = useState(false);
  const [showNewOnly, setShowNewOnly] = useState(false);

  const filteredComponents = mockComponents.filter((component) => {
    // Search filter
    if (searchQuery && !component.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !component.brand.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }

    // Category filter
    if (selectedCategory !== 'all' && component.category !== selectedCategory) {
      return false;
    }

    // Brand filter
    if (selectedBrands.length > 0 && !selectedBrands.includes(component.brand)) {
      return false;
    }

    // Price filter
    if (component.price < priceRange[0] || component.price > priceRange[1]) {
      return false;
    }

    // Used filter
    if (showUsedOnly && !component.usedPrice) {
      return false;
    }

    // New filter
    if (showNewOnly && !component.isNew) {
      return false;
    }

    return true;
  });

  const toggleBrand = (brand: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brand)
        ? prev.filter((b) => b !== brand)
        : [...prev, brand]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedBrands([]);
    setPriceRange([0, 50000000]);
    setShowUsedOnly(false);
    setShowNewOnly(false);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const hasActiveFilters = selectedCategory !== 'all' || selectedBrands.length > 0 || 
    priceRange[0] > 0 || priceRange[1] < 50000000 || showUsedOnly || showNewOnly;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">
              Linh kiện <span className="text-gradient-primary">PC</span>
            </h1>
            <p className="text-muted-foreground">
              Khám phá hàng trăm linh kiện từ các thương hiệu hàng đầu
            </p>
          </div>

          {/* Search & Filter Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Tìm kiếm linh kiện..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <SlidersHorizontal className="w-4 h-4" />
                  Bộ lọc
                  {hasActiveFilters && (
                    <Badge className="bg-primary text-primary-foreground ml-1">
                      Đang lọc
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="glass border-border/50">
                <SheetHeader>
                  <SheetTitle className="font-display">Bộ lọc</SheetTitle>
                </SheetHeader>
                
                <div className="space-y-6 mt-6">
                  {/* Price Range */}
                  <div className="space-y-4">
                    <Label>Khoảng giá</Label>
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      min={0}
                      max={50000000}
                      step={1000000}
                    />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{formatPrice(priceRange[0])}</span>
                      <span>{formatPrice(priceRange[1])}</span>
                    </div>
                  </div>

                  {/* Brands */}
                  <div className="space-y-3">
                    <Label>Thương hiệu</Label>
                    <div className="flex flex-wrap gap-2">
                      {brands.map((brand) => (
                        <Badge
                          key={brand}
                          variant={selectedBrands.includes(brand) ? 'default' : 'outline'}
                          className="cursor-pointer"
                          onClick={() => toggleBrand(brand)}
                        >
                          {brand}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Toggles */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Chỉ hiện đồ cũ</Label>
                      <Switch
                        checked={showUsedOnly}
                        onCheckedChange={setShowUsedOnly}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label>Chỉ hiện hàng mới</Label>
                      <Switch
                        checked={showNewOnly}
                        onCheckedChange={setShowNewOnly}
                      />
                    </div>
                  </div>

                  {/* Clear Filters */}
                  {hasActiveFilters && (
                    <Button variant="outline" className="w-full" onClick={clearFilters}>
                      Xóa bộ lọc
                    </Button>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Link to="/ai-recommend">
              <Button variant="accent" className="gap-2">
                <Sparkles className="w-4 h-4" />
                AI Gợi ý
              </Button>
            </Link>
          </div>

          {/* Category Tabs */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-8 scrollbar-hide">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              Tất cả
            </Button>
            {componentCategories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setSelectedCategory(category.id as ComponentCategory)}
              >
                {category.name}
              </Button>
            ))}
          </div>

          {/* Active Filters */}
          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedCategory !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  {componentCategories.find(c => c.id === selectedCategory)?.name}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => setSelectedCategory('all')}
                  />
                </Badge>
              )}
              {selectedBrands.map((brand) => (
                <Badge key={brand} variant="secondary" className="gap-1">
                  {brand}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => toggleBrand(brand)}
                  />
                </Badge>
              ))}
              {showUsedOnly && (
                <Badge variant="secondary" className="gap-1">
                  Đồ cũ
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => setShowUsedOnly(false)}
                  />
                </Badge>
              )}
              {showNewOnly && (
                <Badge variant="secondary" className="gap-1">
                  Hàng mới
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => setShowNewOnly(false)}
                  />
                </Badge>
              )}
            </div>
          )}

          {/* Results Count */}
          <p className="text-sm text-muted-foreground mb-6">
            Hiển thị {filteredComponents.length} sản phẩm
          </p>

          {/* Products Grid */}
          {filteredComponents.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredComponents.map((component) => (
                <ComponentCard key={component.id} component={component} />
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <p className="text-muted-foreground mb-4">
                Không tìm thấy sản phẩm phù hợp
              </p>
              <Button variant="outline" onClick={clearFilters}>
                Xóa bộ lọc
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
