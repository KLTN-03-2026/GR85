import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Lock,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

const adminBenefits = [
  "Quản lý user, role và permission tập trung",
  "Theo dõi doanh thu, đơn hàng và sản phẩm bán chạy",
  "Điều phối kho, thanh toán, chat và AI build",
];

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isRegister = location.pathname === "/register";

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const pageCopy = useMemo(
    () =>
      isRegister
        ? {
            badge: "Tạo tài khoản mới",
            title: "Đăng ký tài khoản quản trị hoặc nhân viên",
            description:
              "Tạo tài khoản để quản lý sản phẩm, đơn hàng, khách hàng và toàn bộ vận hành của PC Perfect.",
            submit: "Đăng ký",
            switchLabel: "Đã có tài khoản?",
            switchAction: "Đăng nhập",
            switchHref: "/login",
          }
        : {
            badge: "Đăng nhập hệ thống",
            title: "Đăng nhập vào trang quản trị",
            description:
              "Truy cập dashboard để quản lý user, đơn hàng, kho hàng, thanh toán, chat và AI build.",
            submit: "Đăng nhập",
            switchLabel: "Chưa có tài khoản?",
            switchAction: "Đăng ký ngay",
            switchHref: "/register",
          },
    [isRegister],
  );

  const handleChange = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (isRegister && form.password !== form.confirmPassword) {
      toast({
        title: "Mật khẩu chưa khớp",
        description: "Bạn kiểm tra lại phần xác nhận mật khẩu giúp mình nhé.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: isRegister
        ? "Đăng ký demo thành công"
        : "Đăng nhập demo thành công",
      description:
        "Hiện tại form này đang dùng mock flow. Mình đã chuyển bạn sang trang admin để nối API sau.",
    });

    navigate("/admin");
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,_rgba(16,185,129,0.08)_0%,_rgba(255,255,255,1)_38%,_rgba(14,165,233,0.08)_100%)]">
      <div className="mx-auto grid min-h-screen max-w-7xl lg:grid-cols-[1.15fr_0.85fr]">
        <section className="relative hidden overflow-hidden px-8 py-10 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.22),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(14,165,233,0.18),_transparent_30%)]" />
          <div className="relative z-10">
            <Link
              to="/"
              className="inline-flex items-center gap-3 rounded-full bg-white/80 px-4 py-2 shadow-sm backdrop-blur"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl gradient-primary shadow-[0_10px_30px_hsl(var(--primary)/0.32)]">
                <Cpu className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-sm text-muted-foreground">PC Perfect</div>
                <div className="font-semibold">Admin Access Portal</div>
              </div>
            </Link>
          </div>

          <div className="relative z-10 max-w-2xl space-y-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white/70 px-4 py-2 text-sm font-medium text-primary backdrop-blur">
              <ShieldCheck className="h-4 w-4" />
              {pageCopy.badge}
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl font-bold leading-tight">
                Trung tâm quản trị bán PC dành cho đội vận hành hiện đại
              </h1>
              <p className="max-w-xl text-lg text-slate-600">
                Form này được làm để khớp với luồng admin dashboard mới, giúp
                bạn nối authentication, role-based access và Prisma sau đó rất
                gọn.
              </p>
            </div>

            <div className="grid gap-4">
              {adminBenefits.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-3xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur"
                >
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-primary" />
                  <span className="text-sm text-slate-700">{item}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-3 gap-4">
            <StatCard label="Roles" value="3" />
            <StatCard label="Modules" value="13" />
            <StatCard label="Ready for Prisma" value="100%" />
          </div>
        </section>

        <section className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-10">
          <div className="w-full max-w-xl rounded-[32px] border border-border/60 bg-white/90 p-6 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8">
            <Link
              to="/"
              className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Về trang chủ
            </Link>

            <div className="mb-8 space-y-3">
              <span className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
                {pageCopy.badge}
              </span>
              <h2 className="text-3xl font-bold leading-tight">
                {pageCopy.title}
              </h2>
              <p className="text-muted-foreground">{pageCopy.description}</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {isRegister && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Họ và tên</Label>
                  <div className="relative">
                    <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="fullName"
                      className="h-12 pl-10"
                      placeholder="Nguyễn Văn A"
                      value={form.fullName}
                      onChange={handleChange("fullName")}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="h-12 pl-10"
                    placeholder="admin@pcperfect.vn"
                    value={form.email}
                    onChange={handleChange("email")}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Mật khẩu</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    className="h-12 pl-10"
                    placeholder="Nhập mật khẩu"
                    value={form.password}
                    onChange={handleChange("password")}
                  />
                </div>
              </div>

              {isRegister && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Xác nhận mật khẩu</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      className="h-12 pl-10"
                      placeholder="Nhập lại mật khẩu"
                      value={form.confirmPassword}
                      onChange={handleChange("confirmPassword")}
                    />
                  </div>
                </div>
              )}

              <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
                Luồng hiện tại là mock frontend để bạn ráp backend sau. Khi
                submit thành công sẽ vào luôn trang admin để test UI.
              </div>

              <Button type="submit" variant="hero" size="lg" className="w-full">
                {pageCopy.submit}
              </Button>
            </form>

            <div className="mt-6 flex flex-col gap-3 border-t border-border/70 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>
                {pageCopy.switchLabel}{" "}
                <Link
                  to={pageCopy.switchHref}
                  className="font-semibold text-primary hover:underline"
                >
                  {pageCopy.switchAction}
                </Link>
              </p>
              <Link
                to="/admin"
                className="font-semibold text-slate-700 hover:text-primary"
              >
                Vào thử dashboard demo
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
