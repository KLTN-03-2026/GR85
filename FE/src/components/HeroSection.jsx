import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Cpu, Sparkles, ShoppingBag } from "lucide-react";
import heroImage from "@/assets/hero-pc.jpg";

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroImage}
          alt="Gaming PC"
          className="w-full h-full object-cover opacity-40"
        />

        <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--primary)/0.15)_0%,_transparent_70%)]" />
      </div>

      {/* Grid Pattern */}
      <div
        className="absolute inset-0 opacity-20"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Badge */}
          <div
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-primary/30"
            data-aos="fade-down"
            data-aos-delay="40"
          >
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">
              Được hỗ trợ bởi AI thông minh
            </span>
          </div>

          {/* Heading */}
          <h1
            className="font-display text-4xl sm:text-5xl md:text-7xl font-bold leading-tight"
            data-aos="fade-up"
            data-aos-delay="110"
          >
            Lắp PC <span className="text-gradient-primary">hoàn hảo</span>
            <br />
            cho riêng bạn
          </h1>

          {/* Description */}
          <p
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto"
            data-aos="fade-up"
            data-aos-delay="180"
          >
            Tự build từng linh kiện yêu thích hoặc để AI gợi ý cấu hình tối ưu
            theo ngân sách và nhu cầu sử dụng của bạn.
          </p>

          {/* CTA Buttons */}
          <div
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
            data-aos="fade-up"
            data-aos-delay="240"
          >
            <Link to="/builder">
              <Button variant="hero" size="xl" className="gap-2">
                <Cpu className="w-5 h-5" />
                Bắt đầu lắp PC
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/ai-recommend">
              <Button variant="glass" size="xl" className="gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                AI Gợi ý cấu hình
              </Button>
            </Link>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-12 pt-8 border-t border-border/50">
            <FeatureCard
              icon={Cpu}
              delay={0}
              title="Build thủ công"
              description="Tự chọn từng linh kiện theo ý thích"
            />

            <FeatureCard
              icon={Sparkles}
              delay={90}
              title="AI thông minh"
              description="Gợi ý cấu hình tối ưu theo ngân sách"
            />

            <FeatureCard
              icon={ShoppingBag}
              delay={180}
              title="Mua sắm dễ dàng"
              description="Đặt hàng ngay với giá tốt nhất"
            />
          </div>
        </div>
      </div>

      {/* Floating Elements */}
      <div
        className="absolute top-1/4 left-10 w-20 h-20 rounded-full bg-primary/20 blur-3xl animate-pulse-glow"
        data-aos="zoom-in"
        data-aos-delay="260"
      />
      <div
        className="absolute bottom-1/4 right-10 w-32 h-32 rounded-full bg-accent/20 blur-3xl animate-pulse-glow"
        data-aos="zoom-in"
        data-aos-delay="320"
        style={{ animationDelay: "1s" }}
      />
    </section>
  );
}

function FeatureCard({ icon: Icon, title, description, delay = 0 }) {
  return (
    <div
      className="glass rounded-xl p-6 text-center hover:border-primary/50 transition-all duration-300 group"
      data-aos="fade-up"
      data-aos-delay={delay}
    >
      <div className="w-12 h-12 rounded-lg gradient-primary mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
        <Icon className="w-6 h-6 text-primary-foreground" />
      </div>
      <h3 className="font-display font-semibold text-lg mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
