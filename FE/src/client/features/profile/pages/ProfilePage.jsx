import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import PaymentQRModal from "@/components/PaymentQRModal";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { profileApi } from "@/client/features/profile/data/profile.api";

const profileValidation = {
  fullName: (value) => {
    if (!value?.trim()) return "Tên không được trống";
    if (value.trim().length < 2) return "Tên phải có ít nhất 2 ký tự";
    if (value.trim().length > 100) return "Tên không được quá 100 ký tự";
    if (/\d/.test(value.trim())) return "Tên không được chứa số";
    return "";
  },
  phone: (value) => {
    if (!value?.trim()) return "";
    if (!/^\d{10}$/.test(value.trim())) return "Số điện thoại phải đúng 10 chữ số";
    return "";
  },
  address: (value) => {
    if (!value?.trim()) return "";
    if (value.trim().length < 5) return "Địa chỉ quá ngắn";
    if (value.trim().length > 500) return "Địa chỉ không được quá 500 ký tự";
    return "";
  },
};

const passwordValidation = {
  currentPassword: (value) => {
    if (!value) return "Mật khẩu hiện tại không được trống";
    return "";
  },
  newPassword: (value) => {
    if (!value) return "Mật khẩu mới không được trống";
    if (value.length < 6) return "Mật khẩu phải có ít nhất 6 ký tự";
    if (value.length > 128) return "Mật khẩu không được quá 128 ký tự";
    return "";
  },
  confirmPassword: (value, newPassword) => {
    if (!value) return "Xác nhận mật khẩu không được trống";
    if (value !== newPassword) return "Mật khẩu không khớp";
    return "";
  },
};

