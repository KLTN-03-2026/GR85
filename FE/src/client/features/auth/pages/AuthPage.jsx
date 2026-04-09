import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  KeyRound,
  Lock,
  Loader2,
  Mail,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { authApi } from "../data/auth.api";

const adminBenefits = [
  "Quản lý user, role và permission tập trung",
  "Theo dõi doanh thu, đơn hàng và sản phẩm bán chạy",
  "Điều phối kho, thanh toán, chat và AI build",
];

const modeConfig = {
  login: {
    badge: "Đăng nhập hệ thống",
    title: "Đăng nhập vào trang quản trị",
    description:
      "Truy cập dashboard để quản lý user, đơn hàng, kho hàng, thanh toán, chat và AI build.",
    submit: "Đăng nhập",
    submitIcon: Lock,
    helper:
      "Dùng email đã được xác minh để đăng nhập. Nếu quên mật khẩu, bạn có thể đặt lại qua Gmail.",
    switchLabel: "Chưa có tài khoản?",
    switchAction: "Đăng ký ngay",
    switchHref: "/register",
    extraLink: {
      label: "Quên mật khẩu?",
      href: "/forgot-password",
    },
  },
  register: {
    badge: "Tạo tài khoản mới",
    title: "Đăng ký tài khoản quản trị hoặc nhân viên",
    description:
      "Tạo tài khoản để quản lý sản phẩm, đơn hàng, khách hàng và toàn bộ vận hành của PC Perfect.",
    submit: "Gửi mã xác minh",
    submitIcon: MailCheck,
    helper:
      "Sau khi đăng ký, hệ thống sẽ gửi mã OTP vào Gmail để xác minh email trước khi bạn đăng nhập.",
    switchLabel: "Đã có tài khoản?",
    switchAction: "Đăng nhập",
    switchHref: "/login",
  },
  forgot: {
    badge: "Khôi phục mật khẩu",
    title: "Nhận mã đặt lại mật khẩu qua Gmail",
    description:
      "Nhập email đã đăng ký để hệ thống gửi mã OTP đặt lại mật khẩu.",
    submit: "Gửi mã đặt lại",
    submitIcon: RefreshCw,
    helper:
      "Mã sẽ được gửi tới Gmail và hết hạn sau vài phút. Bạn sẽ dùng mã đó ở bước đặt lại mật khẩu.",
    switchLabel: "Nhớ ra mật khẩu rồi?",
    switchAction: "Quay lại đăng nhập",
    switchHref: "/login",
  },
  verify: {
    badge: "Xác minh email",
    title: "Nhập mã OTP vừa gửi vào Gmail",
    description:
      "Kiểm tra hộp thư Gmail, lấy mã 6 chữ số và hoàn tất xác minh email.",
    submit: "Xác minh tài khoản",
    submitIcon: ShieldCheck,
    helper:
      "Nếu chưa thấy email, kiểm tra thư rác hoặc yêu cầu gửi lại mã xác minh.",
    switchLabel: "Muốn dùng email khác?",
    switchAction: "Đăng ký lại",
    switchHref: "/register",
  },
  reset: {
    badge: "Đặt lại mật khẩu",
    title: "Nhập mã OTP và mật khẩu mới",
    description:
      "Dùng mã OTP đã gửi qua Gmail để tạo mật khẩu mới cho tài khoản.",
    submit: "Đổi mật khẩu",
    submitIcon: KeyRound,
    helper:
      "Mật khẩu mới cần được nhập hai lần để tránh sai sót khi khôi phục tài khoản.",
    switchLabel: "Quay lại đăng nhập",
    switchAction: "Đăng nhập",
    switchHref: "/login",
  },
};

