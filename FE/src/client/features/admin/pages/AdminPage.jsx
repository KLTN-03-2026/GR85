import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Building2,
  ChevronRight,
  ClipboardList,
  ImagePlus,
  LayoutDashboard,
  MailCheck,
  MessageSquareMore,
  Package,
  Pencil,
  Plus,
  ShieldCheck,
  Sparkles,
  Star,
  TicketPercent,
  Trash2,
  Users,
  Warehouse,
} from "lucide-react";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const navItems = [
  { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { id: "users", label: "Người dùng", icon: Users },
  { id: "products", label: "Sản phẩm", icon: Package },
  { id: "orders", label: "Đơn hàng", icon: ClipboardList },
  { id: "catalog", label: "Danh mục & NCC", icon: Building2 },
  { id: "vouchers", label: "Mã giảm giá", icon: TicketPercent },
  { id: "warehouse", label: "Kho", icon: Warehouse },
  { id: "reviews", label: "Đánh giá", icon: Star },
  { id: "chat", label: "Chat", icon: MessageSquareMore },
  { id: "ai-build", label: "Cấu hình AI", icon: Sparkles },
  { id: "verification", label: "Email OTP", icon: MailCheck },
  { id: "roles", label: "Phân quyền", icon: ShieldCheck },
].map((item) => ({
  ...item,
  hash: `#${slugifyTabLabel(item.label)}`,
}));

const schemaBySection = {
  dashboard: {
    headline: "Toan canh du lieu he thong",
    tables: [
      "Users",
      "Products",
      "Orders",
      "Order_Items",
      "Coupons",
      "Reviews",
      "Chat_Rooms",
      "Wallet_Transactions",
    ],
    relations: [
      "Users 1 - n Orders",
      "Orders 1 - n Order_Items",
      "Products 1 - n Order_Items",
      "Users 1 - n Reviews",
      "Users 1 - n Chat_Rooms",
    ],
  },
  users: {
    headline: "Du lieu nguoi dung va phan quyen",
    tables: ["Users", "Roles", "Permissions", "Role_Permissions", "User_Addresses"],
    relations: [
      "Roles 1 - n Users",
      "Roles n - n Permissions qua Role_Permissions",
      "Users 1 - n User_Addresses",
    ],
  },
  products: {
    headline: "Du lieu quan ly san pham",
    tables: ["Products", "Categories", "Suppliers", "Product_Details", "Product_Images"],
    relations: [
      "Categories 1 - n Products",
      "Suppliers 1 - n Products",
      "Products 1 - 1 Product_Details",
      "Products 1 - n Product_Images",
    ],
  },
  orders: {
    headline: "Du lieu don hang va thanh toan",
    tables: ["Orders", "Order_Items", "Order_Status_History", "Users", "Coupons", "Wallet_Transactions"],
    relations: [
      "Users 1 - n Orders",
      "Orders 1 - n Order_Items",
      "Orders 1 - n Order_Status_History",
      "Coupons 1 - n Orders",
      "Orders 1 - n Wallet_Transactions",
    ],
  },
  catalog: {
    headline: "Du lieu danh muc va nha cung cap",
    tables: ["Categories", "Suppliers", "Products", "Batches"],
    relations: [
      "Categories 1 - n Products",
      "Suppliers 1 - n Products",
      "Suppliers 1 - n Batches",
    ],
  },
  vouchers: {
    headline: "Du lieu ma giam gia",
    tables: ["Coupons", "Orders"],
    relations: [
      "Coupons 1 - n Orders",
      "Orders su dung coupon qua coupon_id",
    ],
  },
  warehouse: {
    headline: "Du lieu kho va serial",
    tables: ["Warehouses", "Batches", "Serial_Numbers", "Products", "Suppliers"],
    relations: [
      "Warehouses 1 - n Batches",
      "Products 1 - n Batches",
      "Suppliers 1 - n Batches",
      "Batches 1 - n Serial_Numbers",
    ],
  },
  reviews: {
    headline: "Du lieu danh gia",
    tables: ["Reviews", "Users", "Products"],
    relations: [
      "Users 1 - n Reviews",
      "Products 1 - n Reviews",
    ],
  },
  chat: {
    headline: "Du lieu chat ho tro",
    tables: ["Chat_Rooms", "Messages", "Users"],
    relations: [
      "Users 1 - n Chat_Rooms",
      "Chat_Rooms 1 - n Messages",
      "Users 1 - n Messages",
    ],
  },
  "ai-build": {
    headline: "Du lieu cau hinh AI",
    tables: ["AI_Saved_Builds", "AI_Build_Items", "Users", "Products"],
    relations: [
      "Users 1 - n AI_Saved_Builds",
      "AI_Saved_Builds 1 - n AI_Build_Items",
      "Products 1 - n AI_Build_Items",
    ],
  },
  verification: {
    headline: "Du lieu OTP xac minh email",
    tables: ["Email_Verifications"],
    relations: ["Bang luu OTP theo email, muc dich, thoi gian het han"],
  },
  roles: {
    headline: "Du lieu vai tro va quyen he thong",
    tables: ["Roles", "Permissions", "Role_Permissions", "Users"],
    relations: [
      "Roles n - n Permissions qua Role_Permissions",
      "Roles 1 - n Users",
    ],
  },
};

export default function AdminPage() {
  const { token, isAuthenticated, isHydrated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [dashboard, setDashboard] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [savingUserId, setSavingUserId] = useState(null);
  const [userDraftById, setUserDraftById] = useState({});
  const [adminOrders, setAdminOrders] = useState([]);
  const [selectedOrderUserFilter, setSelectedOrderUserFilter] = useState(null);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [statusDraftByOrder, setStatusDraftByOrder] = useState({});
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [catalogBrands, setCatalogBrands] = useState([]);
  const [managedProducts, setManagedProducts] = useState([]);
  const [managedProductPage, setManagedProductPage] = useState(1);
  const [managedProductKeywordInput, setManagedProductKeywordInput] = useState("");
  const [managedProductKeyword, setManagedProductKeyword] = useState("");
  const [managedProductCategory, setManagedProductCategory] = useState("all");
  const [managedProductBrand, setManagedProductBrand] = useState("all");
  const [managedProductPagination, setManagedProductPagination] = useState({
    page: 1,
    pageSize: 12,
    totalItems: 0,
    totalPages: 1,
  });
  const [editingProductId, setEditingProductId] = useState(null);
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [isSavingProduct, setIsSavingProduct] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [isSavingVoucher, setIsSavingVoucher] = useState(false);
  const [selectedSummaryCard, setSelectedSummaryCard] = useState("users");
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [isLoadingUserDetail, setIsLoadingUserDetail] = useState(false);
  const [isSavingUserDetail, setIsSavingUserDetail] = useState(false);
  const [selectedUserDraft, setSelectedUserDraft] = useState(null);
  const [voucherForm, setVoucherForm] = useState({
    code: "",
    discountType: "PERCENT",
    discountValue: "",
    minOrderValue: "0",
    usageLimit: "100",
    startDate: "",
    endDate: "",
    status: "ACTIVE",
  });
  const [productForm, setProductForm] = useState({
    name: "",
    productCode: "",
    categorySlug: "",
    supplierId: "",
    price: "",
    stockQuantity: "",
    warrantyMonths: "12",
    imageUrl: "",
    specificationsText: '{\n  "brand": "",\n  "model": ""\n}',
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const rawHash = normalizeHash(window.location.hash || "");
    if (!rawHash) {
      return;
    }

    const targetItem = navItems.find(
      (item) => item.hash === rawHash || `#${item.id}` === rawHash,
    );

    if (targetItem) {
      setActiveTab(targetItem.id);
    }
  }, []);

  useEffect(() => {
    const targetHash = navItems.find((item) => item.id === activeTab)?.hash;
    if (!targetHash || normalizeHash(window.location.hash || "") === targetHash) {
      return;
    }

    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${window.location.search}${targetHash}`,
    );
  }, [activeTab]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !token) {
      return;
    }

    let cancelled = false;

    async function loadDashboard() {
      setIsLoading(true);
      try {
        const response = await fetch("/api/admin/dashboard", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.message || "Không tải được dữ liệu quản trị");
        }

        const payload = await response.json();
        if (!cancelled) {
          setDashboard(payload);
          setUserDraftById(
            Object.fromEntries(
              (payload?.users ?? []).map((item) => [
                item.id,
                {
                  fullName: item.fullName ?? "",
                  email: item.email ?? "",
                  phone: item.phone ?? "",
                  address: item.address ?? "",
                  avatarUrl: item.avatarUrl ?? "",
                  roleId: item.roleId ? String(item.roleId) : "",
                  status: item.status ?? "ACTIVE",
                },
              ]),
            ),
          );
        }
      } catch (error) {
        if (!cancelled) {
          setDashboard(null);
          toast({
            title: "Không tải được dữ liệu",
            description:
              error instanceof Error ? error.message : "Đã xảy ra lỗi",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadDashboard();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isHydrated, token, toast]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !token) {
      return;
    }

    let cancelled = false;

    async function loadCatalogMeta() {
      try {
        const response = await fetch("/api/products/overview");
        if (!response.ok) {
          throw new Error("Không tải được danh mục sản phẩm");
        }

        const payload = await response.json();
        if (!cancelled) {
          const categories = Array.isArray(payload.categories)
            ? payload.categories
            : [];
          const products = Array.isArray(payload.products) ? payload.products : [];
          const brands = Array.from(
            new Set(
              products
                .map(
                  (item) =>
                    item?.specifications?.brand ||
                    item?.supplier?.name ||
                    "PC Perfect",
                )
                .map((item) => String(item).trim())
                .filter(Boolean),
            ),
          ).sort((a, b) => a.localeCompare(b));

          setCatalogCategories(categories);
          setCatalogBrands(brands);

          setProductForm((prev) => ({
            ...prev,
            categorySlug:
              prev.categorySlug || String(categories[0]?.slug ?? ""),
          }));
        }
      } catch {
        if (!cancelled) {
          setCatalogCategories([]);
        }
      }
    }

    loadCatalogMeta();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isHydrated, token]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !token) {
      return;
    }

    let cancelled = false;

    async function loadManagedProducts() {
      try {
        const query = new URLSearchParams();
        query.set("page", String(managedProductPage));
        query.set("pageSize", "12");
        if (managedProductKeyword) {
          query.set("keyword", managedProductKeyword);
        }
        if (managedProductCategory !== "all") {
          query.set("category", managedProductCategory);
        }
        if (managedProductBrand !== "all") {
          query.set("brand", managedProductBrand);
        }

        const response = await fetch(`/api/products?${query.toString()}`);
        if (!response.ok) {
          throw new Error("Không tải được danh sách sản phẩm quản trị");
        }

        const payload = await response.json();
        if (!cancelled) {
          setManagedProducts(Array.isArray(payload.items) ? payload.items : []);
          setManagedProductPagination(
            payload.pagination ?? {
              page: 1,
              pageSize: 12,
              totalItems: 0,
              totalPages: 1,
            },
          );
        }
      } catch (error) {
        if (!cancelled) {
          setManagedProducts([]);
          setManagedProductPagination({
            page: 1,
            pageSize: 12,
            totalItems: 0,
            totalPages: 1,
          });
          toast({
            title: "Không tải được sản phẩm",
            description:
              error instanceof Error ? error.message : "Đã xảy ra lỗi",
            variant: "destructive",
          });
        }
      }
    }

    loadManagedProducts();

    return () => {
      cancelled = true;
    };
  }, [
    isAuthenticated,
    isHydrated,
    managedProductBrand,
    managedProductCategory,
    managedProductKeyword,
    managedProductPage,
    token,
    toast,
  ]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !token) {
      return;
    }

    let cancelled = false;

    async function loadOrders() {
      try {
        const response = await fetch("/api/orders", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("Không tải được danh sách đơn hàng");
        }

        const payload = await response.json();
        if (!cancelled) {
          setAdminOrders(Array.isArray(payload) ? payload : []);
          setStatusDraftByOrder(
            Object.fromEntries(
              (Array.isArray(payload) ? payload : []).map((order) => [
                order.id,
                order.orderStatus,
              ]),
            ),
          );
        }
      } catch (error) {
        if (!cancelled) {
          toast({
            title: "Không tải được đơn hàng",
            description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
            variant: "destructive",
          });
        }
      }
    }

    loadOrders();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, isHydrated, token, toast]);

  async function updateOrderStatus(orderId) {
    if (!token) {
      return;
    }

    const nextStatus = statusDraftByOrder[orderId];
    if (!nextStatus) {
      return;
    }

    setUpdatingOrderId(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Cập nhật trạng thái thất bại");
      }

      setAdminOrders((prev) =>
        prev.map((order) =>
          order.id === orderId
            ? {
                ...order,
                orderStatus: payload.orderStatus,
                updatedAt: payload.updatedAt,
              }
            : order,
        ),
      );

      toast({ title: "Đã cập nhật trạng thái đơn hàng" });
    } catch (error) {
      toast({
        title: "Không thể cập nhật",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setUpdatingOrderId(null);
    }
  }

  async function loadOrderDetail(orderId) {
    if (!token) {
      return;
    }

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Không tải được chi tiết đơn");
      }
      setSelectedOrderDetail(payload);
    } catch (error) {
      toast({
        title: "Không tải được chi tiết đơn",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    }
  }

  function startEditingUser(item) {
    setEditingUserId(item.id);
    setUserDraftById((prev) => ({
      ...prev,
      [item.id]: {
        fullName: item.fullName ?? "",
        email: item.email ?? "",
        phone: item.phone ?? "",
        address: item.address ?? "",
        avatarUrl: item.avatarUrl ?? "",
        roleId: item.roleId ? String(item.roleId) : "",
        status: item.status ?? "ACTIVE",
      },
    }));
  }

  function cancelEditingUser() {
    setEditingUserId(null);
  }

  async function saveUser(userId) {
    if (!token) {
      return;
    }

    const draft = userDraftById[userId];
    if (!draft) {
      return;
    }

    const fullNameError = validateDisplayName(draft.fullName);
    if (fullNameError) {
      toast({
        title: "Dữ liệu chưa hợp lệ",
        description: fullNameError,
        variant: "destructive",
      });
      return;
    }

    const phoneError = validateVietnamPhone(draft.phone);
    if (phoneError) {
      toast({
        title: "Dữ liệu chưa hợp lệ",
        description: phoneError,
        variant: "destructive",
      });
      return;
    }

    const emailError = validateEmail(draft.email);
    if (emailError) {
      toast({
        title: "Dữ liệu chưa hợp lệ",
        description: emailError,
        variant: "destructive",
      });
      return;
    }

    const avatarError = validateOptionalUrl(draft.avatarUrl);
    if (avatarError) {
      toast({
        title: "Dữ liệu chưa hợp lệ",
        description: avatarError,
        variant: "destructive",
      });
      return;
    }

    setSavingUserId(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: draft.fullName,
          email: draft.email?.trim(),
          phone: draft.phone?.trim() || undefined,
          address: draft.address?.trim() || null,
          avatarUrl: draft.avatarUrl?.trim() || null,
          roleId: draft.roleId ? Number(draft.roleId) : null,
          status: draft.status,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Không thể cập nhật user");
      }

      setDashboard((prev) => {
        if (!prev) {
          return prev;
        }

        return {
          ...prev,
          users: (prev.users ?? []).map((item) =>
            item.id === userId
              ? {
                  ...item,
                  fullName: payload.fullName,
                  email: payload.email,
                  phone: payload.phone,
                  address: payload.address,
                  avatarUrl: payload.avatarUrl,
                  status: payload.status,
                  roleId: payload.roleId,
                  role: payload.role,
                }
              : item,
          ),
        };
      });

      setEditingUserId(null);
      toast({ title: "Đã cập nhật thông tin người dùng" });

      if (selectedUserDetail?.id === userId) {
        setSelectedUserDetail((prev) =>
          prev
            ? {
                ...prev,
                fullName: payload.fullName,
                email: payload.email,
                phone: payload.phone,
                address: payload.address,
                avatarUrl: payload.avatarUrl,
                status: payload.status,
                roleId: payload.roleId,
                role: payload.role,
              }
            : prev,
        );
        setSelectedUserDraft((prev) =>
          prev
            ? {
                ...prev,
                fullName: payload.fullName ?? "",
                email: payload.email ?? "",
                phone: payload.phone ?? "",
                address: payload.address ?? "",
                avatarUrl: payload.avatarUrl ?? "",
                roleId: payload.roleId ? String(payload.roleId) : "",
                status: payload.status ?? "ACTIVE",
              }
            : prev,
        );
      }
    } catch (error) {
      toast({
        title: "Cập nhật thất bại",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setSavingUserId(null);
    }
  }

  async function loadUserDetail(userId) {
    if (!token) {
      return;
    }

    setIsLoadingUserDetail(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/detail`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Không tải được chi tiết người dùng");
      }

      setSelectedUserDetail(payload);
      setSelectedUserDraft({
        fullName: payload.fullName ?? "",
        email: payload.email ?? "",
        phone: payload.phone ?? "",
        address: payload.address ?? "",
        avatarUrl: payload.avatarUrl ?? "",
        roleId: payload.roleId ? String(payload.roleId) : "",
        status: payload.status ?? "ACTIVE",
      });
    } catch (error) {
      toast({
        title: "Không tải được hồ sơ người dùng",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setIsLoadingUserDetail(false);
    }
  }

  async function saveSelectedUserDetail() {
    if (!token || !selectedUserDetail?.id || !selectedUserDraft) {
      return;
    }

    const fullNameError = validateDisplayName(selectedUserDraft.fullName);
    if (fullNameError) {
      toast({
        title: "Dữ liệu chưa hợp lệ",
        description: fullNameError,
        variant: "destructive",
      });
      return;
    }

    const emailError = validateEmail(selectedUserDraft.email);
    if (emailError) {
      toast({
        title: "Dữ liệu chưa hợp lệ",
        description: emailError,
        variant: "destructive",
      });
      return;
    }

    const phoneError = validateVietnamPhone(selectedUserDraft.phone);
    if (phoneError) {
      toast({
        title: "Dữ liệu chưa hợp lệ",
        description: phoneError,
        variant: "destructive",
      });
      return;
    }

    const avatarError = validateOptionalUrl(selectedUserDraft.avatarUrl);
    if (avatarError) {
      toast({
        title: "Dữ liệu chưa hợp lệ",
        description: avatarError,
        variant: "destructive",
      });
      return;
    }

    setIsSavingUserDetail(true);
    try {
      const response = await fetch(`/api/admin/users/${selectedUserDetail.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fullName: selectedUserDraft.fullName,
          email: selectedUserDraft.email?.trim(),
          phone: selectedUserDraft.phone?.trim() || undefined,
          address: selectedUserDraft.address?.trim() || null,
          avatarUrl: selectedUserDraft.avatarUrl?.trim() || null,
          roleId: selectedUserDraft.roleId ? Number(selectedUserDraft.roleId) : null,
          status: selectedUserDraft.status,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Không thể cập nhật hồ sơ người dùng");
      }

      setDashboard((prev) => {
        if (!prev) {
          return prev;
        }

        return {
          ...prev,
          users: (prev.users ?? []).map((item) =>
            item.id === selectedUserDetail.id
              ? {
                  ...item,
                  fullName: payload.fullName,
                  email: payload.email,
                  phone: payload.phone,
                  address: payload.address,
                  avatarUrl: payload.avatarUrl,
                  status: payload.status,
                  roleId: payload.roleId,
                  role: payload.role,
                }
              : item,
          ),
        };
      });

      setSelectedUserDetail((prev) =>
        prev
          ? {
              ...prev,
              fullName: payload.fullName,
              email: payload.email,
              phone: payload.phone,
              address: payload.address,
              avatarUrl: payload.avatarUrl,
              status: payload.status,
              roleId: payload.roleId,
              role: payload.role,
            }
          : prev,
      );

      setSelectedUserDraft((prev) =>
        prev
          ? {
              ...prev,
              fullName: payload.fullName ?? "",
              email: payload.email ?? "",
              phone: payload.phone ?? "",
              address: payload.address ?? "",
              avatarUrl: payload.avatarUrl ?? "",
              roleId: payload.roleId ? String(payload.roleId) : "",
              status: payload.status ?? "ACTIVE",
            }
          : prev,
      );

      toast({ title: "Đã cập nhật đầy đủ thông tin khách hàng" });
    } catch (error) {
      toast({
        title: "Cập nhật thất bại",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setIsSavingUserDetail(false);
    }
  }

  async function uploadProductImageIfNeeded() {
    if (!selectedImageFile || !token) {
      return productForm.imageUrl.trim();
    }

    const formData = new FormData();
    formData.append("image", selectedImageFile);

    const response = await fetch("/api/products/upload-image", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      throw new Error(payload?.message ?? "Upload ảnh thất bại");
    }

    return String(payload?.imageUrl ?? "").trim();
  }

  async function refreshDashboardSummary() {
    if (!token) {
      return;
    }

    const response = await fetch("/api/admin/dashboard", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      return;
    }
    const payload = await response.json();
    setDashboard(payload);
  }

  async function refreshManagedProducts() {
    const query = new URLSearchParams();
    query.set("page", String(managedProductPage));
    query.set("pageSize", "12");
    if (managedProductKeyword) {
      query.set("keyword", managedProductKeyword);
    }
    if (managedProductCategory !== "all") {
      query.set("category", managedProductCategory);
    }
    if (managedProductBrand !== "all") {
      query.set("brand", managedProductBrand);
    }

    const response = await fetch(`/api/products?${query.toString()}`);
    if (!response.ok) {
      throw new Error("Không tải được danh sách sản phẩm quản trị");
    }

    const payload = await response.json();
    setManagedProducts(Array.isArray(payload.items) ? payload.items : []);
    setManagedProductPagination(
      payload.pagination ?? {
        page: 1,
        pageSize: 12,
        totalItems: 0,
        totalPages: 1,
      },
    );
  }

  function resetProductForm() {
    setEditingProductId(null);
    setSelectedImageFile(null);
    setProductForm({
      name: "",
      productCode: "",
      categorySlug: String(catalogCategories[0]?.slug ?? ""),
      supplierId: "",
      price: "",
      stockQuantity: "",
      warrantyMonths: "12",
      imageUrl: "",
      specificationsText: '{\n  "brand": "",\n  "model": ""\n}',
    });
  }

  function startEditingProduct(product) {
    setEditingProductId(product.id);
    setSelectedImageFile(null);
    setProductForm({
      name: String(product.name ?? ""),
      productCode: String(product.productCode ?? product.slug ?? ""),
      categorySlug: String(product.category?.slug ?? ""),
      supplierId: String(product.supplier?.id ?? ""),
      price: String(Number(product.price ?? 0)),
      stockQuantity: String(Number(product.stockQuantity ?? 0)),
      warrantyMonths: String(Number(product.warrantyMonths ?? 12)),
      imageUrl: String(product.imageUrl ?? ""),
      specificationsText: JSON.stringify(product.specifications ?? {}, null, 2),
    });
  }

  async function saveProduct() {
    if (!token) {
      return;
    }

    setIsSavingProduct(true);
    try {
      let specifications = {};
      try {
        specifications = JSON.parse(productForm.specificationsText || "{}");
      } catch {
        throw new Error("Thông số kỹ thuật phải là JSON hợp lệ");
      }

      const uploadedImageUrl = await uploadProductImageIfNeeded();
      const payload = {
        name: productForm.name.trim(),
        productCode: productForm.productCode.trim(),
        categorySlug: productForm.categorySlug,
        supplierId: productForm.supplierId
          ? Number(productForm.supplierId)
          : null,
        price: Number(productForm.price),
        stockQuantity: Number(productForm.stockQuantity),
        warrantyMonths: Number(productForm.warrantyMonths || 0),
        imageUrl: uploadedImageUrl,
        specifications,
      };

      const endpoint = editingProductId
        ? `/api/products/${editingProductId}`
        : "/api/products";
      const method = editingProductId ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const responsePayload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(responsePayload?.message ?? "Lưu sản phẩm thất bại");
      }

      toast({
        title: editingProductId ? "Đã cập nhật sản phẩm" : "Đã thêm sản phẩm mới",
      });

      resetProductForm();
      await refreshManagedProducts();
      await refreshDashboardSummary();
    } catch (error) {
      toast({
        title: "Không thể lưu sản phẩm",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setIsSavingProduct(false);
    }
  }

  async function deleteProduct(productId) {
    if (!token) {
      return;
    }

    const shouldDelete = window.confirm(
      "Bạn có chắc muốn xóa sản phẩm này? Hành động này không thể hoàn tác.",
    );
    if (!shouldDelete) {
      return;
    }

    setDeletingProductId(productId);
    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Xóa sản phẩm thất bại");
      }

      toast({ title: "Đã xóa sản phẩm" });

      if (editingProductId === productId) {
        resetProductForm();
      }

      await refreshManagedProducts();
      await refreshDashboardSummary();
    } catch (error) {
      toast({
        title: "Không thể xóa sản phẩm",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setDeletingProductId(null);
    }
  }

  async function createVoucher() {
    if (!token) {
      return;
    }

    setIsSavingVoucher(true);
    try {
      const payload = {
        code: voucherForm.code.trim().toUpperCase(),
        discountType: voucherForm.discountType,
        discountValue: Number(voucherForm.discountValue),
        minOrderValue: Number(voucherForm.minOrderValue || 0),
        usageLimit: Number(voucherForm.usageLimit || 100),
        startDate: new Date(voucherForm.startDate).toISOString(),
        endDate: new Date(voucherForm.endDate).toISOString(),
        status: voucherForm.status,
      };

      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.message ?? "Tạo voucher thất bại");
      }

      setVoucherForm({
        code: "",
        discountType: "PERCENT",
        discountValue: "",
        minOrderValue: "0",
        usageLimit: "100",
        startDate: "",
        endDate: "",
        status: "ACTIVE",
      });

      await refreshDashboardSummary();
      toast({ title: "Đã tạo voucher mới" });
    } catch (error) {
      toast({
        title: "Không thể tạo voucher",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setIsSavingVoucher(false);
    }
  }

  const orderStatusRows = useMemo(() => {
    if (!dashboard?.orderStatuses) {
      return [];
    }

    return dashboard.orderStatuses.map((item) => [
      formatEnum(item.orderStatus),
      String(item._count?.orderStatus ?? 0),
    ]);
  }, [dashboard]);

  const displayedOrders = useMemo(() => {
    if (!selectedOrderUserFilter?.id) {
      return adminOrders;
    }

    return adminOrders.filter(
      (item) => Number(item.customer?.id) === Number(selectedOrderUserFilter.id),
    );
  }, [adminOrders, selectedOrderUserFilter]);

  const totalRevenue = Number(dashboard?.summary?.totalRevenue ?? 0);
  const summaryCards = [
    {
      id: "users",
      label: "Người dùng",
      value: Number(dashboard?.summary?.totalUsers ?? 0),
    },
    {
      id: "orders",
      label: "Đơn hàng",
      value: Number(dashboard?.summary?.totalOrders ?? 0),
    },
    {
      id: "products",
      label: "Sản phẩm",
      value: Number(dashboard?.summary?.totalProducts ?? 0),
    },
    {
      id: "revenue",
      label: "Doanh thu",
      value: formatMoney(totalRevenue),
    },
  ];

  const summaryDetailByCard = useMemo(() => {
    const usersRows = (dashboard?.users ?? []).slice(0, 8).map((item) => [
      item.fullName ?? "-",
      item.email ?? "-",
      item.role?.name ?? "User",
      statusBadge(formatEnum(item.status)),
    ]);

    const ordersRows = (adminOrders ?? []).slice(0, 8).map((item) => [
      `#${item.id}`,
      item.customer?.fullName ?? item.customer?.email ?? "-",
      formatMoney(item.totalAmount),
      statusBadge(formatEnum(item.paymentStatus)),
      statusBadge(formatEnum(item.orderStatus)),
    ]);

    const productRows = (managedProducts ?? []).slice(0, 8).map((item) => [
      item.name ?? "-",
      item.productCode ?? "-",
      formatMoney(item.price),
      String(item.stockQuantity ?? 0),
    ]);

    const paidOrders = (adminOrders ?? []).filter(
      (item) => String(item.paymentStatus ?? "").toUpperCase() === "PAID",
    );
    const pendingOrders = (adminOrders ?? []).filter(
      (item) => String(item.paymentStatus ?? "").toUpperCase() === "PENDING",
    );
    const revenueRows = [
      ["Tổng doanh thu", formatMoney(totalRevenue)],
      ["Đơn đã thanh toán", String(paidOrders.length)],
      ["Đơn chờ thanh toán", String(pendingOrders.length)],
      [
        "Giá trị trung bình / đơn",
        formatMoney(paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0),
      ],
    ];

    return {
      users: {
        title: "Chi tiết người dùng",
        description: "8 người dùng mới nhất trong hệ thống",
        columns: ["Tên", "Email", "Role", "Trạng thái"],
        rows: usersRows,
      },
      orders: {
        title: "Chi tiết đơn hàng",
        description: "8 đơn hàng gần nhất",
        columns: ["Mã đơn", "Khách hàng", "Tổng tiền", "Thanh toán", "Trạng thái"],
        rows: ordersRows,
      },
      products: {
        title: "Chi tiết sản phẩm",
        description: "8 sản phẩm gần nhất từ danh sách quản trị",
        columns: ["Tên", "Mã", "Giá", "Tồn kho"],
        rows: productRows,
      },
      revenue: {
        title: "Chi tiết doanh thu",
        description: "Số liệu tổng hợp từ dashboard và đơn hàng",
        columns: ["Chỉ số", "Giá trị"],
        rows: revenueRows,
      },
    };
  }, [dashboard, adminOrders, managedProducts, totalRevenue]);

  const selectedSummaryDetail =
    summaryDetailByCard[selectedSummaryCard] ?? summaryDetailByCard.users;

  const sectionClassName = (tabId) =>
    `space-y-6 ${activeTab === tabId ? "block" : "hidden"}`;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,1)_0%,_rgba(240,253,250,1)_100%)]">
      <Navbar />

      <div className="mx-auto max-w-[1600px] px-4 pb-10 pt-24 lg:px-6">
        <aside className="hidden lg:fixed lg:top-24 lg:block lg:w-72">
          <div className="space-y-4 rounded-3xl border border-border/60 bg-white/85 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
            <h1 className="text-xl font-bold">Trang quản trị</h1>

            <div className="space-y-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  title={item.hash}
                  className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    activeTab === item.id
                      ? "bg-primary text-primary-foreground"
                      : "text-slate-700 hover:bg-secondary hover:text-primary"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </span>
                  <ChevronRight className="h-4 w-4 opacity-50" />
                </button>
              ))}
            </div>
          </div>
        </aside>

        <main className="min-w-0 space-y-6 lg:ml-[19rem]">
          <div className="lg:hidden">
            <div className="rounded-2xl border border-border/60 bg-white/85 p-3 shadow-sm">
              <label className="mb-1 block text-xs font-semibold text-muted-foreground">
                Chọn tab quản trị
              </label>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                value={activeTab}
                onChange={(event) => setActiveTab(event.target.value)}
              >
                {navItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <section id="dashboard" className={sectionClassName("dashboard")}>
            <SectionHeader
              sectionId="dashboard"
              icon={LayoutDashboard}
              title="Bảng tổng quan"
              description="Dữ liệu tổng quan từ MySQL"
            />

            {isLoading ? (
              <Panel title="Đang tải" description="Đang lấy dữ liệu từ máy chủ">
                <p className="text-sm text-muted-foreground">Vui lòng chờ trong giây lát.</p>
              </Panel>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                {summaryCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => setSelectedSummaryCard(card.id)}
                    className={`rounded-3xl border bg-white p-5 text-left shadow-sm transition ${
                      selectedSummaryCard === card.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "hover:border-primary/50"
                    }`}
                  >
                    <p className="text-sm text-muted-foreground">{card.label}</p>
                    <div className="mt-3 text-3xl font-bold">{card.value}</div>
                  </button>
              ))}
                </div>

                <Panel
                  title={selectedSummaryDetail.title}
                  description={selectedSummaryDetail.description}
                >
                  {selectedSummaryDetail.rows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Chưa có dữ liệu chi tiết cho mục này.
                    </p>
                  ) : (
                    <DataTable
                      columns={selectedSummaryDetail.columns}
                      rows={selectedSummaryDetail.rows}
                    />
                  )}
                </Panel>
              </div>
            )}

            <Panel title="Trạng thái đơn hàng" description="Số lượng theo trạng thái">
              <DataTable
                columns={["Trạng thái", "Số lượng"]}
                rows={orderStatusRows}
              />
            </Panel>
          </section>

          <section id="users" className={sectionClassName("users")}>
            <SectionHeader
              sectionId="users"
              icon={Users}
              title="Quản lý người dùng"
              description="Danh sách người dùng mới nhất, có thể chỉnh sửa trực tiếp"
            />
            <Panel
              title="Danh sách user"
              description="Dữ liệu trực tiếp từ bảng Users"
            >
              <DataTable
                columns={["Tên", "Email", "Điện thoại", "Role", "Trạng thái", "Thao tác"]}
                rows={(dashboard?.users ?? []).map((item) => [
                  editingUserId === item.id ? (
                    <input
                      key={`fullname-${item.id}`}
                      className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                      value={userDraftById[item.id]?.fullName ?? ""}
                      onChange={(event) =>
                        setUserDraftById((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            fullName: event.target.value,
                          },
                        }))
                      }
                    />
                  ) : (
                    <button
                      key={`open-user-${item.id}`}
                      type="button"
                      className="text-left text-primary underline"
                      onClick={() => loadUserDetail(item.id)}
                    >
                      {item.fullName}
                    </button>
                  ),
                  item.email,
                  editingUserId === item.id ? (
                    <input
                      key={`phone-${item.id}`}
                      className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                      value={userDraftById[item.id]?.phone ?? ""}
                      onChange={(event) =>
                        setUserDraftById((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                          },
                        }))
                      }
                    />
                  ) : (
                    item.phone ?? "-"
                  ),
                  editingUserId === item.id ? (
                    <select
                      key={`role-${item.id}`}
                      className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                      value={userDraftById[item.id]?.roleId ?? ""}
                      onChange={(event) =>
                        setUserDraftById((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            roleId: event.target.value,
                          },
                        }))
                      }
                    >
                      <option value="">Không gán role</option>
                      {(dashboard?.roles ?? []).map((role) => (
                        <option key={role.id} value={String(role.id)}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                  ) : (
                    pill(item.role?.name ?? "User")
                  ),
                  editingUserId === item.id ? (
                    <select
                      key={`status-${item.id}`}
                      className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                      value={userDraftById[item.id]?.status ?? "ACTIVE"}
                      onChange={(event) =>
                        setUserDraftById((prev) => ({
                          ...prev,
                          [item.id]: {
                            ...prev[item.id],
                            status: event.target.value,
                          },
                        }))
                      }
                    >
                      <option value="ACTIVE">Đang hoạt động</option>
                      <option value="UNVERIFIED">Chưa xác minh</option>
                      <option value="BANNED">Đã khóa</option>
                    </select>
                  ) : (
                    statusBadge(formatEnum(item.status))
                  ),
                  editingUserId === item.id ? (
                    <div key={`actions-${item.id}`} className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={savingUserId === item.id}
                        onClick={() => saveUser(item.id)}
                      >
                        Lưu
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={cancelEditingUser}
                        disabled={savingUserId === item.id}
                      >
                        Hủy
                      </Button>
                    </div>
                  ) : (
                    <div key={`edit-${item.id}`} className="flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1"
                        onClick={() => startEditingUser(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Sửa
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1"
                        onClick={() => {
                          setSelectedOrderUserFilter({
                            id: item.id,
                            fullName: item.fullName ?? item.email,
                          });
                          setActiveTab("orders");
                        }}
                      >
                        Xem đơn
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="gap-1"
                        onClick={() => loadUserDetail(item.id)}
                      >
                        Chi tiết
                      </Button>
                    </div>
                  ),
                ])}
              />
            </Panel>

            {(isLoadingUserDetail || selectedUserDetail) && (
              <Panel
                title={
                  selectedUserDetail
                    ? `Hồ sơ khách hàng: ${selectedUserDetail.fullName ?? selectedUserDetail.email}`
                    : "Đang tải hồ sơ khách hàng"
                }
                description="Xem và cập nhật đầy đủ thông tin, cùng dữ liệu liên quan của người dùng"
              >
                {isLoadingUserDetail && !selectedUserDetail ? (
                  <p className="text-sm text-muted-foreground">Đang tải chi tiết người dùng...</p>
                ) : selectedUserDetail && selectedUserDraft ? (
                  <div className="space-y-6">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Họ và tên</label>
                        <input
                          className="rounded-md border bg-background px-3 py-2 text-sm"
                          value={selectedUserDraft.fullName}
                          onChange={(event) =>
                            setSelectedUserDraft((prev) => ({
                              ...prev,
                              fullName: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Email</label>
                        <input
                          className="rounded-md border bg-background px-3 py-2 text-sm"
                          value={selectedUserDraft.email}
                          onChange={(event) =>
                            setSelectedUserDraft((prev) => ({
                              ...prev,
                              email: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Điện thoại</label>
                        <input
                          className="rounded-md border bg-background px-3 py-2 text-sm"
                          value={selectedUserDraft.phone}
                          onChange={(event) =>
                            setSelectedUserDraft((prev) => ({
                              ...prev,
                              phone: event.target.value.replace(/\D/g, "").slice(0, 10),
                            }))
                          }
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Avatar URL</label>
                        <input
                          className="rounded-md border bg-background px-3 py-2 text-sm"
                          value={selectedUserDraft.avatarUrl}
                          onChange={(event) =>
                            setSelectedUserDraft((prev) => ({
                              ...prev,
                              avatarUrl: event.target.value,
                            }))
                          }
                          placeholder="https://..."
                        />
                      </div>

                      <div className="grid gap-2 md:col-span-2">
                        <label className="text-sm font-medium">Địa chỉ tổng quát</label>
                        <textarea
                          className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm"
                          value={selectedUserDraft.address}
                          onChange={(event) =>
                            setSelectedUserDraft((prev) => ({
                              ...prev,
                              address: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Vai trò</label>
                        <select
                          className="rounded-md border bg-background px-3 py-2 text-sm"
                          value={selectedUserDraft.roleId}
                          onChange={(event) =>
                            setSelectedUserDraft((prev) => ({
                              ...prev,
                              roleId: event.target.value,
                            }))
                          }
                        >
                          <option value="">Không gán role</option>
                          {(dashboard?.roles ?? []).map((role) => (
                            <option key={role.id} value={String(role.id)}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Trạng thái</label>
                        <select
                          className="rounded-md border bg-background px-3 py-2 text-sm"
                          value={selectedUserDraft.status}
                          onChange={(event) =>
                            setSelectedUserDraft((prev) => ({
                              ...prev,
                              status: event.target.value,
                            }))
                          }
                        >
                          <option value="ACTIVE">Đang hoạt động</option>
                          <option value="UNVERIFIED">Chưa xác minh</option>
                          <option value="BANNED">Đã khóa</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={saveSelectedUserDetail}
                        disabled={isSavingUserDetail}
                      >
                        {isSavingUserDetail ? "Đang lưu..." : "Lưu hồ sơ khách hàng"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => loadUserDetail(selectedUserDetail.id)}
                        disabled={isLoadingUserDetail}
                      >
                        Tải lại dữ liệu liên quan
                      </Button>
                      <div className="ml-auto text-sm text-muted-foreground">
                        Số dư ví: {formatMoney(selectedUserDetail.walletBalance)}
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <Panel title="Địa chỉ giao hàng" description="Danh sách địa chỉ của khách hàng">
                        <DataTable
                          columns={["Nhãn", "Người nhận", "SĐT", "Địa chỉ", "Mặc định"]}
                          rows={(selectedUserDetail.addresses ?? []).map((addr) => [
                            addr.label ?? "-",
                            addr.receiverName,
                            addr.phoneNumber,
                            addr.addressLine,
                            addr.isDefault ? "Có" : "Không",
                          ])}
                        />
                      </Panel>

                      <Panel title="Đơn hàng liên quan" description="20 đơn gần nhất của khách hàng">
                        <DataTable
                          columns={["Mã đơn", "Tổng tiền", "Thanh toán", "Trạng thái", "Số món", "Ngày tạo"]}
                          rows={(selectedUserDetail.orders ?? []).map((order) => [
                            `#${order.id}`,
                            formatMoney(order.totalAmount),
                            statusBadge(formatEnum(order.paymentStatus)),
                            statusBadge(formatEnum(order.orderStatus)),
                            String(order.itemCount ?? 0),
                            formatDate(order.createdAt),
                          ])}
                        />
                      </Panel>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <Panel title="Giao dịch ví" description="Lịch sử topup, thanh toán, hoàn tiền">
                        <DataTable
                          columns={["Loại", "Số tiền", "Đơn", "Ghi chú", "Thời gian"]}
                          rows={(selectedUserDetail.walletTransactions ?? []).map((tx) => [
                            formatEnum(tx.type),
                            formatMoney(tx.amount),
                            tx.orderId ? `#${tx.orderId}` : "-",
                            tx.note ?? "-",
                            formatDate(tx.createdAt),
                          ])}
                        />
                      </Panel>

                      <Panel title="Yêu cầu trả hàng" description="Các yêu cầu trả hàng của khách hàng">
                        <DataTable
                          columns={["Mã", "Đơn", "Lý do", "Trạng thái", "Hoàn", "Yêu cầu lúc"]}
                          rows={(selectedUserDetail.returnRequests ?? []).map((request) => [
                            `#${request.id}`,
                            `#${request.orderId}`,
                            request.reason ?? "-",
                            statusBadge(formatEnum(request.status)),
                            request.refundAmount ? formatMoney(request.refundAmount) : "-",
                            formatDate(request.requestedAt),
                          ])}
                        />
                      </Panel>
                    </div>
                  </div>
                ) : null}
              </Panel>
            )}
          </section>

          <section id="products" className={sectionClassName("products")}>
            <SectionHeader
              sectionId="products"
              icon={Package}
              title="Quản lý sản phẩm"
              description="Thêm, sửa, xóa, upload ảnh và tìm kiếm sản phẩm"
            />
            <div className="grid gap-6 xl:grid-cols-5">
              <div className="xl:col-span-2">
                <Panel
                  title={editingProductId ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm mới"}
                  description="Task #11: validate giá, tồn kho, mã sản phẩm và upload ảnh"
                >
                  <div className="space-y-3">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Tên sản phẩm</label>
                      <input
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={productForm.name}
                        onChange={(event) =>
                          setProductForm((prev) => ({ ...prev, name: event.target.value }))
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Mã sản phẩm (duy nhất)</label>
                      <input
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={productForm.productCode}
                        onChange={(event) =>
                          setProductForm((prev) => ({
                            ...prev,
                            productCode: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Danh mục</label>
                      <select
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={productForm.categorySlug}
                        onChange={(event) =>
                          setProductForm((prev) => ({
                            ...prev,
                            categorySlug: event.target.value,
                          }))
                        }
                      >
                        {catalogCategories.map((category) => (
                          <option key={category.slug} value={category.slug}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Nhà cung cấp</label>
                      <select
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={productForm.supplierId}
                        onChange={(event) =>
                          setProductForm((prev) => ({
                            ...prev,
                            supplierId: event.target.value,
                          }))
                        }
                      >
                        <option value="">Không chọn</option>
                        {(dashboard?.suppliers ?? []).map((supplier) => (
                          <option key={supplier.id} value={String(supplier.id)}>
                            {supplier.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Giá (VND)</label>
                        <input
                          type="number"
                          min="1"
                          className="rounded-md border bg-background px-3 py-2 text-sm"
                          value={productForm.price}
                          onChange={(event) =>
                            setProductForm((prev) => ({ ...prev, price: event.target.value }))
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Tồn kho</label>
                        <input
                          type="number"
                          min="0"
                          className="rounded-md border bg-background px-3 py-2 text-sm"
                          value={productForm.stockQuantity}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              stockQuantity: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Bảo hành (tháng)</label>
                      <input
                        type="number"
                        min="0"
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={productForm.warrantyMonths}
                        onChange={(event) =>
                          setProductForm((prev) => ({
                            ...prev,
                            warrantyMonths: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Ảnh sản phẩm</label>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/jpg"
                        onChange={(event) =>
                          setSelectedImageFile(event.target.files?.[0] ?? null)
                        }
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        placeholder="Hoặc dán trực tiếp imageUrl"
                        value={productForm.imageUrl}
                        onChange={(event) =>
                          setProductForm((prev) => ({
                            ...prev,
                            imageUrl: event.target.value,
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Chấp nhận jpg/jpeg/png. Nếu chọn file, hệ thống sẽ upload và tự gắn URL.
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Thông số kỹ thuật (JSON)</label>
                      <textarea
                        className="min-h-28 rounded-md border bg-background px-3 py-2 text-sm"
                        value={productForm.specificationsText}
                        onChange={(event) =>
                          setProductForm((prev) => ({
                            ...prev,
                            specificationsText: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        className="gap-2"
                        onClick={saveProduct}
                        disabled={isSavingProduct}
                      >
                        {editingProductId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {editingProductId ? "Cập nhật" : "Thêm sản phẩm"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={resetProductForm}
                        disabled={isSavingProduct}
                      >
                        Làm mới form
                      </Button>
                    </div>
                  </div>
                </Panel>
              </div>

              <div className="xl:col-span-3">
                <Panel
                  title="Kho sản phẩm"
                  description="Task #31 + #32: tìm kiếm nhanh, phân trang 12 sản phẩm/trang"
                >
                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <input
                      className="w-full max-w-sm rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="Tìm theo tên hoặc mã sản phẩm"
                      value={managedProductKeywordInput}
                      onChange={(event) => setManagedProductKeywordInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          setManagedProductPage(1);
                          setManagedProductKeyword(managedProductKeywordInput.trim());
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        setManagedProductPage(1);
                        setManagedProductKeyword(managedProductKeywordInput.trim());
                      }}
                    >
                      Tìm
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setManagedProductKeywordInput("");
                        setManagedProductKeyword("");
                        setManagedProductCategory("all");
                        setManagedProductBrand("all");
                        setManagedProductPage(1);
                      }}
                    >
                      Xóa lọc
                    </Button>

                    <select
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                      value={managedProductCategory}
                      onChange={(event) => {
                        setManagedProductCategory(event.target.value);
                        setManagedProductPage(1);
                      }}
                    >
                      <option value="all">Tất cả danh mục</option>
                      {catalogCategories.map((category) => (
                        <option key={category.slug} value={category.slug}>
                          {category.name}
                        </option>
                      ))}
                    </select>

                    <select
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                      value={managedProductBrand}
                      onChange={(event) => {
                        setManagedProductBrand(event.target.value);
                        setManagedProductPage(1);
                      }}
                    >
                      <option value="all">Tất cả brand</option>
                      {catalogBrands.map((brand) => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  </div>

                  <DataTable
                    columns={[
                      "Tên",
                      "Mã",
                      "Danh mục",
                      "Giá",
                      "Tồn kho",
                      "Trạng thái",
                      "Ảnh",
                      "Thao tác",
                    ]}
                    rows={managedProducts.map((item) => [
                      item.name,
                      item.productCode,
                      item.category?.name ?? "-",
                      formatMoney(item.price),
                      String(item.stockQuantity ?? 0),
                      statusBadge(Number(item.stockQuantity ?? 0) > 0 ? "Còn hàng" : "Hết hàng"),
                      item.imageUrl ? (
                        <a
                          key={`image-${item.id}`}
                          href={item.imageUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-primary underline"
                        >
                          <ImagePlus className="h-4 w-4" />
                          Xem
                        </a>
                      ) : (
                        "-"
                      ),
                      <div key={`actions-${item.id}`} className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => startEditingProduct(item)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1 text-rose-600"
                          onClick={() => deleteProduct(item.id)}
                          disabled={deletingProductId === item.id}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Xóa
                        </Button>
                      </div>,
                    ])}
                  />

                  <div className="mt-4 flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">
                      Tổng: {managedProductPagination.totalItems} sản phẩm
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={managedProductPage <= 1}
                        onClick={() =>
                          setManagedProductPage((prev) => Math.max(1, prev - 1))
                        }
                      >
                        Trước
                      </Button>
                      <span>
                        Trang {managedProductPagination.page} / {managedProductPagination.totalPages}
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={
                          managedProductPage >=
                          Number(managedProductPagination.totalPages ?? 1)
                        }
                        onClick={() =>
                          setManagedProductPage((prev) =>
                            Math.min(
                              Number(managedProductPagination.totalPages ?? 1),
                              prev + 1,
                            ),
                          )
                        }
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                </Panel>
              </div>
            </div>
          </section>

          <section id="catalog" className={sectionClassName("catalog")}>
            <SectionHeader
              sectionId="catalog"
              icon={Building2}
              title="Danh mục và nhà cung cấp"
              description="Danh sách nhà cung cấp"
            />
            <Panel title="Nhà cung cấp" description="Dữ liệu trực tiếp từ bảng Suppliers">
              <DataTable
                columns={["Tên", "Email", "Điện thoại", "Người liên hệ"]}
                rows={(dashboard?.suppliers ?? []).map((item) => [
                  item.name,
                  item.email ?? "-",
                  item.phone ?? "-",
                  item.contactPerson ?? "-",
                ])}
              />
            </Panel>
          </section>

          <section id="vouchers" className={sectionClassName("vouchers")}>
            <SectionHeader
              sectionId="vouchers"
              icon={TicketPercent}
              title="Mã giảm giá"
              description="Tạo mã giảm giá tại trang quản trị và theo dõi lượt dùng"
            />

            <div className="grid gap-6 xl:grid-cols-5">
              <div className="xl:col-span-2">
                <Panel title="Tạo mã giảm giá" description="Áp dụng cho thanh toán giỏ hàng">
                  <div className="space-y-3">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Mã giảm giá</label>
                      <input
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={voucherForm.code}
                        onChange={(event) =>
                          setVoucherForm((prev) => ({
                            ...prev,
                            code: event.target.value.toUpperCase(),
                          }))
                        }
                        placeholder="VD: GIAM50"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Loại giảm</label>
                        <select
                          className="rounded-md border bg-background px-3 py-2 text-sm"
                          value={voucherForm.discountType}
                          onChange={(event) =>
                            setVoucherForm((prev) => ({
                              ...prev,
                              discountType: event.target.value,
                            }))
                          }
                        >
                          <option value="PERCENT">%</option>
                          <option value="FIXED_AMOUNT">Số tiền cố định</option>
                        </select>
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Giá trị giảm</label>
                        <input
                          type="number"
                          min="1"
                          className="rounded-md border bg-background px-3 py-2 text-sm"
                          value={voucherForm.discountValue}
                          onChange={(event) =>
                            setVoucherForm((prev) => ({
                              ...prev,
                              discountValue: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Đơn tối thiểu</label>
                        <input
                          type="number"
                          min="0"
                          className="rounded-md border bg-background px-3 py-2 text-sm"
                          value={voucherForm.minOrderValue}
                          onChange={(event) =>
                            setVoucherForm((prev) => ({
                              ...prev,
                              minOrderValue: event.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Số lượt dùng</label>
                        <input
                          type="number"
                          min="1"
                          className="rounded-md border bg-background px-3 py-2 text-sm"
                          value={voucherForm.usageLimit}
                          onChange={(event) =>
                            setVoucherForm((prev) => ({
                              ...prev,
                              usageLimit: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Thời gian bắt đầu</label>
                      <input
                        type="datetime-local"
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={voucherForm.startDate}
                        onChange={(event) =>
                          setVoucherForm((prev) => ({
                            ...prev,
                            startDate: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Thời gian kết thúc</label>
                      <input
                        type="datetime-local"
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={voucherForm.endDate}
                        onChange={(event) =>
                          setVoucherForm((prev) => ({
                            ...prev,
                            endDate: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Trạng thái</label>
                      <select
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={voucherForm.status}
                        onChange={(event) =>
                          setVoucherForm((prev) => ({
                            ...prev,
                            status: event.target.value,
                          }))
                        }
                      >
                        <option value="ACTIVE">ACTIVE</option>
                        <option value="DISABLED">DISABLED</option>
                        <option value="EXPIRED">EXPIRED</option>
                      </select>
                    </div>

                    <Button onClick={createVoucher} disabled={isSavingVoucher} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Tạo mã giảm giá
                    </Button>
                  </div>
                </Panel>
              </div>

              <div className="xl:col-span-3">
                <Panel title="Danh sách mã giảm giá" description="Mã giảm giá được tạo từ trang quản trị">
                  <DataTable
                    columns={[
                      "Mã",
                      "Loại",
                      "Giá trị",
                      "Đơn tối thiểu",
                      "Đã dùng / Giới hạn",
                      "Thời gian",
                      "Trạng thái",
                    ]}
                    rows={(dashboard?.coupons ?? []).map((item) => [
                      item.code,
                      formatEnum(item.discountType),
                      item.discountType === "PERCENT"
                        ? `${Number(item.discountValue)}%`
                        : formatMoney(item.discountValue),
                      formatMoney(item.minOrderValue),
                      `${item.usedCount} / ${item.usageLimit}`,
                      `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`,
                      statusBadge(formatEnum(item.status)),
                    ])}
                  />
                </Panel>
              </div>
            </div>
          </section>

          <section id="orders" className={sectionClassName("orders")}>
            <SectionHeader
              sectionId="orders"
              icon={ClipboardList}
              title="Quản lý đơn hàng"
              description="Danh sách đơn mới nhất"
            />
            <Panel
              title="Danh sách đơn"
              description="Dữ liệu trực tiếp từ MySQL + cập nhật trạng thái"
            >
              {selectedOrderUserFilter?.id && (
                <div className="mb-3 flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50/70 px-3 py-2 text-sm text-sky-700">
                  <span>
                    Đang lọc theo người dùng: <strong>{selectedOrderUserFilter.fullName}</strong>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedOrderUserFilter(null)}
                  >
                    Bỏ lọc
                  </Button>
                </div>
              )}

              <DataTable
                columns={["Mã đơn", "Khách hàng", "Tổng tiền", "Thanh toán", "Trạng thái", "Cập nhật"]}
                rows={(displayedOrders ?? []).map((item) => [
                  <button
                    key={`order-${item.id}`}
                    className="text-primary underline"
                    onClick={() => loadOrderDetail(item.id)}
                  >
                    #{item.id}
                  </button>,
                  item.customer?.fullName ?? item.customer?.email ?? "-",
                  formatMoney(item.totalAmount),
                  statusBadge(formatEnum(item.paymentStatus)),
                  statusBadge(formatEnum(item.orderStatus)),
                  item.orderStatus === "DELIVERED" ? (
                    <span className="text-xs text-muted-foreground">Đã hoàn thành</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select
                        className="rounded-md border bg-background px-2 py-1 text-xs"
                        value={statusDraftByOrder[item.id] ?? item.orderStatus}
                        onChange={(event) =>
                          setStatusDraftByOrder((prev) => ({
                            ...prev,
                            [item.id]: event.target.value,
                          }))
                        }
                      >
                        <option value="PENDING">Chờ xác nhận</option>
                        <option value="SHIPPING">Đang giao</option>
                        <option value="DELIVERED">Hoàn thành</option>
                        <option value="CANCELLED">Đã hủy</option>
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingOrderId === item.id}
                        onClick={() => updateOrderStatus(item.id)}
                      >
                        Lưu
                      </Button>
                    </div>
                  ),
                ])}
              />
              {displayedOrders.length === 0 && (
                <p className="mt-3 text-sm text-muted-foreground">Không có đơn hàng phù hợp.</p>
              )}
            </Panel>

            {selectedOrderDetail && (
              <Panel
                title={`Chi tiết đơn #${selectedOrderDetail.id}`}
                description="Danh sách sản phẩm và lịch sử trạng thái"
              >
                <DataTable
                  columns={["Sản phẩm", "SL", "Đơn giá", "Thành tiền"]}
                  rows={(selectedOrderDetail.items ?? []).map((item) => [
                    item.product?.name ?? "-",
                    String(item.quantity ?? 0),
                    formatMoney(item.priceAtTime),
                    formatMoney(item.lineTotal),
                  ])}
                />
                <div className="mt-4">
                  <h4 className="mb-2 text-sm font-semibold">Lịch sử trạng thái</h4>
                  <DataTable
                    columns={["Từ", "Sang", "Thời gian", "Ghi chú"]}
                    rows={(selectedOrderDetail.statusHistory ?? []).map((history) => [
                      formatEnum(history.fromStatus),
                      formatEnum(history.toStatus),
                      formatDate(history.createdAt),
                      history.note ?? "-",
                    ])}
                  />
                </div>
              </Panel>
            )}
          </section>

          <section id="warehouse" className={sectionClassName("warehouse")}>
            <SectionHeader
              sectionId="warehouse"
              icon={Warehouse}
              title="Quản lý kho"
              description="Danh sách kho và số lô"
            />
            <Panel
              title="Tình trạng kho"
              description="Dữ liệu trực tiếp từ bảng Warehouses"
            >
              <DataTable
                columns={["Kho", "Địa chỉ", "Quản lý", "Số lô"]}
                rows={(dashboard?.warehouses ?? []).map((item) => [
                  item.name,
                  item.address ?? "-",
                  item.managerName ?? "-",
                  String(item.batches?.length ?? 0),
                ])}
              />
            </Panel>
          </section>

          <section id="reviews" className={sectionClassName("reviews")}>
            <SectionHeader
              sectionId="reviews"
              icon={Star}
              title="Quản lý đánh giá"
              description="Đánh giá mới nhất"
            />
            <Panel
              title="Review moderation"
              description="Dữ liệu trực tiếp từ bảng Reviews"
            >
              <DataTable
                columns={["Sản phẩm", "Rating", "Khách hàng", "Nội dung"]}
                rows={(dashboard?.reviews ?? []).map((item) => [
                  item.product?.name ?? "-",
                  `${item.rating} sao`,
                  item.user?.fullName ?? item.user?.email ?? "-",
                  item.comment ?? "-",
                ])}
              />
            </Panel>
          </section>

          <section id="chat" className={sectionClassName("chat")}>
            <SectionHeader
              sectionId="chat"
              icon={MessageSquareMore}
              title="Chat khách hàng"
              description="Phòng chat mới nhất"
            />
            <Panel
              title="Chat room monitor"
              description="Dữ liệu trực tiếp từ bảng Chat_Rooms"
            >
              <DataTable
                columns={["Room", "Khách hàng", "Tin nhắn cuối", "Trạng thái"]}
                rows={(dashboard?.chatRooms ?? []).map((item) => [
                  `Room #${item.id}`,
                  item.customer,
                  item.lastMessage ?? "-",
                  statusBadge(formatEnum(item.status)),
                ])}
              />
            </Panel>
          </section>

          <section id="ai-build" className={sectionClassName("ai-build")}>
            <SectionHeader
              sectionId="ai-build"
              icon={Sparkles}
              title="Cấu hình AI"
              description="Build được lưu gần đây"
            />
            <Panel
              title="Build đã lưu"
              description="Dữ liệu trực tiếp từ bảng AI_Saved_Builds"
            >
              <DataTable
                columns={["Tên build", "Chủ sở hữu", "Tổng giá", "Số món"]}
                rows={(dashboard?.aiBuilds ?? []).map((item) => [
                  item.buildName,
                  item.owner,
                  formatMoney(item.totalPrice),
                  String(item.itemCount),
                ])}
              />
            </Panel>
          </section>

          <section id="verification" className={sectionClassName("verification")}>
            <SectionHeader
              sectionId="verification"
              icon={MailCheck}
              title="Xác thực email"
              description="Danh sách OTP gần đây"
            />
            <Panel
              title="Email verification queue"
              description="Dữ liệu trực tiếp từ bảng Email_Verifications"
            >
              <DataTable
                columns={["Email", "OTP", "Mục đích", "Tạo lúc", "Hết hạn", "Trạng thái"]}
                rows={(dashboard?.emailVerifications ?? []).map((item) => [
                  item.email,
                  item.otp,
                  formatEnum(item.purpose),
                  formatDate(item.createdAt),
                  formatDate(item.expiredAt),
                  statusBadge(item.usedAt ? "Đã dùng" : "Đang chờ"),
                ])}
              />
            </Panel>
          </section>

          <section id="roles" className={sectionClassName("roles")}>
            <SectionHeader
              sectionId="roles"
              icon={ShieldCheck}
              title="Phân quyền hệ thống"
              description="Vai trò và quyền truy cập"
            />
            <div className="grid gap-6 xl:grid-cols-3">
              {(dashboard?.roles ?? []).map((role) => (
                <Panel
                  key={role.name}
                  title={`${role.name} (${role.userCount})`}
                  description="Danh sách quyền"
                >
                  <div className="space-y-2">
                    {(role.permissions ?? []).map((permission) => (
                      <div
                        key={permission}
                        className="flex items-center gap-2 rounded-2xl bg-secondary/70 px-3 py-2 text-sm"
                      >
                        <Activity className="h-4 w-4 text-primary" />
                        <span>{permission}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              ))}
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description, sectionId }) {
  const schema =
    schemaBySection[sectionId] ?? schemaBySection.dashboard;

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-sm text-primary shadow-sm">
          <Icon className="h-4 w-4" />
          {title}
        </div>
        <h3 className="text-2xl font-bold">{title}</h3>
        <p className="mt-1 text-muted-foreground">{description}</p>
      </div>
      <Dialog>
        <DialogTrigger asChild>
          <Button variant="outline" className="w-fit gap-2">
            <Activity className="h-4 w-4" />
            Bảng dữ liệu thực
          </Button>
        </DialogTrigger>
        <DialogContent className="max-h-[85vh] w-[95vw] max-w-6xl overflow-hidden p-0">
          <DialogHeader className="border-b bg-slate-50/80 px-6 py-4">
            <DialogTitle>Sơ đồ dữ liệu: {title}</DialogTitle>
            <DialogDescription>
              {schema.headline}
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(85vh-88px)] overflow-y-auto p-6">
            <div className="rounded-2xl border border-border/70 bg-white p-4">
              <h4 className="text-base font-semibold">Bang lien quan</h4>
              <div className="mt-3 flex flex-wrap gap-2">
                {schema.tables.map((tableName) => (
                  <span
                    key={tableName}
                    className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                  >
                    {tableName}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-border/70 bg-white p-4">
              <h4 className="text-base font-semibold">Quan he du lieu chinh</h4>
              <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                {schema.relations.map((relation) => (
                  <p key={relation} className="rounded-xl bg-slate-50 px-3 py-2">
                    {relation}
                  </p>
                ))}
              </div>
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Nguồn dữ liệu: BE/prisma/schema.prisma
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Panel({ title, description, children }) {
  return (
    <div className="rounded-[28px] border border-border/60 bg-white/90 p-5 shadow-[0_18px_45px_rgba(15,23,42,0.06)]">
      <div className="mb-5 flex flex-col gap-1">
        <h4 className="text-lg font-semibold">{title}</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

function DataTable({ columns, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-border/70 text-muted-foreground">
            {columns.map((column) => (
              <th key={column} className="px-3 py-3 font-medium">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-border/40 last:border-b-0"
            >
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="px-3 py-4 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function statusBadge(value) {
  const tone =
    value === "Đang hoạt động" ||
    value === "Đã thanh toán" ||
    value === "Đã giao" ||
    value === "Đã kết nối" ||
    value === "Đã đăng" ||
    value === "Phổ biến" ||
    value === "Đã xác minh" ||
    value === "Còn hàng" ||
    value === "Đã dùng"
      ? "bg-emerald-100 text-emerald-700"
      : value === "Đang chờ" ||
          value === "Đang xử lý" ||
          value === "Tạm dừng" ||
          value === "Cần xem xét" ||
          value === "Bản nháp" ||
          value === "Ổn định"
        ? "bg-amber-100 text-amber-700"
        : value === "Đang giao" ||
            value === "Quản trị viên" ||
            value === "Nhân viên" ||
            value === "Mở"
          ? "bg-sky-100 text-sky-700"
          : "bg-rose-100 text-rose-700";

  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      {value}
    </span>
  );
}

function pill(value) {
  return (
    <span className="inline-flex rounded-full bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white">
      {value}
    </span>
  );
}

function formatEnum(value) {
  const raw = String(value ?? "").toUpperCase();
  const dictionary = {
    ACTIVE: "Đang hoạt động",
    UNVERIFIED: "Chưa xác minh",
    BANNED: "Đã khóa",
    PENDING: "Đang chờ",
    PROCESSING: "Đang xử lý",
    SHIPPING: "Đang giao",
    DELIVERED: "Đã giao",
    CANCELLED: "Đã hủy",
    PAID: "Đã thanh toán",
    FAILED: "Thất bại",
    REFUNDED: "Đã hoàn tiền",
    OPEN: "Mở",
    CLOSED: "Đóng",
    ADMIN: "Quản trị viên",
    STAFF: "Nhân viên",
    USER: "Người dùng",
    EXPIRED: "Hết hạn",
    DISABLED: "Vô hiệu hóa",
    PERCENT: "Phần trăm",
    FIXED_AMOUNT: "Số tiền cố định",
  };

  return (
    dictionary[raw] ||
    raw
      .toLowerCase()
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  );
}

function formatMoney(value) {
  const number = Number(value ?? 0);
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(number) ? number : 0);
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

function validateDisplayName(value) {
  const name = String(value ?? "").trim();
  if (!name) {
    return "Tên không được để trống";
  }
  if (name.length < 2 || name.length > 100) {
    return "Tên phải từ 2 đến 100 ký tự";
  }
  if (/\d/.test(name)) {
    return "Tên không được chứa số";
  }
  return "";
}

function validateVietnamPhone(value) {
  const phone = String(value ?? "").trim();
  if (!phone) {
    return "";
  }
  if (!/^\d{10}$/.test(phone)) {
    return "Số điện thoại phải đúng 10 chữ số";
  }
  return "";
}

function validateEmail(value) {
  const email = String(value ?? "").trim();
  if (!email) {
    return "Email không được để trống";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return "Email không đúng định dạng";
  }

  return "";
}

function validateOptionalUrl(value) {
  const url = String(value ?? "").trim();
  if (!url) {
    return "";
  }

  if (!/^https?:\/\//i.test(url)) {
    return "Avatar URL phải bắt đầu bằng http:// hoặc https://";
  }

  return "";
}

function slugifyTabLabel(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function normalizeHash(value) {
  try {
    return decodeURIComponent(String(value ?? "").trim().toLowerCase());
  } catch {
    return String(value ?? "").trim().toLowerCase();
  }
}