export default function ProfilePage() {
  const navigate = useNavigate();
  const { token, isAuthenticated, isHydrated, setSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [showPendingOrders, setShowPendingOrders] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [submittingReturnOrderId, setSubmittingReturnOrderId] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletMessage, setWalletMessage] = useState(null);
  const [walletError, setWalletError] = useState(null);
  const [topUpAmount, setTopUpAmount] = useState("");
  const [showTopUpQRModal, setShowTopUpQRModal] = useState(false);
  const [topUpQRData, setTopUpQRData] = useState(null);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState(null);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });

  // Profile form state
  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    address: "",
  });

  // Password form state
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    loadProfile();
  }, [isHydrated, isAuthenticated, navigate]);

  async function loadProfile() {
    try {
      setLoading(true);
      const data = await profileApi.getProfile();
      setProfileData(data);
      setWalletBalance(Number(data.walletBalance ?? 0));
      setFormData({
        fullName: data.fullName || "",
        phone: data.phone || "",
        address: data.address || "",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Không thể tải thông tin hồ sơ",
      });
    } finally {
      setLoading(false);
    }
  }

  async function loadWallet() {
    try {
      setWalletLoading(true);
      const data = await profileApi.getWallet();
      setWalletBalance(Number(data?.balance ?? 0));
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : "Không thể tải số dư ví");
    } finally {
      setWalletLoading(false);
    }
  }

  function validateProfileForm() {
    const newErrors = {};
    Object.entries(formData).forEach(([key, value]) => {
      const error = profileValidation[key]?.(value);
      if (error) newErrors[key] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function validatePasswordForm() {
    const newErrors = {};
    Object.entries(passwordForm).forEach(([key, value]) => {
      const error = passwordValidation[key]?.(
        value,
        passwordForm.newPassword
      );
      if (error) newErrors[key] = error;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleUpdateProfile(e) {
    e.preventDefault();
    if (!validateProfileForm()) return;

    try {
      setUpdatingProfile(true);
      setMessage(null);
      const updatedUser = await profileApi.updateProfile({
        fullName: formData.fullName.trim(),
        phone: formData.phone?.trim() || undefined,
        address: formData.address?.trim() || undefined,
      });
      setSession({ token, user: updatedUser });
      setProfileData(updatedUser);
      setWalletBalance(Number(updatedUser.walletBalance ?? walletBalance));
      setMessage({
        type: "success",
        text: "Cập nhật thông tin thành công",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Không thể cập nhật thông tin",
      });
    } finally {
      setUpdatingProfile(false);
    }
  }

  async function loadMyOrders() {
    try {
      setOrdersLoading(true);
      const data = await profileApi.getMyOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Không thể tải danh sách đơn hàng",
      });
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }

  const visibleOrders = showPendingOrders
    ? orders
    : orders.filter(
        (order) =>
          !(
            String(order?.paymentStatus ?? "").toUpperCase() === "PENDING" &&
            String(order?.orderStatus ?? "").toUpperCase() === "PENDING"
          ),
      );

  async function loadOrderDetail(orderId) {
    try {
      const data = await profileApi.getMyOrderDetail(orderId);
      setSelectedOrderDetail(data);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Không thể tải chi tiết đơn hàng",
      });
    }
  }

  async function handleRequestReturn(orderId) {
    const reason = window.prompt("Nhập lý do trả hàng (tối thiểu 10 ký tự):", "Sản phẩm bị lỗi hoặc không đúng mô tả");
    if (!reason) {
      return;
    }

    try {
      setSubmittingReturnOrderId(orderId);
      await profileApi.requestReturn({ orderId, reason });
      setMessage({
        type: "success",
        text: `Đã gửi yêu cầu trả hàng cho đơn #${orderId}. Chờ admin duyệt.`,
      });
      await loadMyOrders();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Không thể gửi yêu cầu trả hàng",
      });
    } finally {
      setSubmittingReturnOrderId(null);
    }
  }

  async function handleTopUpWallet(e) {
    e.preventDefault();

    try {
      setWalletError(null);
      setWalletMessage(null);

      const amount = Number(topUpAmount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new Error("Số tiền nạp phải lớn hơn 0");
      }

      const result = await profileApi.topUpWallet({
        amount,
        note: "Nạp tiền từ trang thông tin cá nhân",
      });

      setWalletBalance(Number(result?.balance ?? walletBalance));
      setWalletMessage("Đã tạo mã QR nạp tiền và gửi email xác nhận");
      setTopUpQRData(result);
      setShowTopUpQRModal(true);
      setTopUpAmount("");
      await loadProfile();
    } catch (error) {
      setWalletError(error instanceof Error ? error.message : "Nạp tiền thất bại");
    }
  }

  useEffect(() => {
    if (activeTab !== "orders") {
      return;
    }

    loadMyOrders();
  }, [activeTab]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated) {
      return;
    }

    loadWallet();
  }, [isHydrated, isAuthenticated]);

  async function handleChangePassword(e) {
    e.preventDefault();
    if (!validatePasswordForm()) return;

    try {
      setChangingPassword(true);
      setMessage(null);
      await profileApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword,
      });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setMessage({
        type: "success",
        text: "Đổi mật khẩu thành công",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Không thể đổi mật khẩu",
      });
    } finally {
      setChangingPassword(false);
    }
  }

  if (!isHydrated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center pt-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Quản lý tài khoản</h1>
            <p className="text-muted-foreground">
              Cập nhật thông tin cá nhân của bạn
            </p>
          </div>
        </div>

        {/* Message Alert */}
        {message && (
          <Alert
            className={`mb-6 ${
              message.type === "success"
                ? "border-green-500 bg-green-500/10"
                : "border-red-500 bg-red-500/10"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-600" />
            )}
            <AlertDescription
              className={
                message.type === "success"
                  ? "text-green-600"
                  : "text-red-600"
              }
            >
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-6">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-bold text-primary">
                  {getInitials(profileData?.fullName || "")}
                </div>
                <h2 className="mb-2 text-lg font-semibold">
                  {profileData?.fullName}
                </h2>
                <p className="mb-4 text-sm text-muted-foreground">
                  {profileData?.email}
                </p>
                <Badge className="mb-4" variant="outline">
                  {profileData?.role || "User"}
                </Badge>
                <div className="w-full space-y-2 border-t border-border pt-4">
                  <div className="text-left">
                    <p className="text-xs font-semibold text-muted-foreground">
                      TRẠNG THÁI
                    </p>
                    <Badge className="mt-2">
                      {profileData?.status === "ACTIVE" ? "✓ Đã xác minh" : "○ Chưa xác minh"}
                    </Badge>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-muted-foreground">
                      NGÀY TẠO
                    </p>
                    <p className="mt-2 text-sm">
                      {new Date(profileData?.createdAt).toLocaleDateString(
                        "vi-VN"
                      )}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-muted-foreground">
                      SỐ DƯ VÍ
                    </p>
                    <p className="mt-2 text-sm font-semibold text-sky-700">
                      {formatMoney(profileData?.walletBalance ?? 0)}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Tabs */}
            <div className="mb-6 flex gap-2 border-b border-border">
              <Button
                variant={activeTab === "profile" ? "default" : "ghost"}
                onClick={() => setActiveTab("profile")}
                className="rounded-b-none"
              >
                Thông tin cá nhân
              </Button>
              <Button
                variant={activeTab === "password" ? "default" : "ghost"}
                onClick={() => setActiveTab("password")}
                className="rounded-b-none"
              >
                Đổi mật khẩu
              </Button>
              <Button
                variant={activeTab === "orders" ? "default" : "ghost"}
                onClick={() => setActiveTab("orders")}
                className="rounded-b-none"
              >
                Đơn hàng của tôi
              </Button>
            </div>

            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="space-y-6">
                <Card className="p-6">
                  <form onSubmit={handleUpdateProfile} className="space-y-6">
                  {/* Full Name */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Họ và tên *
                    </label>
                    <Input
                      type="text"
                      placeholder="Nhập họ và tên"
                      value={formData.fullName}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          fullName: e.target.value,
                        });
                        if (errors.fullName) {
                          const error = profileValidation.fullName(
                            e.target.value
                          );
                          setErrors({
                            ...errors,
                            fullName: error,
                          });
                        }
                      }}
                      onBlur={() => {
                        if (!errors.fullName) {
                          const error = profileValidation.fullName(
                            formData.fullName
                          );
                          if (error) {
                            setErrors({ ...errors, fullName: error });
                          }
                        }
                      }}
                      className={errors.fullName ? "border-red-500" : ""}
                    />
                    {errors.fullName && (
                      <p className="mt-2 text-xs text-red-600">
                        {errors.fullName}
                      </p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Số điện thoại
                    </label>
                    <Input
                      type="tel"
                      placeholder="Nhập số điện thoại (không bắt buộc)"
                      value={formData.phone}
                      onChange={(e) => {
                        const nextPhone = e.target.value.replace(/\D/g, "").slice(0, 10);
                        setFormData({
                          ...formData,
                          phone: nextPhone,
                        });
                        if (errors.phone) {
                          const error = profileValidation.phone(nextPhone);
                          setErrors({
                            ...errors,
                            phone: error,
                          });
                        }
                      }}
                      onBlur={() => {
                        if (!errors.phone) {
                          const error = profileValidation.phone(
                            formData.phone
                          );
                          if (error) {
                            setErrors({ ...errors, phone: error });
                          }
                        }
                      }}
                      className={errors.phone ? "border-red-500" : ""}
                    />
                    {errors.phone && (
                      <p className="mt-2 text-xs text-red-600">
                        {errors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Địa chỉ
                    </label>
                    <Input
                      type="text"
                      placeholder="Nhập địa chỉ nhận hàng"
                      value={formData.address}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          address: e.target.value,
                        });
                        if (errors.address) {
                          const error = profileValidation.address(e.target.value);
                          setErrors({
                            ...errors,
                            address: error,
                          });
                        }
                      }}
                      onBlur={() => {
                        if (!errors.address) {
                          const error = profileValidation.address(
                            formData.address,
                          );
                          if (error) {
                            setErrors({ ...errors, address: error });
                          }
                        }
                      }}
                      className={errors.address ? "border-red-500" : ""}
                    />
                    {errors.address && (
                      <p className="mt-2 text-xs text-red-600">
                        {errors.address}
                      </p>
                    )}
                  </div>

                  {/* Email (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Email
                    </label>
                    <Input
                      type="email"
                      value={profileData?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="mt-2 text-xs text-muted-foreground">
                      Không thể thay đổi email. Liên hệ hỗ trợ nếu cần thay đổi.
                    </p>
                  </div>

                  {/* Role (Read-only) */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Vai trò
                    </label>
                    <Input
                      type="text"
                      value={profileData?.role || "User"}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={updatingProfile}
                    className="w-full"
                  >
                    {updatingProfile ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang cập nhật...
                      </>
                    ) : (
                      "Lưu thay đổi"
                    )}
                  </Button>
                  </form>
                </Card>

                <Card className="p-6">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold">Ví thanh toán</h3>
                      <p className="text-sm text-muted-foreground">
                        Nạp tiền và dùng số dư để thanh toán đơn hàng.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">Số dư hiện tại</p>
                      <p className="text-xl font-bold text-sky-700">{formatMoney(walletBalance)}</p>
                    </div>
                  </div>

                  <form className="space-y-3" onSubmit={handleTopUpWallet}>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <Input
                        type="number"
                        min="1000"
                        step="1000"
                        placeholder="Nhập số tiền muốn nạp"
                        value={topUpAmount}
                        onChange={(event) => setTopUpAmount(event.target.value)}
                      />
                      <Button type="submit" disabled={walletLoading}>
                        {walletLoading ? "Đang xử lý..." : "Nạp tiền"}
                      </Button>
                    </div>
                    {walletMessage ? <p className="text-xs text-emerald-600">{walletMessage}</p> : null}
                    {walletError ? <p className="text-xs text-destructive">{walletError}</p> : null}
                  </form>
                </Card>
              </div>
            )}

            {/* Password Tab */}
            {activeTab === "password" && (
              <Card className="p-6">
                <form onSubmit={handleChangePassword} className="space-y-6">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Mật khẩu hiện tại *
                    </label>
                    <div className="relative">
                      <Input
                        type={showPasswords.current ? "text" : "password"}
                        placeholder="Nhập mật khẩu hiện tại"
                        value={passwordForm.currentPassword}
                        onChange={(e) => {
                          setPasswordForm({
                            ...passwordForm,
                            currentPassword: e.target.value,
                          });
                          if (errors.currentPassword) {
                            const error = passwordValidation.currentPassword(
                              e.target.value
                            );
                            setErrors({
                              ...errors,
                              currentPassword: error,
                            });
                          }
                        }}
                        className={errors.currentPassword ? "border-red-500 pr-10" : "pr-10"}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords({
                            ...showPasswords,
                            current: !showPasswords.current,
                          })
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showPasswords.current ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    {errors.currentPassword && (
                      <p className="mt-2 text-xs text-red-600">
                        {errors.currentPassword}
                      </p>
                    )}
                  </div>

                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Mật khẩu mới *
                    </label>
                    <div className="relative">
                      <Input
                        type={showPasswords.new ? "text" : "password"}
                        placeholder="Nhập mật khẩu mới (tối thiểu 6 ký tự)"
                        value={passwordForm.newPassword}
                        onChange={(e) => {
                          setPasswordForm({
                            ...passwordForm,
                            newPassword: e.target.value,
                          });
                          if (
                            errors.newPassword ||
                            errors.confirmPassword
                          ) {
                            const newError = passwordValidation.newPassword(
                              e.target.value
                            );
                            const confirmError =
                              passwordValidation.confirmPassword(
                                passwordForm.confirmPassword,
                                e.target.value
                              );
                            setErrors({
                              ...errors,
                              newPassword: newError,
                              confirmPassword: confirmError,
                            });
                          }
                        }}
                        className={errors.newPassword ? "border-red-500 pr-10" : "pr-10"}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords({
                            ...showPasswords,
                            new: !showPasswords.new,
                          })
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showPasswords.new ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    {errors.newPassword && (
                      <p className="mt-2 text-xs text-red-600">
                        {errors.newPassword}
                      </p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label className="block text-sm font-medium mb-2">
                      Xác nhận mật khẩu *
                    </label>
                    <div className="relative">
                      <Input
                        type={showPasswords.confirm ? "text" : "password"}
                        placeholder="Nhập lại mật khẩu mới"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => {
                          setPasswordForm({
                            ...passwordForm,
                            confirmPassword: e.target.value,
                          });
                          if (errors.confirmPassword) {
                            const error = passwordValidation.confirmPassword(
                              e.target.value,
                              passwordForm.newPassword
                            );
                            setErrors({
                              ...errors,
                              confirmPassword: error,
                            });
                          }
                        }}
                        className={errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowPasswords({
                            ...showPasswords,
                            confirm: !showPasswords.confirm,
                          })
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                      >
                        {showPasswords.confirm ? (
                          <EyeOff className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Eye className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="mt-2 text-xs text-red-600">
                        {errors.confirmPassword}
                      </p>
                    )}
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={changingPassword}
                    className="w-full"
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Đang cập nhật...
                      </>
                    ) : (
                      "Đổi mật khẩu"
                    )}
                  </Button>
                </form>
              </Card>
            )}

            {activeTab === "orders" && (
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Danh sách đơn hàng</h3>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={showPendingOrders}
                          onChange={(event) => setShowPendingOrders(event.target.checked)}
                        />
                        Hiển thị đơn chờ thanh toán
                      </label>
                      <Button variant="outline" onClick={loadMyOrders}>
                        Tải lại
                      </Button>
                    </div>
                  </div>

                  {ordersLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải đơn hàng...
                    </div>
                  ) : visibleOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Bạn chưa có đơn hàng nào phù hợp bộ lọc hiện tại.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-border/70 text-muted-foreground">
                            <th className="px-3 py-3 font-medium">Mã đơn</th>
                            <th className="px-3 py-3 font-medium">Ngày tạo</th>
                            <th className="px-3 py-3 font-medium">Tổng tiền</th>
                            <th className="px-3 py-3 font-medium">Thanh toán</th>
                            <th className="px-3 py-3 font-medium">Trạng thái</th>
                            <th className="px-3 py-3 font-medium">Theo dõi</th>
                            <th className="px-3 py-3 font-medium">Trả hàng</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visibleOrders.map((order) => (
                            <tr key={order.id} className="border-b border-border/40">
                              <td className="px-3 py-3">#{order.id}</td>
                              <td className="px-3 py-3">{formatDate(order.createdAt)}</td>
                              <td className="px-3 py-3">{formatMoney(order.totalAmount)}</td>
                              <td className="px-3 py-3">{formatEnum(order.paymentStatus)}</td>
                              <td className="px-3 py-3">
                                <Badge variant="outline">{formatEnum(order.orderStatus)}</Badge>
                              </td>
                              <td className="px-3 py-3">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => loadOrderDetail(order.id)}
                                >
                                  Xem chi tiết
                                </Button>
                              </td>
                              <td className="px-3 py-3">
                                {canRequestReturn(order) ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={submittingReturnOrderId === order.id}
                                    onClick={() => handleRequestReturn(order.id)}
                                  >
                                    {submittingReturnOrderId === order.id ? "Đang gửi..." : "Yêu cầu trả"}
                                  </Button>
                                ) : (
                                  <span className="text-xs text-muted-foreground">Không khả dụng</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {selectedOrderDetail && (
                    <div className="rounded-xl border border-border p-4">
                      <h4 className="text-base font-semibold">
                        Theo dõi đơn #{selectedOrderDetail.id}
                      </h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Giao tới: {selectedOrderDetail.shippingAddress || "-"} · SĐT: {selectedOrderDetail.phoneNumber || "-"}
                      </p>

                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div>
                          <h5 className="mb-2 text-sm font-semibold">Sản phẩm trong đơn</h5>
                          <div className="space-y-2">
                            {(selectedOrderDetail.items ?? []).map((item) => (
                              <div key={item.id} className="rounded-lg border p-2 text-sm">
                                <p className="font-medium">{item.product?.name}</p>
                                <p className="text-muted-foreground">
                                  SL: {item.quantity} · Đơn giá: {formatMoney(item.priceAtTime)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h5 className="mb-2 text-sm font-semibold">Lịch sử trạng thái</h5>
                          <div className="space-y-2">
                            {(selectedOrderDetail.statusHistory ?? []).map((entry) => (
                              <div key={entry.id} className="rounded-lg border p-2 text-sm">
                                <p className="font-medium">
                                  {formatEnum(entry.fromStatus)} → {formatEnum(entry.toStatus)}
                                </p>
                                <p className="text-muted-foreground">{formatDate(entry.createdAt)}</p>
                                {entry.note ? <p className="text-xs">{entry.note}</p> : null}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <PaymentQRModal
        isOpen={showTopUpQRModal}
        onClose={() => setShowTopUpQRModal(false)}
        paymentData={topUpQRData}
        title="Nạp tiền vào tài khoản"
        description="Quét mã QR để nạp tiền, sau đó hệ thống sẽ gửi email xác nhận giao dịch cho bạn."
        actionLabel="Đã quét mã"
        confirmNote="Email sẽ được gửi về ngay sau khi giao dịch nạp tiền được tạo."
        codeLabel="Mã nạp tiền"
        amountLabel="Số tiền nạp"
      />
    </div>
  );
}

function getInitials(value) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function formatMoney(value) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function formatEnum(value) {
  return String(value ?? "")
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function canRequestReturn(order) {
  return (
    String(order?.orderStatus ?? "").toUpperCase() === "DELIVERED" &&
    String(order?.paymentStatus ?? "").toUpperCase() === "PAID"
  );
}

function formatDate(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}
