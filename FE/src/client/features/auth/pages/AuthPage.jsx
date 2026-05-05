import { useEffect, useMemo, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Loader2,
  Mail,
  MailCheck,
  RefreshCw,
  ShieldCheck,
  Sparkles,
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

const modeConfig = {
  login: {
    badge: "Đăng nhập hệ thống",
    title: "Đăng nhập vào TechBuiltAI",
    description: "Tiếp tục mua sắm và theo dõi đơn hàng.",
    submit: "Đăng nhập",
    submitIcon: Lock,
    helper: "Dùng email đã xác minh.",
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
    title: "Đăng ký tài khoản TechBuiltAI",
    description: "Nhập email và mật khẩu, xác minh Gmail trước rồi bổ sung hồ sơ sau.",
    submit: "Gửi mã xác minh",
    submitIcon: MailCheck,
    helper: "Email sẽ chứa cả mã OTP và link kích hoạt nhanh. Mật khẩu tối thiểu 8 ký tự.",
    switchLabel: "Đã có tài khoản?",
    switchAction: "Đăng nhập",
    switchHref: "/login",
  },
  forgot: {
    badge: "Khôi phục mật khẩu",
    title: "Nhận mã đặt lại mật khẩu qua Gmail",
    description: "Nhập email để nhận mã OTP.",
    submit: "Gửi mã đặt lại",
    submitIcon: RefreshCw,
    helper: "Mã có hiệu lực trong thời gian ngắn.",
    switchLabel: "Nhớ ra mật khẩu rồi?",
    switchAction: "Quay lại đăng nhập",
    switchHref: "/login",
  },
  verify: {
    badge: "Xác minh email",
    title: "Nhập mã OTP vừa gửi vào Gmail",
    description: "Nhập mã 6 số hoặc bấm link trong email để kích hoạt tự động.",
    submit: "Xác minh tài khoản",
    submitIcon: ShieldCheck,
    helper: "Nếu chưa nhận được, hãy gửi lại mã.",
    switchLabel: "Muốn dùng email khác?",
    switchAction: "Đăng ký lại",
    switchHref: "/register",
  },
  reset: {
    badge: "Đặt lại mật khẩu",
    title: "Nhập mã OTP và mật khẩu mới",
    description: "Tạo mật khẩu mới bằng mã OTP.",
    submit: "Đổi mật khẩu",
    submitIcon: KeyRound,
    helper: "Nhập lại mật khẩu để xác nhận.",
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
  const queryOtp = searchParams.get("otp") ?? "";
  const autoVerify = searchParams.get("auto") === "1";

  const [form, setForm] = useState({
    email: queryEmail,
    password: "",
    confirmPassword: "",
    otp: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingResetOtp, setIsVerifyingResetOtp] = useState(false);
  const [isResetOtpVerified, setIsResetOtpVerified] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    password: false,
    confirmPassword: false,
    resetPassword: false,
    resetConfirmPassword: false,
  });
                      placeholder={
                        mode === "register" ? "Tạo mật khẩu" : "Nhập mật khẩu"
                      }
                      value={form.password}
                      onChange={handleChange("password")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:bg-transparent hover:text-foreground"
                      onClick={() => togglePasswordVisibility("password")}
                      aria-label={
                        showPasswords.password
                          ? "Ẩn mật khẩu"
                          : "Hiện mật khẩu"
                      }
                    >
                      {showPasswords.password ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
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
                      type={showPasswords.confirmPassword ? "text" : "password"}
                      minLength={8}
                      className="h-11 pl-10 pr-11"
                      placeholder="Nhập lại mật khẩu"
                      value={form.confirmPassword}
                      onChange={handleChange("confirmPassword")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:bg-transparent hover:text-foreground"
                      onClick={() => togglePasswordVisibility("confirmPassword")}
                      aria-label={
                        showPasswords.confirmPassword
                          ? "Ẩn mật khẩu xác nhận"
                          : "Hiện mật khẩu xác nhận"
                      }
                    >
                      {showPasswords.confirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  {registerPasswordMatchMessage ? (
                    <p
                      className={`text-xs font-medium ${
                        form.password === form.confirmPassword
                          ? "text-emerald-600"
                          : "text-red-600"
                      }`}
                    >
                      {registerPasswordMatchMessage}
                    </p>
                  ) : null}
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
                  {mode === "reset" ? (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleVerifyResetOtp}
                      disabled={
                        isVerifyingResetOtp ||
                        !form.email ||
                        !/^\d{6}$/.test(String(form.otp ?? ""))
                      }
                    >
                      {isVerifyingResetOtp ? "Đang kiểm tra OTP..." : "Xác minh mã OTP"}
                    </Button>
                  ) : null}
                </div>
              )}

              {mode === "reset" && isResetOtpVerified && (
                <div className="space-y-2">
                  <Label htmlFor="password">Mật khẩu mới</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="password"
                      type={showPasswords.resetPassword ? "text" : "password"}
                      minLength={8}
                      className="h-11 pl-10 pr-11"
                      placeholder="Nhập mật khẩu mới"
                      value={form.password}
                      onChange={handleChange("password")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:bg-transparent hover:text-foreground"
                      onClick={() => togglePasswordVisibility("resetPassword")}
                      aria-label={
                        showPasswords.resetPassword
                          ? "Ẩn mật khẩu mới"
                          : "Hiện mật khẩu mới"
                      }
                    >
                      {showPasswords.resetPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {mode === "reset" && isResetOtpVerified && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Xác nhận mật khẩu mới</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirmPassword"
                      type={
                        showPasswords.resetConfirmPassword ? "text" : "password"
                      }
                      minLength={8}
                      className="h-11 pl-10 pr-11"
                      placeholder="Nhập lại mật khẩu mới"
                      value={form.confirmPassword}
                      onChange={handleChange("confirmPassword")}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 text-muted-foreground hover:bg-transparent hover:text-foreground"
                      onClick={() =>
                        togglePasswordVisibility("resetConfirmPassword")
                      }
                      aria-label={
                        showPasswords.resetConfirmPassword
                          ? "Ẩn mật khẩu xác nhận mới"
                          : "Hiện mật khẩu xác nhận mới"
                      }
                    >
                      {showPasswords.resetConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <div className="auth-helper rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-2 text-xs text-emerald-900">
                {mode === "reset" && !isResetOtpVerified
                  ? "Nhập OTP rồi bấm Xác minh mã OTP. Chỉ mã đúng mới mở 2 ô mật khẩu mới."
                  : pageCopy.helper}
              </div>

              <Button
                type="submit"
                variant="hero"
                size="lg"
                className="w-full gap-2"
                disabled={
                  isSubmitting || (mode === "reset" && !isResetOtpVerified)
                }
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
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResend}
                    >
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

            <div className="auth-footer mt-3 flex flex-col gap-2 border-t border-border/70 pt-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
              <p>
                {pageCopy.switchLabel}{" "}
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
                    : "Vào trang chủ sau khi xác minh"}
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
  const normalizedRole = String(role ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");

  return (
    normalizedRole.includes("admin") || normalizedRole.includes("quan tri")
  );
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

function InteractivePcViewer() {
  const [rotation, setRotation] = useState({ x: -8, y: 18 });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const dragRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: -8, y: 18 });
  const frameRef = useRef(0);
  const componentImage = "/images/component-placeholder.svg";

  useEffect(() => {
    function tick() {
      setRotation((prev) => {
        const tx = targetRef.current.x;
        const ty = targetRef.current.y;
        return {
          x: prev.x + (tx - prev.x) * 0.12,
          y: prev.y + (ty - prev.y) * 0.12,
        };
      });

      frameRef.current = window.requestAnimationFrame(tick);
    }

    frameRef.current = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(frameRef.current);
    };
  }, []);

  useEffect(() => {
    if (isDragging || isHovering) {
      return;
    }

    const timer = window.setInterval(() => {
      targetRef.current = {
        x: -8 + Math.sin(Date.now() / 900) * 3,
        y: targetRef.current.y + 0.7,
      };
    }, 40);

    return () => {
      window.clearInterval(timer);
    };
  }, [isDragging, isHovering]);

  const handlePointerDown = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    setIsDragging(true);
    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
    };
  };

  const handlePointerMove = (event) => {
    if (!isDragging) {
      return;
    }

    const dx = event.clientX - dragRef.current.x;
    const dy = event.clientY - dragRef.current.y;

    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
    };

    const nextY = targetRef.current.y + dx * 0.35;
    const nextX = Math.max(-25, Math.min(20, targetRef.current.x - dy * 0.25));
    targetRef.current = { x: nextX, y: nextY };
  };

  const stopDrag = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (event) => {
    if (isDragging) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const px = (event.clientX - bounds.left) / bounds.width;
    const py = (event.clientY - bounds.top) / bounds.height;

    targetRef.current = {
      x: -12 + (0.5 - py) * 12,
      y: 16 + (px - 0.5) * 32,
    };
  };

  const resetHoverPose = () => {
    if (isDragging) {
      return;
    }

    targetRef.current = { x: -8, y: 18 };
  };

  return (
    <div
      className="relative w-full max-w-[560px] rounded-[28px] border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur"
      onPointerMove={handlePointerMove}
      onPointerUp={stopDrag}
      onPointerLeave={stopDrag}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        resetHoverPose();
      }}
      onMouseMove={handleMouseMove}
    >
      <div className="pointer-events-none absolute inset-0 rounded-[28px] bg-[radial-gradient(circle_at_15%_20%,_rgba(52,211,153,0.22),_transparent_40%),radial-gradient(circle_at_85%_80%,_rgba(56,189,248,0.20),_transparent_42%)]" />

      <div className="relative mb-3 flex items-center justify-center gap-2 text-xs font-medium text-slate-700/80">
        <Sparkles className="h-4 w-4 text-primary" />
        Kéo để xoay mô hình 3D
      </div>

      <div className="relative mx-auto h-[320px] w-full select-none [perspective:1400px]">
        <div className="pointer-events-none absolute left-1/2 top-[78%] h-16 w-[340px] -translate-x-1/2 rounded-[100%] bg-slate-950/40 blur-xl" />

        <div
          className={`absolute left-1/2 top-[50%] h-[255px] w-[420px] -translate-x-1/2 -translate-y-1/2 ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
          style={{
            transform: `translate(-50%, -50%) rotateX(${rotation.x}deg) rotateY(${rotation.y}deg)`,
            transformStyle: "preserve-3d",
          }}
          onPointerDown={handlePointerDown}
          onPointerCancel={stopDrag}
        >
          <div
            className="auth-rgb absolute left-4 right-4 top-5 h-[190px] overflow-hidden rounded-[22px] border border-emerald-200/65 bg-slate-900/95 shadow-[0_28px_55px_rgba(15,23,42,0.5)]"
            style={{
              transform: "translateZ(40px)",
              transformStyle: "preserve-3d",
            }}
          >
            <img
              src={componentImage}
              alt="Linh kiện PC"
              draggable={false}
              className="h-full w-full object-cover object-center opacity-90"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-emerald-400/12" />
            <div className="auth-scan absolute inset-x-6 bottom-5 h-1 rounded bg-gradient-to-r from-emerald-400/0 via-emerald-300/95 to-sky-300/0" />
            <div className="absolute left-6 top-5 h-3 w-20 rounded-full bg-emerald-400/70" />
            <div className="absolute right-6 top-5 h-3 w-3 rounded-full bg-sky-400/80" />
          </div>

          <div
            className="absolute right-4 top-5 h-[190px] w-9 rounded-r-[14px] border border-sky-200/30 bg-slate-800/90"
            style={{
              transform: "rotateY(90deg) translateZ(13px)",
              transformOrigin: "right center",
            }}
          />
          <div
            className="absolute left-4 top-5 h-[190px] w-9 rounded-l-[14px] border border-emerald-200/30 bg-slate-800/90"
            style={{
              transform: "rotateY(-90deg) translateZ(13px)",
              transformOrigin: "left center",
            }}
          />

          <div
            className="absolute left-[52px] right-[52px] top-[214px] h-[28px] rounded-[12px] border border-emerald-200/35 bg-slate-800/95"
            style={{ transform: "translateZ(22px)" }}
          />
          <div
            className="absolute left-[124px] right-[124px] top-[242px] h-[12px] rounded-full bg-slate-950/90"
            style={{ transform: "translateZ(10px)" }}
          />

          <div
            className="auth-orbit pointer-events-none absolute left-6 top-0 h-6 w-6 rounded-full border border-emerald-300/70 bg-emerald-200/35"
            style={{ transform: "translateZ(72px)" }}
          />
          <div
            className="auth-orbit pointer-events-none absolute right-10 top-[212px] h-5 w-5 rounded-full border border-sky-300/70 bg-sky-200/35"
            style={{ animationDelay: "1.1s", transform: "translateZ(66px)" }}
          />
        </div>

        <div className="pointer-events-none absolute left-8 top-8 h-16 w-16 rounded-full border border-emerald-200/50 bg-emerald-300/10 auth-orbit" />
        <div
          className="pointer-events-none absolute right-10 bottom-10 h-20 w-20 rounded-full border border-sky-200/50 bg-sky-300/10 auth-orbit"
          style={{ animationDelay: "1.3s" }}
        />
      </div>
    </div>
  );
}
