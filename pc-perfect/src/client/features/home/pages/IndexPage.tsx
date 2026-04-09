import { Navbar } from '@/components/Navbar';
import { HeroSection } from '@/components/HeroSection';
import { ComponentCard } from '@/components/ComponentCard';
import { mockComponents, componentCategories } from '@/client/features/catalog/data/mock-components';
import { Button } from '@/components/ui/button';
import { ArrowRight, Cpu, Sparkles, Shield, Truck, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Index = () => {
  const featuredComponents = mockComponents.slice(0, 4);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <HeroSection />

      {/* Categories Section */}
      <section className="py-20 relative">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Danh mục <span className="text-gradient-primary">linh kiện</span>
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Đầy đủ các linh kiện từ các thương hiệu hàng đầu thế giới
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {componentCategories.map((category) => (
              <Link 
                key={category.id} 
                to={`/components?category=${category.id}`}
                className="group"
              >
                <div className="glass rounded-xl p-6 text-center hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_30px_hsl(var(--primary)/0.2)]">
                  <div 
                    className="w-16 h-16 rounded-xl mx-auto mb-4 flex items-center justify-center transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `hsl(var(--${category.color}) / 0.2)` }}
                  >
                    <Cpu 
                      className="w-8 h-8" 
                      style={{ color: `hsl(var(--${category.color}))` }}
                    />
                  </div>
                  <h3 className="font-display font-semibold">{category.name}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-20 bg-gradient-to-b from-background to-secondary/20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-12">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold mb-2">
                Sản phẩm <span className="text-gradient-accent">nổi bật</span>
              </h2>
              <p className="text-muted-foreground">
                Những linh kiện được yêu thích nhất
              </p>
            </div>
            <Link to="/components">
              <Button variant="outline" className="gap-2">
                Xem tất cả
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featuredComponents.map((component) => (
              <ComponentCard key={component.id} component={component} />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-6">
            <FeatureItem
              icon={Sparkles}
              title="AI Gợi ý thông minh"
              description="Nhập ngân sách, nhận cấu hình tối ưu"
            />
            <FeatureItem
              icon={Shield}
              title="Bảo hành chính hãng"
              description="Đến 36 tháng cho tất cả linh kiện"
            />
            <FeatureItem
              icon={Truck}
              title="Giao hàng nhanh"
              description="Miễn phí ship toàn quốc"
            />
            <FeatureItem
              icon={MessageCircle}
              title="Hỗ trợ 24/7"
              description="Chat với AI hoặc nhân viên"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-accent/10" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="glass rounded-2xl p-8 md:p-12 text-center max-w-4xl mx-auto border-primary/30">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Chưa biết nên <span className="text-gradient-primary">build gì</span>?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Để AI của chúng tôi gợi ý cấu hình tối ưu dựa trên ngân sách và nhu cầu sử dụng của bạn!
            </p>
            <Link to="/ai-recommend">
              <Button variant="hero" size="xl" className="gap-2">
                <Sparkles className="w-5 h-5" />
                Thử AI Gợi ý ngay
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border/50">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <Cpu className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-display font-bold text-gradient-primary">PC Builder</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2024 PC Builder. Tất cả quyền được bảo lưu.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

function FeatureItem({ 
  icon: Icon, 
  title, 
  description 
}: { 
  icon: React.ElementType; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex items-start gap-4 p-4">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="w-6 h-6 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold mb-1">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

export default Index;