export default function AuthPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { setSession } = useAuth();
  const mode = resolveMode(location.pathname);
  const queryEmail = searchParams.get("email") ?? "";

  const [form, setForm] = useState({
    fullName: "",
    email: queryEmail,
    password: "",
    confirmPassword: "",
    otp: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setForm({
      fullName: "",
      email: queryEmail,
      password: "",
      confirmPassword: "",
      otp: "",
    });
  }, [mode, queryEmail]);

  const pageCopy = useMemo(() => modeConfig[mode], [mode]);
  const SubmitIcon = pageCopy.submitIcon;

  const handleChange = (field) => (valueOrEvent) => {
    const value = valueOrEvent?.target
      ? valueOrEvent.target.value
      : valueOrEvent;

    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (mode === "register" && form.password !== form.confirmPassword) {
      toast({
        title: "Mật khẩu chưa khớp",
        description: "Bạn kiểm tra lại phần xác nhận mật khẩu giúp mình nhé.",
        variant: "destructive",
      });
      return;
    }

    if (mode === "reset" && form.password !== form.confirmPassword) {
      toast({
        title: "Mật khẩu chưa khớp",
        description: "Mật khẩu mới và xác nhận mật khẩu phải giống nhau.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      switch (mode) {
        case "register": {
          const result = await authApi.register({
            fullName: form.fullName,
            email: form.email,
            password: form.password,
          });

          toast({
            title: "Đã gửi mã xác minh",
            description: "Kiểm tra Gmail để lấy mã OTP và xác minh tài khoản.",
          });

          navigate(`/verify-email?email=${encodeURIComponent(result.email)}`);
          break;
        }
        case "forgot": {
          const result = await authApi.forgotPassword({
            email: form.email,
          });

          toast({
            title: "Đã gửi mã đặt lại mật khẩu",
            description: "Kiểm tra Gmail để lấy mã OTP mới.",
          });

          navigate(`/reset-password?email=${encodeURIComponent(result.email)}`);
          break;
        }
        case "verify": {
          const result = await authApi.verifyEmail({
            email: form.email,
            otp: form.otp,
          });

          setSession(result);
          toast({
            title: "Xác minh thành công",
            description: "Tài khoản của bạn đã sẵn sàng sử dụng.",
          });
          navigate(resolvePostLoginPath(result?.user?.role));
          break;
        }
        case "reset": {
          await authApi.resetPassword({
            email: form.email,
            otp: form.otp,
            password: form.password,
          });

          toast({
            title: "Đã đổi mật khẩu",
            description: "Bạn có thể đăng nhập lại bằng mật khẩu mới.",
          });
          navigate("/login");
          break;
        }
        default: {
          const result = await authApi.login({
            email: form.email,
            password: form.password,
          });

          setSession(result);
          toast({
            title: "Đăng nhập thành công",
            description: `Xin chào ${result.user.fullName ?? result.user.email}`,
          });
          navigate(resolvePostLoginPath(result?.user?.role));
        }
      }
    } catch (error) {
      toast({
        title: "Không thể xử lý yêu cầu",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResend = async () => {
    try {
      await authApi.resendVerification({ email: form.email });
      toast({
        title: "Đã gửi lại mã",
        description: "Kiểm tra Gmail để lấy OTP mới.",
      });
    } catch (error) {
      toast({
        title: "Không thể gửi lại mã",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    }
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
              {mode === "forgot" ? (
                <KeyRound className="h-4 w-4" />
              ) : mode === "verify" ? (
                <MailCheck className="h-4 w-4" />
              ) : (
                <ShieldCheck className="h-4 w-4" />
              )}
              {pageCopy.badge}
            </div>

            <div className="space-y-4">
              <h1 className="text-5xl font-bold leading-tight">
                {pageCopy.title}
              </h1>
              <p className="max-w-xl text-lg text-slate-600">
                {pageCopy.description}
              </p>
            </div>

            <div className="grid gap-4">
              {getBenefits(mode).map((item) => (
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
            <StatCard label="OTP" value="Gmail" />
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
              {(mode === "login" || mode === "register" || mode === "forgot" || mode === "verify" || mode === "reset") && (
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
              )}

              {mode === "register" && (
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

              {(mode === "login" || mode === "register") && (
                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      className="h-12 pl-10"
                      placeholder={
                        mode === "register" ? "Tạo mật khẩu" : "Nhập mật khẩu"
                      }
                      value={form.password}
                      onChange={handleChange("password")}
                    />
                  </div>
                </div>
              )}

              {mode === "register" && (
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

              {(mode === "verify" || mode === "reset") && (
                <div className="space-y-3">
                  <Label htmlFor="otp">Mã OTP</Label>
                  <InputOTP
                    maxLength={6}
                    value={form.otp}
                    onChange={handleChange("otp")}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
              )}

              {mode === "reset" && (
                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu mới</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type="password"
                      className="h-12 pl-10"
                      placeholder="Nhập mật khẩu mới"
                      value={form.password}
                      onChange={handleChange("password")}
                    />
                  </div>
                </div>
              )}

              {mode === "reset" && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      className="h-12 pl-10"
                      placeholder="Nhập lại mật khẩu mới"
                      value={form.confirmPassword}
                      onChange={handleChange("confirmPassword")}
                    />
                  </div>
                </div>
              )}

              <div className="rounded-3xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-900">
                {pageCopy.helper}
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SubmitIcon className="h-4 w-4" />
                )}
                {pageCopy.submit}
              </Button>

              {(mode === "verify" || mode === "reset") && (
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm text-muted-foreground">
                    Mã OTP đã được gửi tới Gmail của bạn.
                  </p>
                  {mode === "verify" ? (
                    <Button type="button" variant="outline" onClick={handleResend}>
                      Gửi lại mã
                    </Button>
                  ) : (
                    <Link
                      to={`/forgot-password?email=${encodeURIComponent(form.email)}`}
                      className="text-sm font-semibold text-primary hover:underline"
                    >
                      Gửi lại mã
                    </Link>
                  )}
                </div>
              )}
            </form>

            <div className="mt-6 flex flex-col gap-3 border-t border-border/70 pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>
                {pageCopy.switchLabel} {" "}
                <Link
                  to={pageCopy.switchHref}
                  className="font-semibold text-primary hover:underline"
                >
                  {pageCopy.switchAction}
                </Link>
              </p>
              {pageCopy.extraLink ? (
                <Link
                  to={pageCopy.extraLink.href}
                  className="font-semibold text-slate-700 hover:text-primary"
                >
                  {pageCopy.extraLink.label}
                </Link>
              ) : (
                <Link
                  to={pageCopy.switchHref}
                  className="font-semibold text-slate-700 hover:text-primary"
                >
                  {mode === "verify"
                    ? "Quay lại đăng nhập"
                    : "Vào dashboard sau khi xác minh"}
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function resolvePostLoginPath(role) {
  return isAdminRole(role) ? "/admin" : "/";
}

function isAdminRole(role) {
  return String(role ?? "")
    .trim()
    .toLowerCase()
    .includes("admin");
}

function resolveMode(pathname) {
  if (pathname === "/register") {
    return "register";
  }

  if (pathname === "/forgot-password") {
    return "forgot";
  }

  if (pathname === "/verify-email") {
    return "verify";
  }

  if (pathname === "/reset-password") {
    return "reset";
  }

  return "login";
}

function getBenefits(mode) {
  if (mode === "forgot") {
    return [
      "Nhận mã khôi phục qua Gmail chỉ trong vài giây",
      "Mã OTP có thời hạn ngắn để giữ an toàn tài khoản",
      "Đặt lại mật khẩu mà không cần liên hệ hỗ trợ",
    ];
  }

  if (mode === "verify") {
    return [
      "Mã xác minh được gửi trực tiếp tới Gmail đã đăng ký",
      "Email chưa xác minh sẽ không thể đăng nhập",
      "Có thể gửi lại mã khi hộp thư đến bị chậm",
    ];
  }

  if (mode === "reset") {
    return [
      "Dùng OTP để xác nhận quyền sở hữu email",
      "Tạo mật khẩu mới ngay trong vài bước",
      "Mật khẩu cũ sẽ được thay thế ngay sau khi xác minh",
    ];
  }

  if (mode === "register") {
    return [
      "Tạo tài khoản mới và nhận mã xác minh qua Gmail",
      "Khóa trạng thái tài khoản cho tới khi xác minh email",
      "Giữ nguyên luồng admin và role-based access của dự án",
    ];
  }

  return adminBenefits;
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-3xl border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}
