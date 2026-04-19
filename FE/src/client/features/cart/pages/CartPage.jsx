import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { useCart } from "@/contexts/CartContext";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AOS from "aos";
import {
  AlertCircle,
  CheckCircle2,
  Minus,
  Plus,
  Trash2,
  ShoppingBag,
  ArrowRight,
  Package,
  Navigation,
  Loader2,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { profileApi } from "@/client/features/profile/data/profile.api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function CartPage() {
  const [shippingAddress, setShippingAddress] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("PAYOS");
  const [addresses, setAddresses] = useState([]);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [isAddressFormOpen, setIsAddressFormOpen] = useState(false);
  const [addressForm, setAddressForm] = useState({
    label: "",
    receiverName: "",
    phoneNumber: "",
    addressLine: "",
    isDefault: false,
  });
  const [addressError, setAddressError] = useState("");
  const [addressMessage, setAddressMessage] = useState("");
  const [isLocatingAddress, setIsLocatingAddress] = useState(false);
  const [productVoucherCode, setProductVoucherCode] = useState("");
  const [shippingVoucherCode, setShippingVoucherCode] = useState("");
  const [pricingPreview, setPricingPreview] = useState(null);
  const [shippingEstimate, setShippingEstimate] = useState(null);
  const [shippingEstimateError, setShippingEstimateError] = useState("");
  const [shippingProvider, setShippingProvider] = useState("GHN");
  const [productVoucherFeedback, setProductVoucherFeedback] = useState("");
  const [productVoucherError, setProductVoucherError] = useState("");
  const [shippingVoucherFeedback, setShippingVoucherFeedback] = useState("");
  const [shippingVoucherError, setShippingVoucherError] = useState("");
  const [availableProductCoupons, setAvailableProductCoupons] = useState([]);
  const [availableShippingCoupons, setAvailableShippingCoupons] = useState([]);
  const [checkoutMessage, setCheckoutMessage] = useState("");
  const [checkoutError, setCheckoutError] = useState("");
  const [removingBundleId, setRemovingBundleId] = useState("");
  const [selectedCartItemIds, setSelectedCartItemIds] = useState([]);
  const hasInitializedSelectionRef = useRef(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const checkoutProductIds = useMemo(() => {
    const stateProductIds = location.state?.checkoutProductIds;
    if (!Array.isArray(stateProductIds)) {
      return [];
    }

    return stateProductIds
      .map((id) => Number(id))
      .filter((id) => Number.isFinite(id));
  }, [location.state]);

  const {
    items,
    updateQuantity,
    removeFromCart,
    totalPrice,
    clearCart,
    removeCartItemsByIds,
    removeBundle,
    checkout,
    previewPricing,
    listAvailableCoupons,
    estimateShipping,
    bundles,
  } = useCart();

  const bundleGroups = useMemo(() => groupCartBundles(items, bundles), [items, bundles]);
  const bundleItemIds = useMemo(
    () =>
      new Set(
        bundleGroups.flatMap((bundle) => bundle.items.map((item) => String(item.id))),
      ),
    [bundleGroups],
  );
  const standaloneItems = useMemo(
    () => items.filter((item) => !bundleItemIds.has(String(item.id))),
    [bundleItemIds, items],
  );

  const selectableItemIds = useMemo(
    () => items.map((item) => Number(item.id)).filter((id) => Number.isFinite(id)),
    [items],
  );

  const selectedCartItemIdSet = useMemo(
    () => new Set(selectedCartItemIds.map((id) => Number(id))),
    [selectedCartItemIds],
  );

  const selectedItems = useMemo(
    () => items.filter((item) => selectedCartItemIdSet.has(Number(item.id))),
    [items, selectedCartItemIdSet],
  );

  const selectedSubtotal = useMemo(
    () =>
      selectedItems.reduce(
        (sum, item) => sum + Number(item.component.price ?? 0) * Number(item.quantity ?? 0),
        0,
      ),
    [selectedItems],
  );

  const selectedBundleCount = useMemo(
    () =>
      bundleGroups.filter((bundle) =>
        bundle.items.every((item) => selectedCartItemIdSet.has(Number(item.id))),
      ).length,
    [bundleGroups, selectedCartItemIdSet],
  );

  const selectedCartItemSignature = useMemo(
    () => [...selectedCartItemIds].sort((a, b) => a - b).join(","),
    [selectedCartItemIds],
  );

  const isAllSelected =
    selectableItemIds.length > 0 && selectedCartItemIds.length === selectableItemIds.length;

  const selectedAddress = useMemo(
    () => addresses.find((item) => String(item.id) === String(selectedAddressId)) || null,
    [addresses, selectedAddressId],
  );

  const loadAddresses = useCallback(async () => {
    if (!isAuthenticated) {
      setAddresses([]);
      setSelectedAddressId("");
      setShippingAddress("");
      setPhoneNumber("");
      setAddressesLoading(false);
      return;
    }

    try {
      setAddressesLoading(true);
      const [addressesResult, profileResult] = await Promise.allSettled([
        profileApi.getAddresses(),
        profileApi.getProfile(),
      ]);

      if (addressesResult.status !== "fulfilled") {
        throw addressesResult.reason;
      }

      const profile =
        profileResult.status === "fulfilled" ? profileResult.value : null;
      const list = Array.isArray(addressesResult.value)
        ? addressesResult.value
        : [];
      setAddresses(list);

      const defaultAddress = list.find((item) => item.isDefault) || list[0] || null;
      if (defaultAddress) {
        setSelectedAddressId(String(defaultAddress.id));
        setShippingAddress(defaultAddress.addressLine || "");
        setPhoneNumber(defaultAddress.phoneNumber || "");
      } else {
        setSelectedAddressId("");
        setShippingAddress(String(profile?.address ?? "").trim());
        setPhoneNumber(String(profile?.phone ?? "").trim());
      }
    } catch (error) {
      setAddressError(error instanceof Error ? error.message : "Không tải được địa chỉ");
    } finally {
      setAddressesLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    loadAddresses();
  }, [loadAddresses]);

  useEffect(() => {
    AOS.init({
      duration: 900,
      easing: "ease-out-cubic",
      offset: 60,
      once: false,
      mirror: true,
      disable: () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    });
    AOS.refresh();
  }, [items.length]);

  useEffect(() => {
    setPricingPreview(null);
    setShippingEstimate(null);
    setShippingEstimateError("");
    setProductVoucherFeedback("");
    setProductVoucherError("");
    setShippingVoucherFeedback("");
    setShippingVoucherError("");
  }, [items.length, totalPrice, selectedCartItemSignature]);

  useEffect(() => {
    let cancelled = false;

    async function loadShippingEstimate() {
      if (!isAuthenticated || selectedCartItemIds.length === 0) {
        setShippingEstimate(null);
        setShippingEstimateError("");
        return;
      }

      try {
        setShippingEstimateError("");
        const data = await estimateShipping({
          addressId: selectedAddressId ? Number(selectedAddressId) : undefined,
          shippingAddress,
          selectedCartItemIds,
          provider: shippingProvider,
          paymentMethod,
        });

        if (cancelled) {
          return;
        }

        setShippingEstimate(data);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setShippingEstimate(null);
        setShippingEstimateError(
          error instanceof Error ? error.message : "Không thể ước tính phí ship",
        );
      }
    }

    loadShippingEstimate();

    return () => {
      cancelled = true;
    };
  }, [
    estimateShipping,
    isAuthenticated,
    selectedAddressId,
    selectedCartItemSignature,
    selectedCartItemIds,
    shippingAddress,
    shippingProvider,
    paymentMethod,
  ]);

  useEffect(() => {
    let cancelled = false;

    async function loadAvailableCoupons() {
      if (!isAuthenticated || selectedCartItemIds.length === 0) {
        setAvailableProductCoupons([]);
        setAvailableShippingCoupons([]);
        return;
      }

      try {
        const [productList, shippingList] = await Promise.all([
          listAvailableCoupons({
            scope: "PRODUCT",
            selectedCartItemIds,
            addressId: selectedAddressId ? Number(selectedAddressId) : undefined,
            shippingAddress,
            provider: shippingProvider,
            paymentMethod,
          }),
          listAvailableCoupons({
            scope: "SHIPPING",
            selectedCartItemIds,
            addressId: selectedAddressId ? Number(selectedAddressId) : undefined,
            shippingAddress,
            provider: shippingProvider,
            paymentMethod,
          }),
        ]);

        if (cancelled) {
          return;
        }

        setAvailableProductCoupons(Array.isArray(productList) ? productList : []);
        setAvailableShippingCoupons(Array.isArray(shippingList) ? shippingList : []);
      } catch (_error) {
        if (cancelled) {
          return;
        }
        setAvailableProductCoupons([]);
        setAvailableShippingCoupons([]);
      }
    }

    loadAvailableCoupons();

    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    listAvailableCoupons,
    paymentMethod,
    selectedAddressId,
    selectedCartItemIds,
    selectedCartItemSignature,
    shippingAddress,
    shippingProvider,
  ]);

  useEffect(() => {
    const validIds = new Set(selectableItemIds);

    if (!hasInitializedSelectionRef.current) {
      hasInitializedSelectionRef.current = true;
      if (checkoutProductIds.length > 0) {
        const selectedIds = items
          .filter((item) =>
            checkoutProductIds.includes(Number(item.component?.id ?? item.productId ?? item.id)),
          )
          .map((item) => Number(item.id))
          .filter((id) => Number.isFinite(id));

        setSelectedCartItemIds(selectedIds.length > 0 ? selectedIds : selectableItemIds);
      } else {
        setSelectedCartItemIds(selectableItemIds);
      }
      return;
    }

    setSelectedCartItemIds((prev) =>
      prev.filter((id) => validIds.has(Number(id))),
    );
  }, [checkoutProductIds, items, selectableItemIds]);

  function toggleSelectAll(checked) {
    setSelectedCartItemIds(checked ? selectableItemIds : []);
  }

  function toggleStandaloneItem(itemId, checked) {
    const normalizedId = Number(itemId);
    if (!Number.isFinite(normalizedId)) {
      return;
    }

    setSelectedCartItemIds((prev) => {
      const next = new Set(prev.map((id) => Number(id)));
      if (checked) {
        next.add(normalizedId);
      } else {
        next.delete(normalizedId);
      }
      return Array.from(next);
    });
  }

  function toggleBundle(bundle, checked) {
    const bundleItemIds = (bundle?.items ?? [])
      .map((item) => Number(item.id))
      .filter((id) => Number.isFinite(id));

    setSelectedCartItemIds((prev) => {
      const next = new Set(prev.map((id) => Number(id)));
      for (const itemId of bundleItemIds) {
        if (checked) {
          next.add(itemId);
        } else {
          next.delete(itemId);
        }
      }
      return Array.from(next);
    });
  }

  function beginCreateAddress() {
    setEditingAddressId(null);
    setIsAddressFormOpen(true);
    setAddressForm({
      label: "",
      receiverName: "",
      phoneNumber: "",
      addressLine: "",
      isDefault: addresses.length === 0,
    });
    setAddressError("");
    setAddressMessage("");
  }

  function beginEditAddress() {
    if (!selectedAddress) {
      setAddressError("Hãy chọn địa chỉ để sửa");
      return;
    }

    setEditingAddressId(selectedAddress.id);
    setIsAddressFormOpen(true);
    setAddressForm({
      label: selectedAddress.label || "",
      receiverName: selectedAddress.receiverName || "",
      phoneNumber: selectedAddress.phoneNumber || "",
      addressLine: selectedAddress.addressLine || "",
      isDefault: Boolean(selectedAddress.isDefault),
    });
    setAddressError("");
    setAddressMessage("");
  }

  async function submitAddressForm() {
    setAddressError("");
    setAddressMessage("");

    try {
      const receiverNameError = validateDisplayName(addressForm.receiverName);
      if (receiverNameError) {
        throw new Error(receiverNameError);
      }

      const phoneError = validateVietnamPhone(addressForm.phoneNumber, true);
      if (phoneError) {
        throw new Error(phoneError);
      }

      const normalizedAddressLine = String(addressForm.addressLine ?? "").trim();
      if (!normalizedAddressLine) {
        throw new Error("Địa chỉ không được trống");
      }

      if (normalizedAddressLine.length < 5) {
        throw new Error("Địa chỉ phải có ít nhất 5 ký tự");
      }

      const payload = {
        label: String(addressForm.label ?? "").trim(),
        receiverName: String(addressForm.receiverName ?? "").trim(),
        phoneNumber: String(addressForm.phoneNumber ?? "").trim(),
        addressLine: normalizedAddressLine,
        isDefault: addressForm.isDefault,
      };

      const result = editingAddressId
        ? await profileApi.updateAddress(editingAddressId, payload)
        : await profileApi.createAddress(payload);

      setAddressMessage(editingAddressId ? "Đã cập nhật địa chỉ" : "Đã thêm địa chỉ mới");
      setEditingAddressId(null);
      setIsAddressFormOpen(false);
      await loadAddresses();
      if (result?.id) {
        setSelectedAddressId(String(result.id));
        setShippingAddress(result.addressLine || "");
        setPhoneNumber(result.phoneNumber || "");
      }
    } catch (error) {
      setAddressError(error instanceof Error ? error.message : "Lưu địa chỉ thất bại");
    }
  }

  async function deleteSelectedAddress() {
    if (!selectedAddress) {
      return;
    }

    try {
      setAddressError("");
      setAddressMessage("");
      await profileApi.deleteAddress(selectedAddress.id);
      setAddressMessage("Đã xóa địa chỉ");
      await loadAddresses();
    } catch (error) {
      setAddressError(error instanceof Error ? error.message : "Xóa địa chỉ thất bại");
    }
  }

  async function fillAddressFromGps(target = "checkout") {
    setAddressError("");
    setCheckoutError("");

    try {
      setIsLocatingAddress(true);
      const { latitude, longitude } = await getBrowserCoordinates();
      const resolvedAddress = await reverseGeocodeByCoordinates(latitude, longitude);

      if (target === "form") {
        setAddressForm((prev) => ({ ...prev, addressLine: resolvedAddress }));
      } else {
        setSelectedAddressId("");
        setShippingAddress(resolvedAddress);
      }
    } catch (error) {
      const fallbackMessage =
        target === "form"
          ? "Không thể lấy địa chỉ từ GPS"
          : "Không thể lấy địa chỉ giao hàng từ GPS";
      const message = error instanceof Error ? error.message : fallbackMessage;
      if (target === "form") {
        setAddressError(message);
      } else {
        setCheckoutError(message);
      }
    } finally {
      setIsLocatingAddress(false);
    }
  }

  async function applyProductVoucher() {
    setProductVoucherFeedback("");
    setProductVoucherError("");

    try {
      if (selectedCartItemIds.length === 0) {
        throw new Error("Hãy chọn ít nhất 1 sản phẩm hoặc combo để áp voucher");
      }

      const data = await previewPricing({
        productCouponCode: productVoucherCode.trim() || undefined,
        shippingCouponCode: shippingVoucherCode.trim() || undefined,
        selectedCartItemIds,
        addressId: selectedAddressId ? Number(selectedAddressId) : undefined,
        shippingAddress,
        provider: shippingProvider,
        paymentMethod,
      });
      setPricingPreview(data);
      if (data?.appliedCoupon?.code) {
        setProductVoucherFeedback(`Đã áp mã ${data.appliedCoupon.code}`);
      } else {
        setProductVoucherFeedback("Không áp dụng voucher sản phẩm");
      }
    } catch (error) {
      setPricingPreview(null);
      setProductVoucherError(
        formatVoucherError(error instanceof Error ? error.message : "Áp voucher thất bại"),
      );
    }
  }

  async function applyShippingVoucher() {
    setShippingVoucherFeedback("");
    setShippingVoucherError("");

    try {
      if (selectedCartItemIds.length === 0) {
        throw new Error("Hãy chọn ít nhất 1 sản phẩm hoặc combo để áp voucher");
      }

      const data = await previewPricing({
        productCouponCode: productVoucherCode.trim() || undefined,
        shippingCouponCode: shippingVoucherCode.trim() || undefined,
        selectedCartItemIds,
        addressId: selectedAddressId ? Number(selectedAddressId) : undefined,
        shippingAddress,
        provider: shippingProvider,
        paymentMethod,
      });
      setPricingPreview(data);
      if (data?.appliedShippingCoupon?.code) {
        setShippingVoucherFeedback(`Đã áp mã ${data.appliedShippingCoupon.code}`);
      } else {
        setShippingVoucherFeedback("Không áp dụng voucher vận chuyển");
      }
    } catch (error) {
      setPricingPreview(null);
      setShippingVoucherError(
        formatVoucherError(
          error instanceof Error ? error.message : "Áp voucher vận chuyển thất bại",
        ),
      );
    }
  }

  async function clearProductVoucher() {
    setProductVoucherCode("");
    setProductVoucherFeedback("");
    setProductVoucherError("");

    try {
      const data = await previewPricing({
        productCouponCode: undefined,
        shippingCouponCode: shippingVoucherCode.trim() || undefined,
        selectedCartItemIds,
        addressId: selectedAddressId ? Number(selectedAddressId) : undefined,
        shippingAddress,
        provider: shippingProvider,
        paymentMethod,
      });
      setPricingPreview(data);
      setProductVoucherFeedback("Đã bỏ chọn voucher sản phẩm");
    } catch (_error) {
      setPricingPreview(null);
      setProductVoucherFeedback("Đã bỏ chọn voucher sản phẩm");
    }
  }

  async function clearShippingVoucher() {
    setShippingVoucherCode("");
    setShippingVoucherFeedback("");
    setShippingVoucherError("");

    try {
      const data = await previewPricing({
        productCouponCode: productVoucherCode.trim() || undefined,
        shippingCouponCode: undefined,
        selectedCartItemIds,
        addressId: selectedAddressId ? Number(selectedAddressId) : undefined,
        shippingAddress,
        provider: shippingProvider,
        paymentMethod,
      });
      setPricingPreview(data);
      setShippingVoucherFeedback("Đã bỏ chọn voucher vận chuyển");
    } catch (_error) {
      setPricingPreview(null);
      setShippingVoucherFeedback("Đã bỏ chọn voucher vận chuyển");
    }
  }

  const formatPrice = (price) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
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
              <h2 className="font-display text-2xl font-bold mb-2">
                Giỏ hàng trống
              </h2>
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
    <>
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
                  {selectedItems.length}/{items.length} sản phẩm được chọn để thanh toán
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/70 px-3 py-2 text-sm">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={(event) => toggleSelectAll(event.target.checked)}
                  />
                  Chọn tất cả
                </label>
                <Button
                  variant="ghost"
                  className="text-destructive"
                  onClick={clearCart}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Xóa tất cả
                </Button>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Left - Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                {bundleGroups.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Combo đã chọn</Badge>
                      <span className="text-sm text-muted-foreground">
                        {bundleGroups.length} combo
                      </span>
                    </div>

                    {bundleGroups.map((bundle, index) => {
                      const bundleChecked = bundle.items.every((item) =>
                        selectedCartItemIdSet.has(Number(item.id)),
                      );

                      return (
                        <Card
                          key={bundle.id}
                          className="glass border-primary/20 p-4"
                          data-aos="fade-up"
                          data-aos-delay={Math.min(index * 80, 320)}
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={bundleChecked}
                                onChange={(event) => toggleBundle(bundle, event.target.checked)}
                              />
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-primary">
                                  Combo
                                </p>
                                <h3 className="font-display text-lg font-semibold">
                                  {bundle.name}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                  {bundle.items.length} linh kiện
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="bg-primary text-primary-foreground">
                                {formatPrice(bundle.totalPrice)}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                disabled={removingBundleId === String(bundle.id)}
                                onClick={async () => {
                                  try {
                                    setRemovingBundleId(String(bundle.id));
                                    await removeBundle(bundle.id);
                                  } catch (error) {
                                    setCheckoutError(
                                      error instanceof Error
                                        ? error.message
                                        : "Không thể xóa combo",
                                    );
                                  } finally {
                                    setRemovingBundleId("");
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {bundle.items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/70 px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium">
                                    {item.component.name}
                                  </p>
                                  <p className="truncate text-xs text-muted-foreground">
                                    {item.component.brand}
                                  </p>
                                </div>
                                <span className="text-sm font-semibold text-primary">
                                  {formatPrice(item.component.price)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}

                {standaloneItems.length > 0 && (
                  <div className="space-y-4">
                    {bundleGroups.length > 0 && (
                      <p className="text-sm font-medium text-muted-foreground">
                        Linh kiện lẻ
                      </p>
                    )}

                    {standaloneItems.map((item, index) => (
                      <Card
                        key={item.id}
                        className="glass border-border/50 p-4"
                        data-aos="flip-right"
                        data-aos-delay={Math.min(index * 80, 320)}
                      >
                        <div className="flex gap-4">
                          <div className="w-24 h-24 bg-secondary/50 rounded-lg flex-shrink-0 overflow-hidden">
                            <img
                              src={item.component.image}
                              alt={item.component.name}
                              className="w-full h-full object-contain p-2"
                            />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <input
                                  type="checkbox"
                                  className="mt-1"
                                  checked={selectedCartItemIdSet.has(Number(item.id))}
                                  onChange={(event) =>
                                    toggleStandaloneItem(item.id, event.target.checked)
                                  }
                                />
                                <div>
                                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                                    {item.component.brand}
                                  </p>
                                  <h3 className="font-semibold line-clamp-1">
                                    {item.component.name}
                                  </h3>
                                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground mt-1">
                                    <Package className="w-3 h-3" />
                                    Tồn kho: {item.component.stock}
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive"
                                onClick={() => removeFromCart(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>

                            <div className="flex items-center justify-between mt-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                >
                                  <Minus className="w-3 h-3" />
                                </Button>
                                <span className="w-8 text-center font-medium">
                                  {item.quantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                >
                                  <Plus className="w-3 h-3" />
                                </Button>
                              </div>

                              <p className="text-lg font-bold text-primary">
                                {formatPrice(item.component.price * item.quantity)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* Right - Order Summary */}
              <div className="lg:col-span-1">
                <Card className="glass border-primary/20 p-6 sticky top-24">
                  <h2 className="font-display text-xl font-bold mb-6">
                    Tóm tắt đơn hàng
                  </h2>

                  <div className="space-y-4 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Đã chọn</span>
                      <span>
                        {selectedItems.length} món / {selectedBundleCount} combo
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tạm tính</span>
                      <span>{formatPrice(Number(pricingPreview?.subtotal ?? selectedSubtotal))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Giảm giá sản phẩm</span>
                      <span className="text-emerald-600">
                        -{formatPrice(Number(pricingPreview?.discountAmount ?? 0))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        Phí vận chuyển
                      </span>
                      <span className="text-storage">
                        {formatPrice(
                          Number(
                            pricingPreview?.shippingFee ??
                              shippingEstimate?.estimatedFee ??
                              0,
                          ),
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Giảm phí vận chuyển</span>
                      <span className="text-emerald-600">
                        -{formatPrice(Number(pricingPreview?.shippingDiscountAmount ?? 0))}
                      </span>
                    </div>
                    {shippingEstimate?.estimatedDeliveryText && (
                      <div className="text-xs text-muted-foreground text-right">
                        Dự kiến giao: {shippingEstimate.estimatedDeliveryText}
                      </div>
                    )}
                    {shippingEstimateError && (
                      <p className="text-xs text-destructive text-right">{shippingEstimateError}</p>
                    )}
                  </div>

                  <Separator className="mb-4" />

                  <div className="flex justify-between mb-6">
                    <span className="font-semibold">Tổng cộng</span>
                    <span className="text-2xl font-bold text-gradient-primary">
                      {formatPrice(
                        Number(
                          pricingPreview?.totalAmount ??
                            selectedSubtotal + Number(shippingEstimate?.estimatedFee ?? 0),
                        ),
                      )}
                    </span>
                  </div>

                  <div className="mb-6 rounded-lg border border-border/70 p-3 space-y-2">
                    <p className="text-sm font-medium">Đơn vị vận chuyển</p>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={shippingProvider}
                      onChange={(event) => setShippingProvider(event.target.value)}
                    >
                      <option value="GHN">Giao Hàng Nhanh (GHN)</option>
                      <option value="VIETTEL_POST">Viettel Post</option>
                    </select>
                  </div>

                  <div className="mb-6 rounded-lg border border-border/70 p-3 space-y-4">
                    <p className="text-sm font-medium">Voucher giảm giá sản phẩm</p>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={productVoucherCode}
                      onChange={(event) => {
                        setProductVoucherCode(event.target.value.toUpperCase());
                      }}
                    >
                      <option value="">Không chọn voucher sản phẩm</option>
                      {availableProductCoupons.map((coupon) => (
                        <option key={`product-coupon-${coupon.id}`} value={coupon.code}>
                          {coupon.code} - giảm {formatPrice(Number(coupon.estimatedDiscountAmount ?? 0))}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nhập mã giảm giá sản phẩm"
                        value={productVoucherCode}
                        onChange={(event) => setProductVoucherCode(event.target.value.toUpperCase())}
                      />
                      <Button type="button" variant="outline" onClick={applyProductVoucher}>
                        Áp dụng
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={clearProductVoucher}
                        disabled={!productVoucherCode && !pricingPreview?.appliedCoupon?.code}
                      >
                        Bỏ chọn
                      </Button>
                    </div>
                    {productVoucherFeedback && (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{productVoucherFeedback}</span>
                      </div>
                    )}
                    {productVoucherError && (
                      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{productVoucherError}</span>
                      </div>
                    )}

                    <Separator />

                    <p className="text-sm font-medium">Voucher giảm phí vận chuyển</p>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={shippingVoucherCode}
                      onChange={(event) => {
                        setShippingVoucherCode(event.target.value.toUpperCase());
                      }}
                    >
                      <option value="">Không chọn voucher vận chuyển</option>
                      {availableShippingCoupons.map((coupon) => (
                        <option key={`shipping-coupon-${coupon.id}`} value={coupon.code}>
                          {coupon.code} - giảm {formatPrice(Number(coupon.estimatedDiscountAmount ?? 0))}
                        </option>
                      ))}
                    </select>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Nhập mã giảm phí vận chuyển"
                        value={shippingVoucherCode}
                        onChange={(event) => setShippingVoucherCode(event.target.value.toUpperCase())}
                      />
                      <Button type="button" variant="outline" onClick={applyShippingVoucher}>
                        Áp dụng
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={clearShippingVoucher}
                        disabled={!shippingVoucherCode && !pricingPreview?.appliedShippingCoupon?.code}
                      >
                        Bỏ chọn
                      </Button>
                    </div>
                    {shippingVoucherFeedback && (
                      <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-700 flex items-start gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{shippingVoucherFeedback}</span>
                      </div>
                    )}
                    {shippingVoucherError && (
                      <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{shippingVoucherError}</span>
                      </div>
                    )}
                  </div>

                  <div className="mb-6 rounded-lg border border-border/70 p-3 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Địa chỉ giao hàng</p>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={beginCreateAddress}>
                          Thêm địa chỉ
                        </Button>
                        <Button variant="outline" size="sm" onClick={beginEditAddress}>
                          Sửa địa chỉ
                        </Button>
                      </div>
                    </div>

                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={selectedAddressId}
                      onChange={(event) => {
                        const nextId = event.target.value;
                        setSelectedAddressId(nextId);
                        const nextAddress = addresses.find(
                          (item) => String(item.id) === String(nextId),
                        );
                        if (nextAddress) {
                          setShippingAddress(nextAddress.addressLine || "");
                          setPhoneNumber(nextAddress.phoneNumber || "");
                        }
                      }}
                      disabled={addressesLoading || addresses.length === 0}
                    >
                      {addresses.length === 0 ? (
                        <option value="">Chưa có địa chỉ nào, hãy thêm mới</option>
                      ) : (
                        addresses.map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.isDefault ? "[Mặc định] " : ""}
                            {(item.label ? `${item.label} - ` : "") + item.addressLine}
                          </option>
                        ))
                      )}
                    </select>

                    {(isAddressFormOpen || addresses.length === 0) && (
                      <div className="space-y-2 rounded-md border border-border/50 p-3">
                        <Input
                          placeholder="Nhãn địa chỉ (Nhà riêng, Công ty...)"
                          value={addressForm.label}
                          onChange={(event) =>
                            setAddressForm((prev) => ({ ...prev, label: event.target.value }))
                          }
                        />
                        <Input
                          placeholder="Tên người nhận"
                          value={addressForm.receiverName}
                          onChange={(event) =>
                            setAddressForm((prev) => ({ ...prev, receiverName: event.target.value }))
                          }
                        />
                        <Input
                          placeholder="Số điện thoại"
                          value={addressForm.phoneNumber}
                          onChange={(event) =>
                            setAddressForm((prev) => ({ ...prev, phoneNumber: event.target.value.replace(/\D/g, "").slice(0, 10) }))
                          }
                        />
                        <Input
                          placeholder="Địa chỉ đầy đủ"
                          value={addressForm.addressLine}
                          onChange={(event) =>
                            setAddressForm((prev) => ({ ...prev, addressLine: event.target.value }))
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isLocatingAddress}
                          onClick={() => fillAddressFromGps("form")}
                          className="w-full gap-2"
                        >
                          {isLocatingAddress ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Navigation className="w-4 h-4" />
                          )}
                          Dùng GPS điền địa chỉ
                        </Button>
                        <label className="flex items-center gap-2 text-xs">
                          <input
                            type="checkbox"
                            checked={addressForm.isDefault}
                            onChange={(event) =>
                              setAddressForm((prev) => ({ ...prev, isDefault: event.target.checked }))
                            }
                          />
                          Đặt làm địa chỉ mặc định
                        </label>
                        <div className="flex gap-2">
                          <Button type="button" variant="hero" size="sm" onClick={submitAddressForm}>
                            {editingAddressId ? "Lưu địa chỉ" : "Thêm địa chỉ"}
                          </Button>
                          {(editingAddressId !== null || isAddressFormOpen) && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingAddressId(null);
                                setIsAddressFormOpen(false);
                              }}
                            >
                              Hủy
                            </Button>
                          )}
                          {selectedAddress && (
                            <Button type="button" variant="ghost" size="sm" onClick={deleteSelectedAddress}>
                              Xóa địa chỉ đang chọn
                            </Button>
                          )}
                        </div>
                      </div>
                    )}

                    {addressMessage && <p className="text-xs text-emerald-600">{addressMessage}</p>}
                    {addressError && <p className="text-xs text-destructive">{addressError}</p>}
                  </div>

                  <div className="flex gap-2 mb-6">
                    <Input
                      placeholder="Số điện thoại liên hệ"
                      value={phoneNumber}
                      onChange={(event) => {
                        setSelectedAddressId("");
                        setPhoneNumber(event.target.value.replace(/\D/g, "").slice(0, 10));
                      }}
                    />
                  </div>
                  <div className="flex gap-2 mb-6">
                    <Input
                      placeholder="Địa chỉ giao hàng (khi chưa chọn sổ địa chỉ)"
                      value={shippingAddress}
                      onChange={(event) => {
                        setSelectedAddressId("");
                        setShippingAddress(event.target.value);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isLocatingAddress}
                      onClick={() => fillAddressFromGps("checkout")}
                      className="gap-2"
                    >
                      {isLocatingAddress ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Navigation className="w-4 h-4" />
                      )}
                      GPS
                    </Button>
                  </div>

                  <div className="mb-6 rounded-lg border border-emerald-200 bg-emerald-50/60 p-3">
                    <p className="mb-1 text-sm font-semibold text-emerald-900">Phương thức thanh toán</p>
                    <select
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={paymentMethod}
                      onChange={(event) => setPaymentMethod(event.target.value)}
                    >
                      <option value="PAYOS">PayOS (thanh toán online)</option>
                      <option value="VNPAY">VNPAY QR</option>
                      <option value="COD">Thanh toán khi nhận hàng (COD)</option>
                    </select>
                  </div>

                  <Button
                    variant="hero"
                    className="w-full gap-2"
                    disabled={selectedCartItemIds.length === 0}
                    onClick={async () => {
                      setCheckoutMessage("");
                      setCheckoutError("");

                      try {
                        if (!isAuthenticated) {
                          toast({
                            title: "Cần đăng nhập để mua hàng",
                            description: "Bạn vẫn có thể thêm giỏ, nhưng cần đăng nhập khi đặt hàng.",
                            variant: "destructive",
                          });
                          navigate("/login", { replace: false });
                          return;
                        }

                        const checkoutPhoneError = validateVietnamPhone(phoneNumber, true);
                        if (checkoutPhoneError) {
                          throw new Error(checkoutPhoneError);
                        }

                        const normalizedShippingAddress = String(shippingAddress ?? "").trim();
                        if (!normalizedShippingAddress) {
                          throw new Error("Địa chỉ giao hàng không được để trống");
                        }
                        if (normalizedShippingAddress.length < 5) {
                          throw new Error("Địa chỉ giao hàng phải có ít nhất 5 ký tự");
                        }

                        if (selectedCartItemIds.length === 0) {
                          throw new Error("Vui lòng chọn sản phẩm hoặc combo để thanh toán");
                        }

                        const result = await checkout({
                          shippingAddress,
                          phoneNumber,
                          paymentMethod,
                          addressId: selectedAddressId ? Number(selectedAddressId) : undefined,
                          productCouponCode:
                            pricingPreview?.appliedCoupon?.code ??
                            (productVoucherCode.trim() || undefined),
                          shippingCouponCode:
                            pricingPreview?.appliedShippingCoupon?.code ??
                            (shippingVoucherCode.trim() || undefined),
                          provider: shippingProvider,
                          useWalletBalance: false,
                          selectedCartItemIds,
                        });

                        if (result?.isWalletPaymentOnly) {
                          setCheckoutMessage(`Thanh toán thành công. Mã đơn #${result.orderId}`);
                          await removeCartItemsByIds(selectedCartItemIds);
                          return;
                        }

                        if (paymentMethod === "VNPAY" && result?.isMockPayment) {
                          navigate("/payment-qr", {
                            state: {
                              paymentData: result,
                            },
                          });
                          return;
                        }

                        if (paymentMethod === "VNPAY" && result?.paymentUrl) {
                          window.location.href = result.paymentUrl;
                          return;
                        }

                        if (paymentMethod === "PAYOS" && result?.checkoutUrl) {
                          navigate("/payment-payos", {
                            state: {
                              paymentData: result,
                            },
                          });
                          return;
                        }

                        setCheckoutMessage(`Đặt hàng thành công. Mã đơn #${result.orderId}`);
                      } catch (error) {
                        setCheckoutError(error instanceof Error ? error.message : "Thanh toán thất bại");
                      }
                    }}
                  >
                    {paymentMethod === "COD" ? "Đặt hàng COD" : "Thanh toán"}
                    <ArrowRight className="w-4 h-4" />
                  </Button>

                  {checkoutMessage && (
                    <p className="text-xs text-emerald-600 text-center mt-3">{checkoutMessage}</p>
                  )}
                  {checkoutError && (
                    <p className="text-xs text-destructive text-center mt-3">{checkoutError}</p>
                  )}

                  <p className="text-xs text-muted-foreground text-center mt-4">
                    Bằng việc đặt hàng, bạn đồng ý với điều khoản sử dụng
                  </p>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}

function validateDisplayName(value) {
  const name = String(value ?? "").trim();
  if (!name) {
    return "Tên người nhận không được để trống";
  }
  if (name.length < 2 || name.length > 100) {
    return "Tên người nhận phải từ 2 đến 100 ký tự";
  }
  if (/\d/.test(name)) {
    return "Tên người nhận không được chứa số";
  }
  return "";
}

function formatVoucherError(message) {
  const normalized = String(message ?? "").trim().toLowerCase();

  if (!normalized) {
    return "Áp voucher thất bại. Vui lòng thử lại.";
  }

  if (normalized.includes("not found")) {
    return "Mã voucher không tồn tại. Bạn hãy kiểm tra lại mã.";
  }

  if (normalized.includes("out of date") || normalized.includes("expired")) {
    return "Mã voucher đã hết hạn hoặc chưa đến thời gian áp dụng.";
  }

  if (normalized.includes("usage limit")) {
    return "Mã voucher đã hết lượt sử dụng.";
  }

  if (normalized.includes("scope mismatch")) {
    return "Mã voucher không đúng loại (sản phẩm hoặc vận chuyển).";
  }

  if (normalized.includes("khong duoc phep") || normalized.includes("không được phép")) {
    return "Tài khoản của bạn không nằm trong danh sách được dùng mã này.";
  }

  if (normalized.includes("at least")) {
    return "Đơn hàng chưa đạt giá trị tối thiểu để áp dụng voucher.";
  }

  return message;
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

function validateVietnamPhone(value, required = false) {
  const phone = String(value ?? "").trim();
  if (!phone) {
    return required ? "Số điện thoại không được để trống" : "";
  }
  if (!/^\d{10}$/.test(phone)) {
    return "Số điện thoại phải đúng 10 chữ số";
  }
  return "";
}

function groupCartBundles(items, bundles) {
  if (!Array.isArray(items) || !Array.isArray(bundles)) {
    return [];
  }

  const itemByProductId = new Map(
    items.map((item) => [String(item.component?.id ?? item.productId ?? item.id), item]),
  );

  return bundles
    .map((bundle) => {
      const expectedCount = Array.isArray(bundle.items) ? bundle.items.length : 0;
      const bundleItems = Array.isArray(bundle.items)
        ? bundle.items
          .map((bundleItem) => itemByProductId.get(String(bundleItem.productId)))
          .filter(Boolean)
        : [];

      if (bundleItems.length === 0 || bundleItems.length !== expectedCount) {
        return null;
      }

      return {
        ...bundle,
        items: bundleItems,
      };
    })
    .filter(Boolean);
}


