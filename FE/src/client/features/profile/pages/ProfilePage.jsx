import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Eye,
  EyeOff,
  MapPin,
  Plus,
  Pencil,
  RotateCcw,
  Trash2,
  Navigation,
  Package,
  Truck,
  House,
  Wallet,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { connectChatSocket } from "@/client/features/chat/data/chat.socket.js";
import { profileApi } from "@/client/features/profile/data/profile.api";
import ReturnRequestModal from "@/components/ReturnRequestModal";

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
    if (!/^\d{10}$/.test(value.trim()))
      return "Số điện thoại phải đúng 10 chữ số";
    return "";
  },
  address: (value) => {
    if (!value?.trim()) return "Địa chỉ không được để trống";
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

const ORDERS_PER_PAGE = 4;

const ORDER_FILTERS = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING_PAYMENT", label: "Chờ thanh toán" },
  { key: "PREPARING", label: "Đang chuẩn bị" },
  { key: "SHIPPING", label: "Đang giao" },
  { key: "DELIVERED", label: "Đã giao" },
  { key: "CANCELLED", label: "Đã hủy" },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { token, user, isAuthenticated, isHydrated, setSession } = useAuth();
  const [loading, setLoading] = useState(true);
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState("profile");
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [orderFilter, setOrderFilter] = useState("ALL");
  const [showPendingOrders, setShowPendingOrders] = useState(true);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [currentOrderPage, setCurrentOrderPage] = useState(1);
  const [submittingReturnOrderId, setSubmittingReturnOrderId] = useState(null);
  const [returnRequestModalOpen, setReturnRequestModalOpen] = useState(false);
  const [selectedOrderForReturn, setSelectedOrderForReturn] = useState(null);
  const [returnRequests, setReturnRequests] = useState([]);
  const [returnRequestsLoading, setReturnRequestsLoading] = useState(false);
  const [reorderingOrderId, setReorderingOrderId] = useState(null);
  const [showPendingOrders, setShowPendingOrders] = useState(false);
  const [myReviews, setMyReviews] = useState([]);
  const [myReviewsLoading, setMyReviewsLoading] = useState(false);
  const [replyingReviewId, setReplyingReviewId] = useState(null);
  const [myReviewFilter, setMyReviewFilter] = useState("ALL");
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
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [addressEditingId, setAddressEditingId] = useState(null);
  const [addressForm, setAddressForm] = useState({
    label: "",
    receiverName: "",
    phoneNumber: "",
    addressLine: "",
    city: "",
    district: "",
    isDefault: false,
  });
  const [districtOptions, setDistrictOptions] = useState([]);
  const CITY_DISTRICTS = {
    "Hà Nội": [],
    "Hồ Chí Minh": [],
    "Đà Nẵng": [
      "Hải Châu",
      "Thanh Khê",
      "Sơn Trà",
      "Ngũ Hành Sơn",
      "Liên Chiểu",
      "Cẩm Lệ",
      "Hòa Vang",
    ],
    "Hải Phòng": [],
    "Cần Thơ": [],
    "An Giang": [],
    "Bà Rịa - Vũng Tàu": [],
    "Bạc Liêu": [],
    "Bắc Kạn": [],
    "Bắc Giang": [],
    "Bắc Ninh": [],
    "Bến Tre": [],
    "Bình Định": [],
    "Bình Dương": [],
    "Bình Phước": [],
    "Bình Thuận": [],
    "Cà Mau": [],
    "Cao Bằng": [],
    "Đắk Lắk": [],
    "Đắk Nông": [],
    "Điện Biên": [],
    "Đồng Nai": [],
    "Đồng Tháp": [],
    "Gia Lai": [],
    "Hà Giang": [],
    "Hà Nam": [],
    "Hà Tĩnh": [],
    "Hậu Giang": [],
    "Hòa Bình": [],
    "Hưng Yên": [],
    "Khánh Hòa": [],
    "Kiên Giang": [],
    "Kon Tum": [],
    "Lai Châu": [],
    "Lâm Đồng": [],
    "Lạng Sơn": [],
    "Lào Cai": [],
    "Long An": [],
    "Nam Định": [],
    "Nghệ An": [],
    "Ninh Bình": [],
    "Ninh Thuận": [],
    "Phú Thọ": [],
    "Phú Yên": [],
    "Quảng Bình": [],
    "Quảng Nam": [],
    "Quảng Ngãi": [],
    "Quảng Ninh": [],
    "Quảng Trị": [],
    "Sóc Trăng": [],
    "Sơn La": [],
    "Tây Ninh": [],
    "Thái Bình": [],
    "Thái Nguyên": [],
    "Thanh Hóa": [],
    "Thừa Thiên Huế": [],
    "Tiền Giang": [],
    "Trà Vinh": [],
    "Tuyên Quang": [],
    "Vĩnh Long": [],
    "Vĩnh Phúc": [],
    "Yên Bái": [],
  };
  const [addressFeedback, setAddressFeedback] = useState(null);
  const [isLocatingAddress, setIsLocatingAddress] = useState(false);

  const [reviewView, setReviewView] = useState("history");
  const [pendingReviews, setPendingReviews] = useState([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState(null);
  const [reviewReplyDraftById, setReviewReplyDraftById] = useState({});
  const [sendingReviewReplyId, setSendingReviewReplyId] = useState(null);

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
      const [data, addressList] = await Promise.all([
        profileApi.getProfile(),
        profileApi.getAddresses(),
      ]);
      setProfileData(data);
      setAddresses(Array.isArray(addressList) ? addressList : []);
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
      const error = passwordValidation[key]?.(value, passwordForm.newPassword);
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
        address: formData.address?.trim(),
      });
      setSession({ token, user: updatedUser });
      setProfileData(updatedUser);
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

  async function loadMyReturnRequests() {
    try {
      setReturnRequestsLoading(true);
      const data = await profileApi.getMyReturnRequests();
      setReturnRequests(Array.isArray(data) ? data : []);
    } catch (error) {
      setReturnRequests([]);
      setMessage({
        type: "error",
        text: error.message || "Không thể tải tiến trình trả hàng",
      });
    } finally {
      setReturnRequestsLoading(false);
    }
  }

  const returnRequestByOrderId = useMemo(() => {
    const mapping = new Map();
    for (const request of returnRequests) {
      const orderId = Number(request?.orderId);
      if (!Number.isFinite(orderId)) {
        continue;
      }
      const existing = mapping.get(orderId);
      if (!existing) {
        mapping.set(orderId, request);
        continue;
      }
      const existingTime = new Date(existing?.requestedAt ?? 0).getTime();
      const currentTime = new Date(request?.requestedAt ?? 0).getTime();
      if (currentTime > existingTime) {
        mapping.set(orderId, request);
      }
    }
    return mapping;
  }, [returnRequests]);

  async function loadMyReviews() {
    try {
      setMyReviewsLoading(true);
      const data = await profileApi.getMyReviews();
      setMyReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Không thể tải lịch sử đánh giá",
      });
      setMyReviews([]);
    } finally {
      setMyReviewsLoading(false);
    }
  }

  const filteredOrders = useMemo(
    () => {
      let result = orders;
      if (!showPendingOrders) {
        result = result.filter((order) => getOrderFilterKey(order) !== "PENDING_PAYMENT");
      }
      if (orderFilter !== "ALL") {
        result = result.filter((order) => getOrderFilterKey(order) === orderFilter);
      }
      return result;
    },
    [orderFilter, orders, showPendingOrders],
  );

  const sortedVisibleOrders = useMemo(
    () =>
      [...filteredOrders].sort(
        (a, b) =>
          new Date(b?.createdAt ?? 0).getTime() -
          new Date(a?.createdAt ?? 0).getTime(),
      ),
    [filteredOrders],
  );

  const filteredMyReviews = useMemo(
    () =>
      myReviewFilter === "ALL"
        ? myReviews
        : myReviews.filter((review) => String(review?.status ?? "").toUpperCase() === myReviewFilter),
    [myReviewFilter, myReviews],
  );

  const totalOrderPages = Math.max(
    1,
    Math.ceil(sortedVisibleOrders.length / ORDERS_PER_PAGE),
  );

  const pagedOrders = useMemo(() => {
    const startIndex = (currentOrderPage - 1) * ORDERS_PER_PAGE;
    return sortedVisibleOrders.slice(startIndex, startIndex + ORDERS_PER_PAGE);
  }, [sortedVisibleOrders, currentOrderPage]);

  useEffect(() => {
    if (currentOrderPage > totalOrderPages) {
      setCurrentOrderPage(totalOrderPages);
    }
  }, [currentOrderPage, totalOrderPages]);

  useEffect(() => {
    setCurrentOrderPage(1);
  }, [orderFilter]);

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
    const order = orders.find((o) => o.id === orderId);
    if (order) {
      setSelectedOrderForReturn(order);
      setReturnRequestModalOpen(true);
    }
  }

  async function handleSubmitReturnRequest(formData) {
    try {
      setSubmittingReturnOrderId(formData.orderId);
      await profileApi.requestReturn(formData);
      setMessage({
        type: "success",
        text: `Đã gửi yêu cầu trả hàng cho đơn #${formData.orderId}. Chờ admin duyệt.`,
      });
      await Promise.all([loadMyOrders(), loadMyReturnRequests()]);
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Không thể gửi yêu cầu trả hàng",
      });
    } finally {
      setSubmittingReturnOrderId(null);
    }
  }

  async function handleReorder(order) {
    const items = Array.isArray(order?.items) ? order.items : [];

    if (items.length === 0) {
      setMessage({
        type: "error",
        text: "Đơn hàng này không có sản phẩm để mua lại",
      });
      return;
    }

    try {
      setReorderingOrderId(order.id);
      setMessage(null);

      for (const item of items) {
        const quantity = Math.max(1, Number(item.quantity ?? 1));
        await addToCart(item.product, quantity);
      }

      setMessage({
        type: "success",
        text: `Đã thêm lại toàn bộ sản phẩm của đơn #${order.id} vào giỏ hàng`,
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Không thể mua lại đơn hàng",
      });
    } finally {
      setReorderingOrderId(null);
    }
  }

  async function handleReplyMyReview(review) {
    if (!review?.product?.slug || !review?.id) {
      return;
    }

    const messageText = window.prompt("Nhập phản hồi cho thread đánh giá:");
    if (!messageText || !messageText.trim()) {
      return;
    }

    try {
      setReplyingReviewId(review.id);
      const response = await fetch(`/api/products/${review.product.slug}/reviews/${review.id}/replies`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: messageText.trim() }),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.message || "Không thể gửi phản hồi");
      }

      setMessage({
        type: "success",
        text: "Phản hồi đánh giá đã được gửi",
      });
      await loadMyReviews();
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Không thể gửi phản hồi đánh giá",
      });
    } finally {
      setReplyingReviewId(null);
    }
  }

  useEffect(() => {
    if (activeTab !== "orders") {
      return;
    }

    Promise.all([loadMyOrders(), loadMyReturnRequests()]);
  }, [activeTab]);

  async function loadMyReviews() {
    try {
      setReviewsLoading(true);
      const payload = await profileApi.getMyReviews();
      const items = Array.isArray(payload?.items) ? payload.items : [];
      setMyReviews(items);
      setReviewReplyDraftById((prev) => {
        const next = { ...prev };
        items.forEach((review) => {
          const id = Number(review?.id);
          if (!Number.isFinite(id) || id <= 0) {
            return;
          }
          if (next[id] === undefined) {
            next[id] = "";
          }
        });
        return next;
      });
    } catch (error) {
      setMyReviews([]);
      setMessage({
        type: "error",
        text: error.message || "Không thể tải lịch sử đánh giá",
      });
    } finally {
      setReviewsLoading(false);
    }
  }

  async function loadMyPendingReviews() {
    try {
      setPendingLoading(true);
      const payload = await profileApi.getMyPendingReviews();
      setPendingReviews(Array.isArray(payload?.items) ? payload.items : []);
    } catch (error) {
      setPendingReviews([]);
      setMessage({
        type: "error",
        text: error.message || "Không thể tải danh sách chưa đánh giá",
      });
    } finally {
      setPendingLoading(false);
    }
  }

  useEffect(() => {
    if (activeTab !== "reviews") {
      return;
    }

    loadMyReviews();
    loadMyPendingReviews();
  }, [activeTab]);

  async function sendReviewReply(reviewId) {
    const id = Number(reviewId);
    if (!Number.isFinite(id) || id <= 0) {
      return;
    }

    const messageText = String(reviewReplyDraftById[id] ?? "").trim();
    if (!messageText) {
      setMessage({
        type: "error",
        text: "Vui lòng nhập nội dung phản hồi",
      });
      return;
    }

    try {
      setSendingReviewReplyId(id);
      const payload = await profileApi.replyToMyReview(id, messageText);
      const thread = Array.isArray(payload?.thread) ? payload.thread : [];

      setMyReviews((prev) =>
        prev.map((item) =>
          Number(item?.id) === id ? { ...item, thread } : item,
        ),
      );
      setReviewReplyDraftById((prev) => ({ ...prev, [id]: "" }));
      setMessage({
        type: "success",
        text: "Đã gửi phản hồi",
      });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Không thể gửi phản hồi",
      });
    } finally {
      setSendingReviewReplyId(null);
    }
  }

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

  function resetAddressForm(next = {}) {
    setAddressForm({
      label: next.label || "",
      receiverName: next.receiverName || formData.fullName || "",
      phoneNumber: next.phoneNumber || formData.phone || "",
      addressLine: next.addressLine || "",
      city: next.city || "",
      district: next.district || "",
      isDefault: Boolean(next.isDefault),
    });
  }

  function loadDistrictsForCity(city) {
    const list = CITY_DISTRICTS[city] || [];
    setDistrictOptions(list);
    // If current selected district is not in new list, reset it
    setAddressForm((prev) => ({
      ...prev,
      district: list.includes(prev.district) ? prev.district : "",
    }));
  }

  function handleSelectCity(city) {
    setAddressForm((prev) => ({ ...prev, city }));
    loadDistrictsForCity(city);
  }

  function handleQuickDaNang() {
    // Quick-fill city = Đà Nẵng and load its districts
    handleSelectCity("Đà Nẵng");
  }

  async function reloadAddresses() {
    try {
      setAddressesLoading(true);
      const list = await profileApi.getAddresses();
      setAddresses(Array.isArray(list) ? list : []);
    } finally {
      setAddressesLoading(false);
    }
  }

  function beginCreateAddress() {
    setAddressEditingId(null);
    resetAddressForm({ isDefault: addresses.length === 0 });
    setAddressFeedback(null);
  }

  function beginEditAddress(item) {
    setAddressEditingId(item.id);
    resetAddressForm(item);
    setAddressFeedback(null);
    // load district options for existing city if available
    if (item?.city) loadDistrictsForCity(item.city);
  }

  async function submitAddressForm(e) {
    e.preventDefault();

    try {
      const receiverNameError = profileValidation.fullName(
        addressForm.receiverName,
      );
      if (receiverNameError) {
        throw new Error(receiverNameError);
      }

      const phoneError =
        profileValidation.phone(addressForm.phoneNumber) ||
        (!addressForm.phoneNumber ? "Số điện thoại không được trống" : "");
      if (phoneError) {
        throw new Error(phoneError);
      }

      const addressError = profileValidation.address(addressForm.addressLine);
      if (addressError) {
        throw new Error(addressError);
      }

      // Compose full address including district and city for storage
      const composedAddressLine = `${String(addressForm.addressLine ?? "").trim()}${addressForm.district ? `, ${addressForm.district}` : ""}${addressForm.city ? `, ${addressForm.city}` : ""}`.trim();

      const payload = {
        label: String(addressForm.label ?? "").trim(),
        receiverName: String(addressForm.receiverName ?? "").trim(),
        phoneNumber: String(addressForm.phoneNumber ?? "").trim(),
        addressLine: composedAddressLine,
        isDefault: Boolean(addressForm.isDefault),
      };

      if (addressEditingId) {
        await profileApi.updateAddress(addressEditingId, payload);
      } else {
        await profileApi.createAddress(payload);
      }

      setAddressFeedback({
        type: "success",
        text: addressEditingId ? "Đã cập nhật địa chỉ" : "Đã thêm địa chỉ mới",
      });
      setAddressEditingId(null);
      setAddressForm({
        label: "",
        receiverName: "",
        phoneNumber: "",
        addressLine: "",
        isDefault: false,
      });
      await reloadAddresses();
    } catch (error) {
      setAddressFeedback({
        type: "error",
        text: error.message || "Không thể lưu địa chỉ",
      });
    }
  }

  async function removeAddress(addressId) {
    try {
      await profileApi.deleteAddress(addressId);
      setAddressFeedback({
        type: "success",
        text: "Đã xóa địa chỉ",
      });
      if (addressEditingId === addressId) {
        setAddressEditingId(null);
      }
      await reloadAddresses();
    } catch (error) {
      setAddressFeedback({
        type: "error",
        text: error.message || "Không thể xóa địa chỉ",
      });
    }
  }

  async function fillAddressFromGps() {
    try {
      setIsLocatingAddress(true);
      const { latitude, longitude } = await getBrowserCoordinates();
      const resolvedAddress = await reverseGeocodeByCoordinates(
        latitude,
        longitude,
      );
      setAddressForm((prev) => ({ ...prev, addressLine: resolvedAddress }));
    } catch (error) {
      setAddressFeedback({
        type: "error",
        text: error.message || "Không thể lấy địa chỉ từ GPS",
      });
    } finally {
      setIsLocatingAddress(false);
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
                message.type === "success" ? "text-green-600" : "text-red-600"
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
                      {profileData?.status === "ACTIVE"
                        ? "✓ Đã xác minh"
                        : "○ Chưa xác minh"}
                    </Badge>
                  </div>
                  <div className="text-left">
                    <p className="text-xs font-semibold text-muted-foreground">
                      NGÀY TẠO
                    </p>
                    <p className="mt-2 text-sm">
                      {new Date(profileData?.createdAt).toLocaleDateString(
                        "vi-VN",
                      )}
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
              <Button
                variant={activeTab === "reviews" ? "default" : "ghost"}
                onClick={() => setActiveTab("reviews")}
                className="rounded-b-none"
              >
                Đánh giá của tôi
              </Button>
              <Button
                variant={activeTab === "addresses" ? "default" : "ghost"}
                onClick={() => setActiveTab("addresses")}
                className="rounded-b-none"
              >
                Sổ địa chỉ
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
                              e.target.value,
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
                              formData.fullName,
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
                          const nextPhone = e.target.value
                            .replace(/\D/g, "")
                            .slice(0, 10);
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
                              formData.phone,
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
                            const error = profileValidation.address(
                              e.target.value,
                            );
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
                        Không thể thay đổi email. Liên hệ hỗ trợ nếu cần thay
                        đổi.
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
                              e.target.value,
                            );
                            setErrors({
                              ...errors,
                              currentPassword: error,
                            });
                          }
                        }}
                        className={
                          errors.currentPassword
                            ? "border-red-500 pr-10"
                            : "pr-10"
                        }
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
                          if (errors.newPassword || errors.confirmPassword) {
                            const newError = passwordValidation.newPassword(
                              e.target.value,
                            );
                            const confirmError =
                              passwordValidation.confirmPassword(
                                passwordForm.confirmPassword,
                                e.target.value,
                              );
                            setErrors({
                              ...errors,
                              newPassword: newError,
                              confirmPassword: confirmError,
                            });
                          }
                        }}
                        className={
                          errors.newPassword ? "border-red-500 pr-10" : "pr-10"
                        }
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
                              passwordForm.newPassword,
                            );
                            setErrors({
                              ...errors,
                              confirmPassword: error,
                            });
                          }
                        }}
                        className={
                          errors.confirmPassword
                            ? "border-red-500 pr-10"
                            : "pr-10"
                        }
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
                    <h3 className="text-lg font-semibold">
                      Danh sách đơn hàng
                    </h3>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          checked={showPendingOrders}
                          onChange={(event) =>
                            setShowPendingOrders(event.target.checked)
                          }
                        />
                        Hiển thị đơn chờ thanh toán
                      </label>
                      <Button variant="outline" onClick={loadMyOrders}>
                        Tải lại
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 border-b border-border pb-2">
                    {ORDER_FILTERS.map((tab) => (
                      <Button
                        key={tab.key}
                        type="button"
                        size="sm"
                        variant={orderFilter === tab.key ? "default" : "outline"}
                        onClick={() => setOrderFilter(tab.key)}
                      >
                        {tab.label}
                      </Button>
                    ))}
                  </div>

                  {ordersLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải đơn hàng...
                    </div>
                  ) : sortedVisibleOrders.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Bạn chưa có đơn hàng nào phù hợp bộ lọc hiện tại.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[700px] text-left text-sm">
                          <thead>
                            <tr className="border-b border-border/70 text-muted-foreground">
                              <th className="px-3 py-3 font-medium">Mã đơn</th>
                              <th className="px-3 py-3 font-medium">
                                Ngày tạo
                              </th>
                              <th className="px-3 py-3 font-medium">
                                Tổng tiền
                              </th>
                              <th className="px-3 py-3 font-medium">
                                Thanh toán
                              </th>
                              <th className="px-3 py-3 font-medium">
                                Trạng thái
                              </th>
                              <th className="px-3 py-3 font-medium">
                                Theo dõi
                              </th>
                              <th className="px-3 py-3 font-medium">
                                Trả hàng
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {pagedOrders.map((order) => {
                              const orderReturnRequest = returnRequestByOrderId.get(
                                Number(order.id),
                              );

                              return (
                                <tr
                                  key={order.id}
                                  className="border-b border-border/40"
                                >
                                <td className="px-3 py-3">#{order.id}</td>
                                <td className="px-3 py-3">
                                  {formatDate(order.createdAt)}
                                </td>
                                <td className="px-3 py-3">
                                  {formatMoney(order.totalAmount)}
                                </td>
                                <td className="px-3 py-3">
                                  {formatPaymentMethod(order.paymentMethod)} -{" "}
                                  {formatPaymentStatus(order.paymentStatus)}
                                </td>
                                <td className="px-3 py-3">
                                  <Badge variant="outline">
                                    {formatOrderStatus(
                                      order.orderStatus,
                                      order.paymentStatus,
                                    )}
                                  </Badge>
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
                                  {orderReturnRequest ? (
                                    <div className="space-y-2">
                                      <Badge
                                        variant="outline"
                                        className={getReturnBadgeClass(orderReturnRequest.status)}
                                      >
                                        {formatReturnStatus(orderReturnRequest.status)}
                                      </Badge>
                                      <p className="text-[11px] text-muted-foreground">
                                        {getReturnStatusHint(orderReturnRequest)}
                                      </p>
                                    </div>
                                  ) : canRequestReturn(order) ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={
                                        submittingReturnOrderId === order.id
                                      }
                                      onClick={() =>
                                        handleRequestReturn(order.id)
                                      }
                                    >
                                      {submittingReturnOrderId === order.id
                                        ? "Đang gửi..."
                                        : "Yêu cầu trả"}
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">
                                      Không khả dụng
                                    </span>
                                  )}
                                </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {returnRequestsLoading ? (
                        <p className="text-xs text-muted-foreground">
                          Đang đồng bộ tiến trình trả hàng...
                        </p>
                      ) : null}

                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                          Hiển thị {pagedOrders.length} /{" "}
                          {sortedVisibleOrders.length} đơn hàng
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          {Array.from(
                            { length: totalOrderPages },
                            (_, index) => {
                              const page = index + 1;
                              const isActive = page === currentOrderPage;
                              return (
                                <Button
                                  key={`order-page-${page}`}
                                  variant={isActive ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => setCurrentOrderPage(page)}
                                  className="min-w-9"
                                >
                                  {page}
                                </Button>
                              );
                            },
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedOrderDetail && (
                    <div className="rounded-xl border border-border p-4 space-y-4">
                      <h4 className="text-base font-semibold">
                        Theo dõi đơn #{selectedOrderDetail.id}
                      </h4>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Giao tới: {selectedOrderDetail.shippingAddress || "-"} ·
                        SĐT: {selectedOrderDetail.phoneNumber || "-"}
                      </p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Thanh toán:{" "}
                        {formatPaymentMethod(selectedOrderDetail.paymentMethod)}{" "}
                        -{" "}
                        {formatPaymentStatus(selectedOrderDetail.paymentStatus)}{" "}
                        · Trạng thái:{" "}
                        {formatOrderStatus(
                          selectedOrderDetail.orderStatus,
                          selectedOrderDetail.paymentStatus,
                        )}
                      </p>

                      <div className="rounded-xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-sky-50 to-indigo-50 p-4">
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <p className="text-sm font-semibold text-emerald-900">
                            Hành trình đơn hàng
                          </p>
                          <Badge
                            variant="outline"
                            className="border-emerald-300 text-emerald-700"
                          >
                            {getTrackingHeadline(selectedOrderDetail)}
                          </Badge>
                        </div>

                        <div className="grid gap-3 md:grid-cols-4">
                          {buildTrackingSteps(selectedOrderDetail).map(
                            (step) => (
                              <div
                                key={`tracking-step-${step.key}`}
                                className={`rounded-lg border p-3 text-xs ${
                                  step.state === "done"
                                    ? "border-emerald-300 bg-emerald-100/70"
                                    : step.state === "active"
                                      ? "border-sky-300 bg-sky-100/70"
                                      : "border-slate-200 bg-white"
                                }`}
                              >
                                <p className="font-semibold text-slate-900">
                                  {step.title}
                                </p>
                                <p className="mt-1 text-slate-600">
                                  {step.description}
                                </p>
                              </div>
                            ),
                          )}
                        </div>

                        <div className="mt-4 rounded-lg border border-sky-200 bg-white p-3">
                          <div className="flex items-center justify-center gap-4 text-sky-700">
                            <div className="flex items-center gap-2 rounded-md bg-amber-50 px-3 py-2 text-amber-700">
                              <Package className="h-4 w-4 animate-pulse" />
                              <span className="text-xs font-medium">
                                Người bán đang gói hàng
                              </span>
                            </div>
                            <div className="flex items-center gap-2 rounded-md bg-sky-50 px-3 py-2 text-sky-700">
                              <Truck className="h-4 w-4 animate-bounce" />
                              <span className="text-xs font-medium">
                                Xe giao hàng đang di chuyển
                              </span>
                            </div>
                            <div className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-emerald-700">
                              <House className="h-4 w-4" />
                              <span className="text-xs font-medium">
                                Đang hướng tới địa chỉ của bạn
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {(() => {
                        const orderReturnRequest = returnRequestByOrderId.get(
                          Number(selectedOrderDetail.id),
                        );

                        if (!orderReturnRequest) {
                          return null;
                        }

                        const returnSteps = buildReturnTrackingSteps(orderReturnRequest);

                        return (
                          <div className="mt-4 rounded-xl border border-orange-200 bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 p-4">
                            <div className="mb-3 flex items-center justify-between gap-2">
                              <p className="text-sm font-semibold text-orange-900">
                                Theo dõi trả hàng A-Z
                              </p>
                              <Badge
                                variant="outline"
                                className={getReturnBadgeClass(orderReturnRequest.status)}
                              >
                                {formatReturnStatus(orderReturnRequest.status)}
                              </Badge>
                            </div>

                            <p className="mb-3 text-xs text-orange-900/80">
                              {getReturnStatusHint(orderReturnRequest)}
                            </p>

                            <div className="grid gap-3 md:grid-cols-5">
                              {returnSteps.map((step) => (
                                <div
                                  key={`return-step-${step.key}`}
                                  className={`rounded-lg border p-3 text-xs ${
                                    step.state === "done"
                                      ? "border-emerald-300 bg-emerald-100/70"
                                      : step.state === "active"
                                        ? "border-orange-300 bg-orange-100/70"
                                        : "border-slate-200 bg-white"
                                  }`}
                                >
                                  <p className="font-semibold text-slate-900">
                                    {step.title}
                                  </p>
                                  <p className="mt-1 text-slate-600">
                                    {step.description}
                                  </p>
                                  {step.time ? (
                                    <p className="mt-2 text-[11px] text-slate-500">
                                      {step.time}
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                            </div>

                            {orderReturnRequest.rejectReason ? (
                              <Alert className="mt-4 border-red-300 bg-red-50">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  Lý do từ chối: {orderReturnRequest.rejectReason}
                                </AlertDescription>
                              </Alert>
                            ) : null}

                            {orderReturnRequest.note ? (
                              <div className="mt-3 rounded-lg border border-orange-200 bg-white p-3 text-xs text-slate-700">
                                Ghi chú xử lý: {orderReturnRequest.note}
                              </div>
                            ) : null}
                          </div>
                        );
                      })()}

                      <div className="mt-4 grid gap-4 lg:grid-cols-2">
                        <div>
                          <h5 className="mb-2 text-sm font-semibold">
                            Sản phẩm trong đơn
                          </h5>
                          <div className="space-y-2">
                            {(selectedOrderDetail.items ?? []).map((item) => (
                              <div
                                key={item.id}
                                className="rounded-lg border p-2 text-sm"
                              >
                                <p className="font-medium">
                                  {item.product?.name}
                                </p>
                                <p className="text-muted-foreground">
                                  SL: {item.quantity} · Đơn giá:{" "}
                                  {formatMoney(item.priceAtTime)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h5 className="mb-2 text-sm font-semibold">
                            Lịch sử trạng thái
                          </h5>
                          <div className="space-y-2">
                            {(selectedOrderDetail.statusHistory ?? []).map(
                              (entry) => (
                                <div
                                  key={entry.id}
                                  className="rounded-lg border p-2 text-sm"
                                >
                                  <p className="font-medium">
                                    {formatHistoryStatus(entry.fromStatus)} →{" "}
                                    {formatHistoryStatus(entry.toStatus)}
                                  </p>
                                  <p className="text-muted-foreground">
                                    {formatDate(entry.createdAt)}
                                  </p>
                                  {entry.note ? (
                                    <p className="text-xs">
                                      {formatOrderHistoryNote(entry.note)}
                                    </p>
                                  ) : null}
                                </div>
                              ),
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {activeTab === "reviews" && (
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Lịch sử đánh giá</h3>
                      <p className="text-sm text-muted-foreground">
                        Xem các review của bạn và theo dõi phản hồi từ admin.
                      </p>
                    </div>
                    <Button variant="outline" onClick={loadMyReviews}>
                      Tải lại
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 border-b border-border pb-2">
                    {["ALL", "VISIBLE", "HIDDEN", "DELETED"].map((status) => (
                      <Button
                        key={`review-filter-${status}`}
                        type="button"
                        size="sm"
                        variant={myReviewFilter === status ? "default" : "outline"}
                        onClick={() => setMyReviewFilter(status)}
                      >
                        {status === "ALL"
                          ? "Tất cả"
                          : status === "VISIBLE"
                            ? "Đang hiển thị"
                            : status === "HIDDEN"
                              ? "Đã ẩn"
                              : "Đã xóa"}
                      </Button>
                    ))}
                  </div>

                  {myReviewsLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải lịch sử đánh giá...
                    </div>
                  ) : filteredMyReviews.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Bạn chưa có đánh giá nào phù hợp bộ lọc hiện tại.</p>
                  ) : (
                    <div className="space-y-4">
                      {filteredMyReviews.map((review) => (
                        <Card key={review.id} className="border-border/70 p-4">
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div className="flex items-start gap-3">
                              <img
                                src={review.product?.imageUrl || "/images/component-placeholder.svg"}
                                alt={review.product?.name || "Sản phẩm"}
                                className="h-16 w-16 rounded-xl object-cover"
                              />
                              <div>
                                <p className="font-semibold">{review.product?.name ?? "Sản phẩm"}</p>
                                <p className="text-sm text-muted-foreground">
                                  {formatRelativeTime(review.createdAt)} · {"★".repeat(Number(review.rating ?? 0))}
                                </p>
                                <div className="mt-2 flex flex-wrap gap-2">
                                  <Badge variant="outline">{formatReviewStatus(review.status)}</Badge>
                                  {review.moderationReason ? (
                                    <Badge variant="secondary">{review.moderationReason}</Badge>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                            <div className="text-sm text-muted-foreground lg:text-right">
                              <p>#{review.id}</p>
                              <p>{review.product?.slug}</p>
                            </div>
                          </div>

                          {review.comment ? (
                            <p className="mt-3 rounded-lg bg-muted/40 p-3 text-sm">{review.comment}</p>
                          ) : null}

                          <div className="mt-3 space-y-2 border-t border-border/60 pt-3">
                            {(review.replies ?? []).length > 0 ? (
                              review.replies.map((reply) => (
                                <div key={reply.id} className="rounded-lg border border-border/60 bg-background p-3 text-sm">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium">
                                      {reply.user?.fullName ?? "Ẩn danh"}
                                      {reply.user?.role ? ` · ${reply.user.role}` : ""}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{formatRelativeTime(reply.createdAt)}</p>
                                  </div>
                                  <p className="mt-1">{reply.message}</p>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-muted-foreground">Chưa có phản hồi trong thread này.</p>
                            )}
                          </div>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={replyingReviewId === review.id}
                              onClick={() => handleReplyMyReview(review)}
                            >
                              {replyingReviewId === review.id ? "Đang gửi..." : "Phản hồi"}
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </Card>
            )}

            {activeTab === "addresses" && (
              <Card className="p-6">
                <div className="mb-4 flex items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold">
                      Sổ địa chỉ giao hàng
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Lưu nhiều địa chỉ để chọn nhanh khi đặt hàng
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={beginCreateAddress}
                    className="gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Thêm địa chỉ
                  </Button>
                </div>

                {addressFeedback && (
                  <Alert
                    className={`mb-4 ${
                      addressFeedback.type === "success"
                        ? "border-green-500 bg-green-500/10"
                        : "border-red-500 bg-red-500/10"
                    }`}
                  >
                    <AlertDescription
                      className={
                        addressFeedback.type === "success"
                          ? "text-green-600"
                          : "text-red-600"
                      }
                    >
                      {addressFeedback.text}
                    </AlertDescription>
                  </Alert>
                )}

                <form
                  onSubmit={submitAddressForm}
                  className="space-y-3 rounded-lg border border-border/70 p-4"
                >
                  <Input
                    placeholder="Nhãn địa chỉ (Nhà, Công ty...)"
                    value={addressForm.label}
                    onChange={(event) =>
                      setAddressForm((prev) => ({
                        ...prev,
                        label: event.target.value,
                      }))
                    }
                  />
                  <Input
                    placeholder="Tên người nhận"
                    value={addressForm.receiverName}
                    onChange={(event) =>
                      setAddressForm((prev) => ({
                        ...prev,
                        receiverName: event.target.value,
                      }))
                    }
                  />
                  <Input
                    placeholder="Số điện thoại"
                    value={addressForm.phoneNumber}
                    onChange={(event) =>
                      setAddressForm((prev) => ({
                        ...prev,
                        phoneNumber: event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 10),
                      }))
                    }
                  />
                  <div className="flex gap-2">
                    <div className="flex w-full gap-2">
                      <div className="w-1/3">
                        <input
                          list="cities-list"
                          placeholder="Chọn tỉnh/thành"
                          value={addressForm.city}
                          onChange={(e) => {
                            const v = e.target.value;
                            setAddressForm((prev) => ({ ...prev, city: v }));
                            if (CITY_DISTRICTS[v]) loadDistrictsForCity(v);
                          }}
                          className="border rounded-md px-3 py-2 w-full"
                        />
                        <datalist id="cities-list">
                          {Object.keys(CITY_DISTRICTS).map((c) => (
                            <option key={c} value={c} />
                          ))}
                        </datalist>
                      </div>

                      <select
                        value={addressForm.district}
                        onChange={(e) =>
                          setAddressForm((prev) => ({
                            ...prev,
                            district: e.target.value,
                          }))
                        }
                        className="border rounded-md px-3 py-2 w-1/3"
                      >
                        <option value="">Chọn quận/huyện</option>
                        {districtOptions.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>

                      <Input
                        placeholder="Địa chỉ đầy đủ"
                        value={addressForm.addressLine}
                        onChange={(event) =>
                          setAddressForm((prev) => ({
                            ...prev,
                            addressLine: event.target.value,
                          }))
                        }
                        className="w-1/3"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={fillAddressFromGps}
                        disabled={isLocatingAddress}
                        className="gap-2"
                      >
                        {isLocatingAddress ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Navigation className="h-4 w-4" />
                        )}
                        GPS
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleQuickDaNang}
                        className="gap-2"
                      >
                        Nhập Đ
                      </Button>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={addressForm.isDefault}
                      onChange={(event) =>
                        setAddressForm((prev) => ({
                          ...prev,
                          isDefault: event.target.checked,
                        }))
                      }
                    />
                    Đặt làm địa chỉ mặc định
                  </label>
                  <div className="flex gap-2">
                    <Button type="submit" className="gap-2">
                      <MapPin className="h-4 w-4" />
                      {addressEditingId ? "Lưu địa chỉ" : "Thêm địa chỉ"}
                    </Button>
                    {addressEditingId ? (
                      <Button
                        type="button"
                        variant="outline"
                        onClick={beginCreateAddress}
                      >
                        Hủy chỉnh sửa
                      </Button>
                    ) : null}
                  </div>
                </form>

                <div className="mt-4 space-y-3">
                  {addressesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải địa chỉ...
                    </div>
                  ) : addresses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Bạn chưa có địa chỉ nào.
                    </p>
                  ) : (
                    addresses.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg border border-border/70 p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">
                              {item.label ? `${item.label} - ` : ""}
                              {item.receiverName}
                              {item.isDefault ? " (Mặc định)" : ""}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {item.phoneNumber}
                            </p>
                            <p className="text-sm">{item.addressLine}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => beginEditAddress(item)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="text-destructive"
                              onClick={() => removeAddress(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Card>
            )}

            {activeTab === "reviews" && (
              <Card className="p-6">
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">
                        Đánh giá của tôi
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Xem lịch sử đánh giá và phản hồi từ nhân viên
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant={
                          reviewView === "history" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setReviewView("history")}
                      >
                        Lịch sử đánh giá
                      </Button>
                      <Button
                        variant={
                          reviewView === "pending" ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => setReviewView("pending")}
                      >
                        Chưa đánh giá
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          loadMyReviews();
                          loadMyPendingReviews();
                        }}
                      >
                        Tải lại
                      </Button>
                    </div>
                  </div>

                  {reviewView === "history" && (
                    <div className="space-y-3">
                      {reviewsLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang tải đánh giá...
                        </div>
                      ) : myReviews.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Bạn chưa có đánh giá nào.
                        </p>
                      ) : (
                        myReviews.map((review) => {
                          const id = Number(review?.id);
                          const isOpen = Number(selectedReviewId) === id;
                          const thread = Array.isArray(review?.thread)
                            ? review.thread
                            : [];
                          const productName = String(
                            review?.product?.name ?? "Sản phẩm",
                          );
                          const productSlug = String(
                            review?.product?.slug ?? "",
                          );

                          return (
                            <div
                              key={id}
                              className="rounded-lg border border-border/70 p-4"
                            >
                              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold line-clamp-1">
                                    {productName}
                                  </p>
                                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    <span>
                                      ⭐ {Number(review?.rating ?? 0)}/5
                                    </span>
                                    <span>•</span>
                                    <span>{formatDate(review?.createdAt)}</span>
                                    {review?.isHidden ? (
                                      <Badge
                                        variant="outline"
                                        className="border-amber-400 text-amber-700"
                                      >
                                        Đang ẩn
                                      </Badge>
                                    ) : (
                                      <Badge
                                        variant="outline"
                                        className="border-emerald-300 text-emerald-700"
                                      >
                                        Hiển thị
                                      </Badge>
                                    )}
                                  </div>

                                  {review?.comment ? (
                                    <p className="mt-2 text-sm text-slate-700">
                                      {review.comment}
                                    </p>
                                  ) : (
                                    <p className="mt-2 text-sm text-muted-foreground">
                                      (Không có nội dung)
                                    </p>
                                  )}

                                  {Array.isArray(review?.images) &&
                                  review.images.length > 0 ? (
                                    <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                                      {review.images.map((image) => (
                                        <img
                                          key={image.id}
                                          src={image.imageUrl}
                                          alt="Ảnh đánh giá"
                                          className="h-24 w-full rounded-md border border-border/60 object-cover"
                                        />
                                      ))}
                                    </div>
                                  ) : null}

                                  {review?.adminReply ? (
                                    <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 p-3">
                                      <p className="text-xs font-semibold text-sky-700">
                                        Phản hồi mới nhất từ nhân viên
                                      </p>
                                      <p className="mt-1 text-sm text-slate-700">
                                        {review.adminReply}
                                      </p>
                                    </div>
                                  ) : null}

                                  {review?.isHidden && review?.hiddenReason ? (
                                    <p className="mt-2 text-xs text-amber-700">
                                      Lý do ẩn: {String(review.hiddenReason)}
                                    </p>
                                  ) : null}
                                </div>

                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      setSelectedReviewId((prev) =>
                                        Number(prev) === id ? null : id,
                                      )
                                    }
                                  >
                                    {isOpen ? "Ẩn hội thoại" : "Xem hội thoại"}
                                  </Button>

                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      productSlug &&
                                      navigate(`/components/${productSlug}`)
                                    }
                                    disabled={!productSlug}
                                  >
                                    Xem sản phẩm
                                  </Button>
                                </div>
                              </div>

                              {isOpen && (
                                <div className="mt-4 space-y-3">
                                  <div className="rounded-lg border border-border/60 bg-muted/30 p-3">
                                    {thread.length === 0 ? (
                                      <p className="text-sm text-muted-foreground">
                                        Chưa có hội thoại nào.
                                      </p>
                                    ) : (
                                      <div className="space-y-2">
                                        {thread.map((msg) => (
                                          <div
                                            key={String(msg.id)}
                                            className={`rounded-lg border p-3 text-sm ${
                                              msg.isStaff
                                                ? "border-sky-200 bg-sky-50"
                                                : "border-emerald-200 bg-emerald-50"
                                            }`}
                                          >
                                            <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                              <span className="font-medium text-slate-700">
                                                {msg.isStaff
                                                  ? "Nhân viên"
                                                  : "Bạn"}
                                              </span>
                                              <span>
                                                {formatDate(msg.createdAt)}
                                              </span>
                                            </div>
                                            <p className="mt-1 text-slate-700 whitespace-pre-wrap">
                                              {msg.message}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div className="space-y-2">
                                    <Textarea
                                      placeholder="Nhập phản hồi của bạn cho nhân viên..."
                                      value={String(
                                        reviewReplyDraftById[id] ?? "",
                                      )}
                                      onChange={(event) =>
                                        setReviewReplyDraftById((prev) => ({
                                          ...prev,
                                          [id]: event.target.value,
                                        }))
                                      }
                                    />
                                    <div className="flex justify-end">
                                      <Button
                                        size="sm"
                                        onClick={() => sendReviewReply(id)}
                                        disabled={sendingReviewReplyId === id}
                                      >
                                        {sendingReviewReplyId === id
                                          ? "Đang gửi..."
                                          : "Gửi phản hồi"}
                                      </Button>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}

                  {reviewView === "pending" && (
                    <div className="space-y-3">
                      {pendingLoading ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang tải danh sách chưa đánh giá...
                        </div>
                      ) : pendingReviews.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          Không có sản phẩm nào cần đánh giá.
                        </p>
                      ) : (
                        pendingReviews.map((item, index) => {
                          const slug = String(item?.product?.slug ?? "");
                          return (
                            <div
                              key={`${String(item?.orderId)}-${String(item?.product?.id)}-${index}`}
                              className="rounded-lg border border-border/70 p-4"
                            >
                              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div className="min-w-0">
                                  <p className="font-semibold line-clamp-1">
                                    {String(item?.product?.name ?? "Sản phẩm")}
                                  </p>
                                  <p className="mt-1 text-xs text-muted-foreground">
                                    Đơn hàng #{String(item?.orderId)} · SL:{" "}
                                    {Number(item?.quantity ?? 0)}
                                  </p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      slug && navigate(`/components/${slug}`)
                                    }
                                    disabled={!slug}
                                  >
                                    Đến trang sản phẩm để đánh giá
                                  </Button>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Return Request Modal */}
      <ReturnRequestModal
        isOpen={returnRequestModalOpen}
        onClose={() => {
          setReturnRequestModalOpen(false);
          setSelectedOrderForReturn(null);
        }}
        order={selectedOrderForReturn}
        onSubmit={handleSubmitReturnRequest}
        isSubmitting={submittingReturnOrderId !== null}
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

function formatPaymentMethod(value) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  if (normalized === "COD") {
    return "COD";
  }
  if (normalized === "VNPAY" || normalized === "PAYOS" || normalized === "SEPAY") {
    return "Thanh toán qua mã QR";
  }
  return normalized || "UNKNOWN";
}

function formatPaymentStatus(value) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  if (normalized === "PAID") {
    return "Đã thanh toán";
  }
  if (normalized === "PENDING") {
    return "Chờ thanh toán";
  }
  if (normalized === "FAILED") {
    return "Thanh toán thất bại";
  }
  if (normalized === "REFUNDED") {
    return "Đã hoàn tiền";
  }
  return formatEnum(normalized);
}

function formatOrderStatus(orderStatusValue, paymentStatusValue) {
  const orderStatus = String(orderStatusValue ?? "")
    .trim()
    .toUpperCase();
  const paymentStatus = String(paymentStatusValue ?? "")
    .trim()
    .toUpperCase();

  if (orderStatus === "PENDING") {
    return paymentStatus === "PAID"
      ? "Đã thanh toán, đang chuẩn bị hàng"
      : "Chờ thanh toán";
  }
  if (orderStatus === "PROCESSING") {
    return "Đang chuẩn bị hàng";
  }
  if (orderStatus === "SHIPPING") {
    return "Đang giao hàng";
  }
  if (orderStatus === "DELIVERED") {
    return "Đã nhận hàng";
  }
  if (orderStatus === "CANCELLED" && paymentStatus === "FAILED") {
    return "Thanh toán thất bại";
  }
  if (orderStatus === "CANCELLED") {
    return "Đã hủy";
  }

  return formatEnum(orderStatus);
}

function formatReviewStatus(value) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "VISIBLE") {
    return "Đang hiển thị";
  }
  if (normalized === "HIDDEN") {
    return "Đã ẩn";
  }
  if (normalized === "DELETED") {
    return "Đã xóa";
  }

  return formatEnum(normalized);
}

function getOrderFilterKey(order) {
  const orderStatus = String(order?.orderStatus ?? "").trim().toUpperCase();
  const paymentStatus = String(order?.paymentStatus ?? "").trim().toUpperCase();

  if (orderStatus === "CANCELLED") {
    return "CANCELLED";
  }

  if (orderStatus === "DELIVERED") {
    return "DELIVERED";
  }

  if (orderStatus === "SHIPPING") {
    return "SHIPPING";
  }

  if (orderStatus === "PROCESSING" || paymentStatus === "PAID") {
    return "PREPARING";
  }

  return "PENDING_PAYMENT";
}

function formatHistoryStatus(value) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();

  if (normalized === "PENDING") {
    return "Chờ xác nhận";
  }
  if (normalized === "PROCESSING") {
    return "Đang chuẩn bị hàng";
  }
  if (normalized === "SHIPPING") {
    return "Đang giao hàng";
  }
  if (normalized === "DELIVERED") {
    return "Đã nhận hàng";
  }
  if (normalized === "CANCELLED") {
    return "Đã hủy";
  }

  return formatEnum(normalized);
}

function formatOrderHistoryNote(note) {
  const normalized = String(note ?? "").trim();
  if (!normalized) {
    return "";
  }

  if (normalized.includes("Order created and waiting for PayOS payment")) {
    return "Đơn hàng đã được tạo, hệ thống đang chờ bạn hoàn tất thanh toán QR.";
  }
  if (normalized.includes("Order placed with COD and waiting for delivery")) {
    return "Đơn hàng COD đã ghi nhận thành công, shop bắt đầu xử lý đóng gói.";
  }
  if (normalized.includes("PayOS confirmed via")) {
    return "Thanh toán QR đã xác nhận thành công, đơn đang được chuyển sang đóng gói.";
  }
  if (normalized.includes("VNPAY confirmed via")) {
    return "Thanh toán VNPAY đã xác nhận thành công.";
  }

  if (normalized.includes("SePay confirmed via") || normalized.includes("SePay")) {
    return "Thanh toán SePay đã xác nhận thành công.";
  }
  if (
    normalized.includes("Cancelled: stock changed during payment confirmation")
  ) {
    return "Đơn bị hủy do tồn kho thay đổi trong lúc xác nhận thanh toán.";
  }

  return normalized;
}

function getTrackingStage(order) {
  const paymentStatus = String(order?.paymentStatus ?? "")
    .trim()
    .toUpperCase();
  const orderStatus = String(order?.orderStatus ?? "")
    .trim()
    .toUpperCase();

  if (orderStatus === "CANCELLED") {
    return "cancelled";
  }
  if (orderStatus === "DELIVERED") {
    return "delivered";
  }
  if (orderStatus === "SHIPPING") {
    return "shipping";
  }
  if (paymentStatus === "PAID" || orderStatus === "PROCESSING") {
    return "preparing";
  }

  return "awaiting_payment";
}

function buildTrackingSteps(order) {
  const stage = getTrackingStage(order);
  const indexMap = {
    awaiting_payment: 0,
    preparing: 1,
    shipping: 2,
    delivered: 3,
  };

  const activeIndex = indexMap[stage] ?? 0;

  const steps = [
    {
      key: "awaiting_payment",
      title: "Chờ thanh toán",
      description: "Đơn đã tạo thành công, chờ xác nhận thanh toán.",
    },
    {
      key: "preparing",
      title: "Đang chuẩn bị hàng",
      description: "Shop xác nhận đơn, kiểm kho và đóng gói sản phẩm.",
    },
    {
      key: "shipping",
      title: "Đang giao hàng",
      description: "Đơn đã bàn giao vận chuyển, tài xế đang giao tới bạn.",
    },
    {
      key: "delivered",
      title: "Đã nhận hàng",
      description: "Đơn đã giao thành công. Bạn có thể đánh giá sản phẩm.",
    },
  ];

  if (stage === "cancelled") {
    return steps.map((step) => ({ ...step, state: "pending" }));
  }

  return steps.map((step, index) => ({
    ...step,
    state:
      index < activeIndex
        ? "done"
        : index === activeIndex
          ? "active"
          : "pending",
  }));
}

function getTrackingHeadline(order) {
  const stage = getTrackingStage(order);

  if (stage === "awaiting_payment") {
    return "Đơn đang chờ bạn thanh toán";
  }
  if (stage === "preparing") {
    return "Đã thanh toán, shop đang chuẩn bị hàng";
  }
  if (stage === "shipping") {
    return "Đơn đang được giao tới bạn";
  }
  if (stage === "delivered") {
    return "Bạn đã nhận hàng thành công";
  }

  return "Đơn hàng đã bị hủy";
}

function formatReturnStatus(statusValue) {
  const status = String(statusValue ?? "")
    .trim()
    .toUpperCase();

  if (status === "PENDING") {
    return "Chờ duyệt";
  }
  if (status === "APPROVED") {
    return "Đã duyệt";
  }
  if (status === "SHIPPING_BACK") {
    return "Đang gửi trả";
  }
  if (status === "RECEIVED") {
    return "Đã nhận hàng trả";
  }
  if (status === "REFUNDED") {
    return "Đã hoàn tiền";
  }
  if (status === "REJECTED") {
    return "Bị từ chối";
  }
  if (status === "CANCELLED") {
    return "Đã hủy";
  }

  return formatEnum(status);
}

function getReturnBadgeClass(statusValue) {
  const status = String(statusValue ?? "")
    .trim()
    .toUpperCase();

  if (status === "REFUNDED") {
    return "border-emerald-300 text-emerald-700";
  }
  if (status === "REJECTED" || status === "CANCELLED") {
    return "border-red-300 text-red-700";
  }
  if (status === "RECEIVED") {
    return "border-sky-300 text-sky-700";
  }
  if (status === "APPROVED" || status === "SHIPPING_BACK") {
    return "border-orange-300 text-orange-700";
  }

  return "border-amber-300 text-amber-700";
}

function getReturnStatusHint(request) {
  const status = String(request?.status ?? "")
    .trim()
    .toUpperCase();

  if (status === "PENDING") {
    return "Shop đang kiểm tra yêu cầu của bạn. Vui lòng chờ duyệt.";
  }
  if (status === "APPROVED") {
    return "Yêu cầu đã duyệt. Vui lòng đóng gói và gửi hàng về shop.";
  }
  if (status === "SHIPPING_BACK") {
    return "Hàng trả đang được vận chuyển về kho của shop.";
  }
  if (status === "RECEIVED") {
    return "Shop đã nhận hàng trả và đang xử lý hoàn tiền.";
  }
  if (status === "REFUNDED") {
    return "Hoàn tiền thành công vào tài khoản bạn đã cung cấp.";
  }
  if (status === "REJECTED") {
    return "Yêu cầu bị từ chối. Xem lý do chi tiết bên dưới.";
  }
  if (status === "CANCELLED") {
    return "Yêu cầu trả hàng đã bị hủy.";
  }

  return "Đang cập nhật trạng thái xử lý trả hàng.";
}

function buildReturnTrackingSteps(request) {
  const status = String(request?.status ?? "")
    .trim()
    .toUpperCase();

  const steps = [
    {
      key: "requested",
      title: "1. Đã gửi yêu cầu",
      description: "Bạn đã tạo yêu cầu trả hàng.",
      time: formatDate(request?.requestedAt),
    },
    {
      key: "approved",
      title: "2. Shop duyệt yêu cầu",
      description: "Shop xác nhận yêu cầu trả hàng.",
      time: request?.reviewedAt ? formatDate(request.reviewedAt) : null,
    },
    {
      key: "shipping_back",
      title: "3. Bạn gửi hàng trả",
      description: "Đơn trả đang trên đường về shop.",
      time: null,
    },
    {
      key: "received",
      title: "4. Shop nhận hàng trả",
      description: "Shop kiểm tra hàng hoàn về.",
      time: request?.receivedAt ? formatDate(request.receivedAt) : null,
    },
    {
      key: "refunded",
      title: "5. Hoàn tiền",
      description: "Tiền được chuyển vào tài khoản hoàn tiền.",
      time: request?.refundedAt ? formatDate(request.refundedAt) : null,
    },
  ];

  if (status === "REJECTED" || status === "CANCELLED") {
    return steps.map((step, index) => ({
      ...step,
      state: index === 0 ? "done" : "pending",
    }));
  }

  const activeIndexMap = {
    PENDING: 0,
    APPROVED: 1,
    SHIPPING_BACK: 2,
    RECEIVED: 3,
    REFUNDED: 4,
  };

  const activeIndex = activeIndexMap[status] ?? 0;

  return steps.map((step, index) => ({
    ...step,
    state:
      index < activeIndex
        ? "done"
        : index === activeIndex
          ? "active"
          : "pending",
  }));
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

function formatRelativeTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  const diffSeconds = Math.max(1, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSeconds < 60) {
    return `${diffSeconds} giây trước`;
  }

  const diffMinutes = Math.floor(diffSeconds / 60);
  if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }

  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) {
    return `${diffDays} ngày trước`;
  }

  return formatDate(date);
}

function getBrowserCoordinates() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.navigator?.geolocation) {
      reject(new Error("Trình duyệt không hỗ trợ GPS"));
      return;
    }

    window.navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        if (error?.code === 1) {
          reject(new Error("Bạn cần cấp quyền vị trí để dùng GPS"));
          return;
        }

        reject(new Error("Không lấy được vị trí hiện tại"));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
      },
    );
  });
}

async function reverseGeocodeByCoordinates(latitude, longitude) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`,
    {
      headers: {
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error("Dịch vụ định vị đang bận, vui lòng thử lại");
  }

  const payload = await response.json();
  const address = String(payload?.display_name ?? "").trim();

  if (!address) {
    throw new Error("Không thể chuyển GPS thành địa chỉ");
  }

  return address;
}
