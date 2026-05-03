import { useCallback, useEffect, useMemo, useState } from "react";
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
  RotateCcw,
  Search,
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { AdminChatPanel } from "@/client/features/admin/components/AdminChatPanel.jsx";
import { CategoryManagementPanel } from "@/client/features/admin/components/CategoryManagementPanel.jsx";
import { connectChatSocket } from "@/client/features/chat/data/chat.socket.js";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

const navItems = [
  { id: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
  { id: "users", label: "Người dùng", icon: Users },
  { id: "roles", label: "Phân quyền", icon: ShieldCheck },
  { id: "products-create", label: "Thêm sản phẩm mới", icon: Plus },
  { id: "products-inventory", label: "Danh mục sản phẩm", icon: Package },
  { id: "products-edit", label: "Chỉnh sửa sản phẩm", icon: Pencil },
  { id: "orders", label: "Đơn hàng", icon: ClipboardList },
  { id: "returns", label: "Trả hàng", icon: RotateCcw },
  { id: "catalog", label: "Danh mục & NCC", icon: Building2 },
  { id: "vouchers", label: "Mã giảm giá", icon: TicketPercent },
  { id: "warehouse", label: "Kho", icon: Warehouse },
  { id: "reviews", label: "Đánh giá", icon: Star },
  { id: "chat", label: "Chat", icon: MessageSquareMore },
  { id: "ai-build", label: "Cấu hình AI", icon: Sparkles },
  { id: "verification", label: "Email OTP", icon: MailCheck },
].map((item) => ({
  ...item,
  hash: `#${slugifyTabLabel(item.label)}`,
}));

const navGroups = [
  {
    id: "overview",
    label: "Tổng quan",
    tabIds: ["dashboard"],
  },
  {
    id: "account",
    label: "Tài khoản & phân quyền",
    tabIds: ["users", "roles", "verification"],
  },
  {
    id: "catalog-ops",
    label: "Sản phẩm & kho",
    tabIds: [
      "products-create",
      "products-inventory",
      "products-edit",
      "catalog",
      "warehouse",
    ],
  },
  {
    id: "commerce",
    label: "Kinh doanh & CSKH",
    tabIds: ["orders", "returns", "vouchers", "reviews", "chat"],
  },
  {
    id: "automation",
    label: "Tự động hóa",
    tabIds: ["ai-build"],
  },
];

const tabGroupByTabId = navGroups.reduce((accumulator, group) => {
  for (const tabId of group.tabIds) {
    accumulator[tabId] = group.id;
  }

  return accumulator;
}, {});

const tabPermissionMap = {
  dashboard: "admin_dashboard_view",
  users: "admin_users_manage",
  "products-create": "admin_products_manage",
  "products-inventory": "admin_products_manage",
  "products-edit": "admin_products_manage",
  orders: "admin_orders_manage",
  returns: "admin_orders_manage",
  catalog: "admin_catalog_manage",
  vouchers: "admin_vouchers_manage",
  warehouse: "admin_warehouse_manage",
  reviews: "admin_reviews_manage",
  chat: "admin_chat_manage",
  "ai-build": "admin_ai_build_manage",
  verification: "admin_verification_view",
  roles: "admin_roles_manage",
};

const SUPER_ADMIN_EMAIL = "admin@gmail.com";

const schemaBySection = {
  dashboard: {
    headline: "Toàn cảnh dữ liệu hệ thống ",
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
    headline: "Dữ liệu người dùng",
    tables: ["Users", "User_Addresses"],
    relations: ["Users 1 - n User_Addresses"],
  },
  "products-create": {
    headline: "Dữ liệu thêm sản phẩm",
    tables: [
      "Products",
      "Categories",
      "Suppliers",
      "Product_Details",
      "Product_Images",
    ],
    relations: [
      "Categories 1 - n Products",
      "Suppliers 1 - n Products",
      "Products 1 - 1 Product_Details",
      "Products 1 - n Product_Images",
    ],
  },
  "products-inventory": {
    headline: "Dữ liệu kho sản phẩm",
    tables: [
      "Products",
      "Categories",
      "Suppliers",
      "Product_Details",
      "Product_Images",
    ],
    relations: [
      "Categories 1 - n Products",
      "Suppliers 1 - n Products",
      "Products 1 - 1 Product_Details",
      "Products 1 - n Product_Images",
    ],
  },
  "products-edit": {
    headline: "Dữ liệu quản lý sản phẩm",
    tables: [
      "Products",
      "Categories",
      "Suppliers",
      "Product_Details",
      "Product_Images",
    ],
    relations: [
      "Categories 1 - n Products",
      "Suppliers 1 - n Products",
      "Products 1 - 1 Product_Details",
      "Products 1 - n Product_Images",
    ],
  },
  orders: {
    headline: "Dữ liệu đơn hàng và thanh toán",
    tables: [
      "Orders",
      "Order_Items",
      "Order_Status_History",
      "Users",
      "Coupons",
      "Wallet_Transactions",
    ],
    relations: [
      "Users 1 - n Orders",
      "Orders 1 - n Order_Items",
      "Orders 1 - n Order_Status_History",
      "Coupons 1 - n Orders",
      "Orders 1 - n Wallet_Transactions",
    ],
  },
  catalog: {
    headline: "Dữ liệu danh mục và nhà cung cấp",
    tables: ["Categories", "Suppliers", "Products", "Batches"],
    relations: [
      "Categories 1 - n Products",
      "Suppliers 1 - n Products",
      "Suppliers 1 - n Batches",
    ],
  },
  vouchers: {
    headline: "Dữ liệu mã giảm giá",
    tables: ["Coupons", "Orders"],
    relations: ["Coupons 1 - n Orders", "Orders su dung coupon qua coupon_id"],
  },
  warehouse: {
    headline: "Dữ liệu kho và serial",
    tables: [
      "Warehouses",
      "Batches",
      "Serial_Numbers",
      "Products",
      "Suppliers",
    ],
    relations: [
      "Warehouses 1 - n Batches",
      "Products 1 - n Batches",
      "Suppliers 1 - n Batches",
      "Batches 1 - n Serial_Numbers",
    ],
  },
  reviews: {
    headline: "Dữ liệu đánh giá",
    tables: ["Reviews", "Users", "Products"],
    relations: ["Users 1 - n Reviews", "Products 1 - n Reviews"],
  },
  chat: {
    headline: "Dữ liệu chat hỗ trợ",
    tables: ["Chat_Rooms", "Messages", "Users"],
    relations: [
      "Users 1 - n Chat_Rooms",
      "Chat_Rooms 1 - n Messages",
      "Users 1 - n Messages",
    ],
  },
  "ai-build": {
    headline: "Dữ liệu cấu hình AI",
    tables: ["AI_Saved_Builds", "AI_Build_Items", "Users", "Products"],
    relations: [
      "Users 1 - n AI_Saved_Builds",
      "AI_Saved_Builds 1 - n AI_Build_Items",
      "Products 1 - n AI_Build_Items",
    ],
  },
  verification: {
    headline: "Dữ liệu OTP xác minh email",
    tables: ["Email_Verifications"],
    relations: ["Bang luu OTP theo email, muc dich, thoi gian het han"],
  },
  roles: {
    headline: "Dữ liệu phân quyền theo tài khoản",
    tables: ["Users", "Roles", "Permissions", "Role_Permissions"],
    relations: [
      "Roles n - n Permissions qua Role_Permissions",
      "Users 1 - n Roles (vai trò cá nhân hóa theo tài khoản)",
    ],
  },
};

// Predefined options for product specifications
const SPEC_OPTIONS = {
  ram: ["4GB", "8GB", "16GB", "32GB", "64GB", "128GB", "256GB"],
  gpuRam: [
    "2GB",
    "4GB",
    "6GB",
    "8GB",
    "10GB",
    "12GB",
    "16GB",
    "20GB",
    "24GB",
    "48GB",
  ],
  storage: [
    "256GB",
    "512GB",
    "1TB",
    "2TB",
    "4TB",
    "8TB",
    "10TB",
    "12TB",
    "16TB",
  ],
  brand: {
    gpu: ["NVIDIA", "AMD", "Intel"],
    cpu: ["Intel", "AMD"],
    ram: [
      "Corsair",
      "G.Skill",
      "Kingston",
      "Samsung",
      "Crucial",
      "Patriot",
      "ADATA",
    ],
    storage: [
      "Samsung",
      "SK Hynix",
      "Micron",
      "Western Digital",
      "Seagate",
      "Intel",
      "Kioxia",
      "SanDisk",
    ],
    motherboard: ["ASUS", "MSI", "Gigabyte", "ASRock"],
    cooler: ["Noctua", "Corsair", "NZXT", "Scythe", "be quiet!"],
    case: ["NZXT", "Corsair", "Lian Li", "Fractal Design", "Phanteks"],
    power: ["Corsair", "MSI", "Seasonic", "EVGA", "Thermaltake"],
    monitor: ["ASUS", "LG", "Dell", "BenQ", "AOC", "MSI", "Samsung"],
  },
};

// Spell checker for PC components - common misspellings
const SPELL_CHECK_DICTIONARY = {
  // GPU brands
  nvdia: "NVIDIA",
  nvidia: "NVIDIA",
  amd: "AMD",
  intel: "Intel",
  intelgraphics: "Intel",

  // GPU models
  rtx: "RTX",
  gtx: "GTX",
  radeon: "Radeon",
  arc: "Arc",

  // CPU brands
  core: "Intel Core",
  ryzen: "AMD Ryzen",
  xeon: "Intel Xeon",

  // RAM brands
  corsair: "Corsair",
  gskill: "G.Skill",
  kingston: "Kingston",
  samsung: "Samsung",
  crucial: "Crucial",
  patriot: "Patriot",

  // SSD brands
  seagate: "Seagate",
  wd: "Western Digital",
  sandisk: "SanDisk",
  kioxia: "Kioxia",

  // Motherboard brands
  asus: "ASUS",
  msi: "MSI",
  gigabyte: "Gigabyte",
  asrock: "ASRock",

  // Others
  noctua: "Noctua",
  "be quiet": "be quiet!",
};

function suggestSpelling(text) {
  if (!text || text.length < 2) return null;

  const normalized = text.toLowerCase().trim();
  const known = SPELL_CHECK_DICTIONARY[normalized];
  if (known) return known;

  // Fuzzy matching cho các từ dài
  for (const [misspelled, correct] of Object.entries(SPELL_CHECK_DICTIONARY)) {
    if (similarity(normalized, misspelled) > 0.8) {
      return correct;
    }
  }

  return null;
}

// Simple string similarity (Levenshtein-like)
function similarity(s1, s2) {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return 1.0;

  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function getEditDistance(s1, s2) {
  const costs = [];
  for (let i = 0; i <= s1.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= s2.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
          newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[s2.length] = lastValue;
  }
  return costs[s2.length];
}

// Category-specific spec configuration
const CATEGORY_SPEC_CONFIG = {
  default: {
    label: "Danh mục chung",
    fields: ["brand", "model", "cpu", "ram", "storage", "gpu"],
    required: [],
    hints: {
      brand: "Hãng sản xuất",
      model: "Tên mẫu sản phẩm",
      cpu: "Loại CPU/chip",
      ram: "Dung lượng hoặc loại RAM",
      storage: "Dung lượng lưu trữ",
      gpu: "Loại GPU/chip đồ họa",
    },
  },
  gpu: {
    label: "Card Đồ họa",
    fields: ["brand", "model", "ram", "gpu"],
    required: ["brand", "model"],
    hints: {
      brand: "NVIDIA, AMD, Intel, v.v.",
      model: "RTX 4060, RTX 4070, RX 7900 XT, Arc B580",
      ram: "8GB, 12GB, 16GB, 24GB",
      gpu: "AD107, AD104, RDNA3, Arc Alchemist",
    },
  },
  "card-do-hoa": {
    label: "Card Đồ họa",
    fields: ["brand", "model", "ram", "gpu"],
    required: ["brand", "model"],
    hints: {
      brand: "NVIDIA, AMD, Intel",
      model: "RTX 4060, RTX 4070, RX 7900 XT",
      ram: "8GB, 12GB, 16GB",
      gpu: "Ada Lovelace, RDNA3",
    },
  },
  cpu: {
    label: "Bộ xử lý CPU",
    fields: ["brand", "model", "cpu"],
    required: ["brand", "model"],
    hints: {
      brand: "Intel, AMD",
      model: "Core i7-14700K, Ryzen 9 7950X3D",
      cpu: "Raptor Lake, Zen 5",
    },
  },
  "chip-xu-ly": {
    label: "Bộ xử lý CPU",
    fields: ["brand", "model", "cpu"],
    required: ["brand", "model"],
    hints: {
      brand: "Intel, AMD",
      model: "Core i7-14700K, Ryzen 9 7950X3D",
      cpu: "Raptor Lake Refresh, Zen 5",
    },
  },
  ram: {
    label: "Bộ nhớ RAM",
    fields: ["brand", "model", "ram", "storage"],
    required: ["brand", "ram"],
    hints: {
      brand: "Corsair, G.Skill, Kingston, Samsung",
      model: "Vengeance RGB, Trident Z, FURY Beast",
      ram: "16GB, 32GB, 64GB",
      storage: "DDR5-6000, DDR4-3600, DDR5-5600",
    },
  },
  "bo-nho": {
    label: "Bộ nhớ RAM",
    fields: ["brand", "model", "ram", "storage"],
    required: ["brand", "ram"],
    hints: {
      brand: "Corsair, G.Skill, Kingston",
      model: "Vengeance, Trident Z",
      ram: "16GB, 32GB, 64GB",
      storage: "DDR5, DDR4, Speed",
    },
  },
  motherboard: {
    label: "Mainboard",
    fields: ["brand", "model"],
    required: ["brand", "model"],
    hints: {
      brand: "ASUS, MSI, Gigabyte, ASRock",
      model: "ROG STRIX Z870-E, MPG B850-E EDGE",
    },
  },
  ssd: {
    label: "Ổ SSD",
    fields: ["brand", "model", "storage"],
    required: ["brand", "storage"],
    hints: {
      brand: "Samsung, SK Hynix, Micron, Western Digital",
      model: "990 Pro, P5 Plus, Rocket 4 Plus",
      storage: "250GB, 500GB, 1TB, 2TB, 4TB",
    },
  },
  hdd: {
    label: "Ổ HDD",
    fields: ["brand", "model", "storage"],
    required: ["brand", "storage"],
    hints: {
      brand: "Seagate, Western Digital, Toshiba",
      model: "Barracuda, Blue, IronWolf",
      storage: "500GB, 1TB, 2TB, 4TB, 8TB, 10TB",
    },
  },
  cooler: {
    label: "Tản nhiệt",
    fields: ["brand", "model"],
    required: ["brand", "model"],
    hints: {
      brand: "Noctua, Corsair, NZXT, Scythe",
      model: "NH-D15, Liquid Freezer, Kraken X73",
    },
  },
  case: {
    label: "Vỏ máy",
    fields: ["brand", "model"],
    required: ["brand", "model"],
    hints: {
      brand: "NZXT, Corsair, Lian Li, Fractal Design",
      model: "H7 Flow, 5000D, O11 Dynamic, North",
    },
  },
  power: {
    label: "Nguồn điện",
    fields: ["brand", "model", "storage"],
    required: ["brand", "model"],
    hints: {
      brand: "Corsair, MSI, Seasonic, EVGA",
      model: "HX1200i, MEG A850P+, Focus GX-850",
      storage: "650W, 750W, 850W, 1000W",
    },
  },
  monitor: {
    label: "Màn hình",
    fields: ["brand", "model", "ram"],
    required: ["brand", "model"],
    hints: {
      brand: "ASUS, LG, Dell, BenQ, AOC",
      model: "ProArt Display PA278QV, UltraGear",
      ram: '1080p, 1440p, 4K, 27", 32", 34"',
    },
  },
};

export default function AdminPage() {
  const { token, user, setSession, isAuthenticated, isHydrated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("dashboard");
  const [openMenuGroups, setOpenMenuGroups] = useState(() => {
    return navGroups.reduce((accumulator, group) => {
      accumulator[group.id] = group.id === "overview";
      return accumulator;
    }, {});
  });
  const [dashboard, setDashboard] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [savingUserId, setSavingUserId] = useState(null);
  const [userDraftById, setUserDraftById] = useState({});
  const [adminOrders, setAdminOrders] = useState([]);
  const [orderSearchKeyword, setOrderSearchKeyword] = useState("");
  const [orderSortBy, setOrderSortBy] = useState("newest");
  const [orderFilterStatus, setOrderFilterStatus] = useState("all");
  const [selectedOrderUserFilter, setSelectedOrderUserFilter] = useState(null);
  const [selectedOrderUserOrders, setSelectedOrderUserOrders] = useState([]);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [deletingOrderId, setDeletingOrderId] = useState(null);
  const [adminReturnRequests, setAdminReturnRequests] = useState([]);
  const [returnSearchKeyword, setReturnSearchKeyword] = useState("");
  const [returnStatusFilter, setReturnStatusFilter] = useState("all");
  const [isLoadingReturnRequests, setIsLoadingReturnRequests] = useState(false);
  const [updatingReturnRequestId, setUpdatingReturnRequestId] = useState(null);
  const [catalogCategories, setCatalogCategories] = useState([]);
  const [catalogBrands, setCatalogBrands] = useState([]);
  const [managedProducts, setManagedProducts] = useState([]);
  const [managedProductPage, setManagedProductPage] = useState(1);
  const [managedProductKeywordInput, setManagedProductKeywordInput] =
    useState("");
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
  const [displayOrderDraft, setDisplayOrderDraft] = useState([]);
  const [isSavingDisplayOrder, setIsSavingDisplayOrder] = useState(false);
  const [isLoadingDisplayOrder, setIsLoadingDisplayOrder] = useState(false);
  const [productDisplayMode, setProductDisplayMode] = useState("priority");
  const [deletingProductId, setDeletingProductId] = useState(null);
  const [isSavingVoucher, setIsSavingVoucher] = useState(false);
  const [editingVoucherId, setEditingVoucherId] = useState(null);
  const [deletingVoucherId, setDeletingVoucherId] = useState(null);
  const [selectedSummaryCard, setSelectedSummaryCard] = useState("users");
  const [rolePermissionDraftByRoleId, setRolePermissionDraftByRoleId] =
    useState({});
  const [savingRoleId, setSavingRoleId] = useState(null);
  const [permissionTargets, setPermissionTargets] = useState([]);
  const [selectedPermissionTargetId, setSelectedPermissionTargetId] =
    useState("");
  const [permissionDraftByUserId, setPermissionDraftByUserId] = useState({});
  const [savingPermissionTargetId, setSavingPermissionTargetId] =
    useState(null);
  const [selectedUserDetail, setSelectedUserDetail] = useState(null);
  const [isLoadingUserDetail, setIsLoadingUserDetail] = useState(false);
  const [isSavingUserDetail, setIsSavingUserDetail] = useState(false);
  const [selectedUserDraft, setSelectedUserDraft] = useState(null);
  const [userDetailError, setUserDetailError] = useState("");
  const [voucherForm, setVoucherForm] = useState({
    code: "",
    couponScope: "PRODUCT",
    discountType: "PERCENT",
    discountValue: "",
    minOrderValue: "0",
    usageLimit: "100",
    startDate: "",
    endDate: "",
    status: "ACTIVE",
    assignedUserIds: [],
  });
  const [productForm, setProductForm] = useState({
    name: "",
    productCode: "",
    categorySlug: "",
    supplierId: "",
    price: "",
    stockQuantity: "",
    warrantyMonths: "12",
    isHomepageFeatured: false,
    displayOrder: "9999",
    imageUrl: "",
    specBrand: "",
    specModel: "",
    specCpu: "",
    specRam: "",
    specStorage: "",
    specGpu: "",
    fullDescription: "",
    inTheBox: "",
    manualUrl: "",
    warrantyPolicy: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [featureSearchKeyword, setFeatureSearchKeyword] = useState("");
  const [userSearchKeyword, setUserSearchKeyword] = useState("");
  const [userStatusFilter, setUserStatusFilter] = useState("all");
  const [catalogSearchKeyword, setCatalogSearchKeyword] = useState("");
  const [voucherSearchKeyword, setVoucherSearchKeyword] = useState("");
  const [voucherStatusFilter, setVoucherStatusFilter] = useState("all");
  const [warehouseSearchKeyword, setWarehouseSearchKeyword] = useState("");
  const [warehouseOverview, setWarehouseOverview] = useState(null);
  const [isLoadingWarehouse, setIsLoadingWarehouse] = useState(false);
  const [isSavingWarehouse, setIsSavingWarehouse] = useState(false);
  const [isImportingBatch, setIsImportingBatch] = useState(false);
  const [warehouseForm, setWarehouseForm] = useState({
    name: "",
    address: "",
    managerName: "",
  });
  const [batchForm, setBatchForm] = useState({
    warehouseId: "",
    productId: "",
    supplierId: "",
    importPrice: "",
    quantity: "",
    batchCode: "",
  });
  const [reviewSearchKeyword, setReviewSearchKeyword] = useState("");
  const [reviewSortBy, setReviewSortBy] = useState("newest");
  const [reviewStatusFilter, setReviewStatusFilter] = useState("all");
  const [reviewQuickFilter, setReviewQuickFilter] = useState("all");
  const [selectedReviewId, setSelectedReviewId] = useState(null);
  const [adminReviews, setAdminReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(false);
  const [moderatingReviewId, setModeratingReviewId] = useState(null);
  const [deletingReviewId, setDeletingReviewId] = useState(null);
  const [replyingReviewId, setReplyingReviewId] = useState(null);
  const [reviewReplyDraftById, setReviewReplyDraftById] = useState({});

  useEffect(() => {
    const tabIdFromUrl = resolveTabIdFromLocation();
    if (tabIdFromUrl) {
      setActiveTab(tabIdFromUrl);
    }
  }, []);

  useEffect(() => {
    const currentTabFromUrl = resolveTabIdFromLocation();
    const targetHash = `#${activeTab}`;

    if (
      currentTabFromUrl === activeTab &&
      normalizeHash(window.location.hash || "") === targetHash
    ) {
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
          throw new Error(
            payload?.message || "Không tải được dữ liệu quản trị",
          );
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
          setRolePermissionDraftByRoleId(
            Object.fromEntries(
              (payload?.roles ?? []).map((item) => [
                item.id,
                Array.isArray(item.permissions) ? item.permissions : [],
              ]),
            ),
          );
        }

        try {
          const targetsResponse = await fetch("/api/admin/permission-targets", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (targetsResponse.ok) {
            const targetsPayload = await targetsResponse.json();
            if (!cancelled) {
              const targets = Array.isArray(targetsPayload?.users)
                ? targetsPayload.users
                : Array.isArray(targetsPayload)
                  ? targetsPayload
                  : [];

              setPermissionTargets(targets);
              setPermissionDraftByUserId(
                Object.fromEntries(
                  targets.map((item) => [
                    item.id,
                    Array.isArray(item.permissions) ? item.permissions : [],
                  ]),
                ),
              );

              if (!selectedPermissionTargetId && targets.length > 0) {
                setSelectedPermissionTargetId(String(targets[0].id));
              }
            }
          }
        } catch {
          if (!cancelled) {
            setPermissionTargets([]);
          }
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
          const products = Array.isArray(payload.products)
            ? payload.products
            : [];
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

  const loadDisplayOrderDraft = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoadingDisplayOrder(true);
    try {
      const response = await fetch("/api/products/display-order", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Không tải được thứ tự hiển thị");
      }

      setDisplayOrderDraft(
        (Array.isArray(payload) ? payload : []).map((item) => ({
          id: Number(item.id),
          name: String(item.name ?? ""),
          displayOrder: Number(item.displayOrder ?? 9999),
          isHomepageFeatured: Boolean(item.isHomepageFeatured),
          stockQuantity: Number(item.stockQuantity ?? 0),
        })),
      );
    } catch (error) {
      toast({
        title: "Không tải được thứ tự hiển thị",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setIsLoadingDisplayOrder(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !token || activeTab !== "products") {
      return;
    }

    loadDisplayOrderDraft();
  }, [activeTab, isAuthenticated, isHydrated, token, loadDisplayOrderDraft]);

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
        }
      } catch (error) {
        if (!cancelled) {
          toast({
            title: "Không tải được đơn hàng",
            description:
              error instanceof Error ? error.message : "Đã xảy ra lỗi",
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

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !token) {
      return;
    }

    const socket = connectChatSocket(token);
    if (!socket) {
      return;
    }

    const handleOrderStatusUpdated = async (payload) => {
      const changedOrderId = Number(payload?.orderId);
      if (!Number.isFinite(changedOrderId) || changedOrderId <= 0) {
        return;
      }

      try {
        const response = await fetch("/api/orders", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const ordersPayload = await response.json();
          setAdminOrders(Array.isArray(ordersPayload) ? ordersPayload : []);
        }
      } catch {
        // Keep silent to avoid noisy toasts on background sync.
      }

      if (Number(selectedOrderDetail?.id) === changedOrderId) {
        loadOrderDetail(changedOrderId);
      }
    };

    socket.on("order_status_updated", handleOrderStatusUpdated);

    return () => {
      socket.off("order_status_updated", handleOrderStatusUpdated);
    };
  }, [isAuthenticated, isHydrated, token, selectedOrderDetail?.id]);

  const loadWarehouseOverview = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoadingWarehouse(true);
    try {
      const response = await fetch("/api/admin/warehouse/overview", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Không tải được dữ liệu kho");
      }

      setWarehouseOverview(payload);
      setBatchForm((prev) => ({
        ...prev,
        warehouseId:
          prev.warehouseId || String(payload?.warehouses?.[0]?.id ?? ""),
        productId: prev.productId || String(payload?.products?.[0]?.id ?? ""),
        supplierId:
          prev.supplierId || String(payload?.suppliers?.[0]?.id ?? ""),
      }));
    } catch (error) {
      setWarehouseOverview(null);
      toast({
        title: "Không tải được dữ liệu kho",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setIsLoadingWarehouse(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !token) {
      return;
    }

    if (activeTab !== "warehouse") {
      return;
    }

    loadWarehouseOverview();
  }, [activeTab, isAuthenticated, isHydrated, token, loadWarehouseOverview]);

  const loadAdminReviews = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoadingReviews(true);
    try {
      const response = await fetch("/api/admin/reviews", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.message ?? "Không tải được danh sách đánh giá",
        );
      }

      const items = Array.isArray(payload?.items) ? payload.items : [];
      setAdminReviews(items);
      setReviewReplyDraftById(
        Object.fromEntries(
          items.map((item) => [Number(item.id), String(item.adminReply ?? "")]),
        ),
      );
    } catch (error) {
      setAdminReviews([]);
      toast({
        title: "Không tải được đánh giá",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setIsLoadingReviews(false);
    }
  }, [token, toast]);

  const loadAdminReturnRequests = useCallback(async () => {
    if (!token) {
      return;
    }

    setIsLoadingReturnRequests(true);
    try {
      const response = await fetch("/api/admin/returns", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Không tải được yêu cầu trả hàng");
      }

      setAdminReturnRequests(Array.isArray(payload) ? payload : []);
    } catch (error) {
      setAdminReturnRequests([]);
      toast({
        title: "Không tải được yêu cầu trả hàng",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setIsLoadingReturnRequests(false);
    }
  }, [token, toast]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !token || activeTab !== "reviews") {
      return;
    }

    loadAdminReviews();
  }, [activeTab, isAuthenticated, isHydrated, token, loadAdminReviews]);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !token || activeTab !== "returns") {
      return;
    }

    loadAdminReturnRequests();
  }, [activeTab, isAuthenticated, isHydrated, token, loadAdminReturnRequests]);

  async function handleReturnRequestAction(request, action) {
    if (!token || !request?.id) {
      return;
    }

    const requestId = Number(request.id);
    let endpoint = `/api/admin/returns/${requestId}/review`;
    let body = { action };

    if (action === "REJECT") {
      const rejectReason = window.prompt(
        "Nhập lý do từ chối yêu cầu trả hàng:",
        String(request.rejectReason ?? ""),
      );
      if (rejectReason === null) {
        return;
      }

      const normalizedRejectReason = String(rejectReason ?? "").trim();
      if (!normalizedRejectReason) {
        toast({
          title: "Thiếu lý do từ chối",
          description: "Vui lòng nhập lý do để từ chối yêu cầu trả hàng",
          variant: "destructive",
        });
        return;
      }

      body = { action: "REJECT", rejectReason: normalizedRejectReason };
    } else if (action === "APPROVE") {
      body = { action: "APPROVE" };
    } else if (action === "SHIPPING_BACK") {
      endpoint = `/api/admin/returns/${requestId}/shipping-back`;
      body = null;
    } else if (action === "RECEIVED") {
      endpoint = `/api/admin/returns/${requestId}/received`;
      body = null;
    } else if (action === "REFUND") {
      endpoint = `/api/admin/returns/${requestId}/refund`;
      body = null;
    }

    const confirmMessage =
      action === "APPROVE"
        ? "Duyệt yêu cầu trả hàng này?"
        : action === "REJECT"
          ? "Từ chối yêu cầu trả hàng này?"
          : action === "SHIPPING_BACK"
            ? "Đánh dấu đơn này đang được khách gửi trả?"
            : action === "RECEIVED"
              ? "Xác nhận đã nhận hàng trả về?"
              : "Xử lý hoàn tiền cho yêu cầu này?";

    if (!window.confirm(confirmMessage)) {
      return;
    }

    setUpdatingReturnRequestId(requestId);
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Không thể cập nhật yêu cầu trả hàng");
      }

      toast({
        title: "Đã cập nhật yêu cầu trả hàng",
        description: payload?.message ?? "Thao tác đã hoàn tất",
      });
      await loadAdminReturnRequests();
    } catch (error) {
      toast({
        title: "Cập nhật yêu cầu trả hàng thất bại",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setUpdatingReturnRequestId(null);
    }
  }

  async function moderateReview(review, shouldHide) {
    if (!token || !review?.id) {
      return;
    }

    const reviewId = Number(review.id);
    const hiddenReason = shouldHide
      ? window.prompt(
        "Nhập lý do ẩn đánh giá (không bắt buộc):",
        String(review.hiddenReason ?? ""),
      )
      : "";

    if (hiddenReason === null) {
      return;
    }

    setModeratingReviewId(reviewId);
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}/moderate`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isHidden: Boolean(shouldHide),
          hiddenReason: String(hiddenReason ?? "").trim() || undefined,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.message ?? "Không thể cập nhật trạng thái kiểm duyệt",
        );
      }

      setAdminReviews((prev) =>
        prev.map((item) => (Number(item.id) === reviewId ? payload : item)),
      );
      toast({
        title: shouldHide ? "Đã ẩn đánh giá" : "Đã hiện lại đánh giá",
      });
    } catch (error) {
      toast({
        title: "Cập nhật kiểm duyệt thất bại",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setModeratingReviewId(null);
    }
  }

  async function saveReviewReply(reviewId) {
    if (!token || !reviewId) {
      return;
    }

    const reply = String(reviewReplyDraftById[reviewId] ?? "").trim();
    if (!reply) {
      toast({
        title: "Nội dung phản hồi trống",
        description: "Vui lòng nhập nội dung phản hồi trước khi lưu",
        variant: "destructive",
      });
      return;
    }

    setReplyingReviewId(Number(reviewId));
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}/reply`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reply }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Không thể lưu phản hồi");
      }

      setAdminReviews((prev) =>
        prev.map((item) =>
          Number(item.id) === Number(reviewId) ? payload : item,
        ),
      );
      setReviewReplyDraftById((prev) => ({
        ...prev,
        [reviewId]: String(payload?.adminReply ?? ""),
      }));
      toast({ title: "Đã lưu phản hồi đánh giá" });
    } catch (error) {
      toast({
        title: "Lưu phản hồi thất bại",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setReplyingReviewId(null);
    }
  }

  async function removeReview(review) {
    if (!token || !review?.id) {
      return;
    }

    const shouldDelete = window.confirm(
      `Bạn có chắc muốn xóa đánh giá #${review.id}? Hành động này không thể hoàn tác.`,
    );
    if (!shouldDelete) {
      return;
    }

    const reviewId = Number(review.id);
    setDeletingReviewId(reviewId);
    try {
      const response = await fetch(`/api/admin/reviews/${reviewId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Không thể xóa đánh giá");
      }

      setAdminReviews((prev) =>
        prev.filter((item) => Number(item.id) !== reviewId),
      );
      toast({ title: "Đã xóa đánh giá" });
    } catch (error) {
      toast({
        title: "Xóa đánh giá thất bại",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setDeletingReviewId(null);
    }
  }

  async function updateOrderStatus(orderId, nextStatusOverride) {
    if (!token) {
      return;
    }

    const targetOrder = adminOrders.find(
      (order) => Number(order.id) === Number(orderId),
    );
    const nextStatus = String(nextStatusOverride ?? "")
      .trim()
      .toUpperCase();
    if (!nextStatus) {
      return;
    }

    if (!targetOrder) {
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

      if (selectedOrderDetail?.id === orderId) {
        await loadOrderDetail(orderId);
      }
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

  function renderOrderActionCell(item) {
    const orderStatus = String(item.orderStatus ?? "").toUpperCase();
    const paymentStatus = String(item.paymentStatus ?? "").toUpperCase();

    if (orderStatus === "CANCELLED") {
      return <span className="text-xs text-destructive">Đã hủy</span>;
    }

    if (orderStatus === "DELIVERED") {
      return <span className="text-xs text-emerald-600">Đã hoàn thành</span>;
    }

    if (orderStatus === "PENDING" && paymentStatus === "PAID") {
      return (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-emerald-600">
            Đã thanh toán, yêu cầu chuẩn bị hàng
          </span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={updatingOrderId === item.id}
              onClick={() => updateOrderStatus(item.id, "PROCESSING")}
            >
              Chuẩn bị xong
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={updatingOrderId === item.id}
              onClick={() => updateOrderStatus(item.id, "CANCELLED")}
            >
              Hủy đơn
            </Button>
          </div>
        </div>
      );
    }

    if (orderStatus === "PENDING") {
      return (
        <span className="text-xs text-muted-foreground">Chờ thanh toán</span>
      );
    }

    if (orderStatus === "PROCESSING") {
      return (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={updatingOrderId === item.id}
            onClick={() => updateOrderStatus(item.id, "SHIPPING")}
          >
            Đã giao hàng
          </Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={updatingOrderId === item.id}
            onClick={() => updateOrderStatus(item.id, "CANCELLED")}
          >
            Hủy đơn
          </Button>
        </div>
      );
    }

    if (orderStatus === "SHIPPING") {
      return (
        <Button
          size="sm"
          variant="outline"
          disabled={updatingOrderId === item.id}
          onClick={() => updateOrderStatus(item.id, "DELIVERED")}
        >
          Giao thành công
        </Button>
      );
    }

    return <span className="text-xs text-muted-foreground">-</span>;
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

  async function deleteOrder(orderId) {
    if (!token) {
      return;
    }

    const confirmed = window.confirm(`Bạn có chắc muốn xóa đơn #${orderId}?`);
    if (!confirmed) {
      return;
    }

    setDeletingOrderId(orderId);
    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Không thể xóa đơn hàng");
      }

      setAdminOrders((prev) =>
        prev.filter((item) => Number(item.id) !== Number(orderId)),
      );
      if (Number(selectedOrderDetail?.id) === Number(orderId)) {
        setSelectedOrderDetail(null);
      }

      toast({ title: "Đã xóa đơn hàng" });
    } catch (error) {
      toast({
        title: "Xóa đơn hàng thất bại",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setDeletingOrderId(null);
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

    setUserDetailError("");
    setIsLoadingUserDetail(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}/detail`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.message ?? "Không tải được chi tiết người dùng",
        );
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
      const message = error instanceof Error ? error.message : "Đã xảy ra lỗi";
      setUserDetailError(message);
      toast({
        title: "Không tải được hồ sơ người dùng",
        description: message,
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
      const response = await fetch(
        `/api/admin/users/${selectedUserDetail.id}`,
        {
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
            roleId: selectedUserDraft.roleId
              ? Number(selectedUserDraft.roleId)
              : null,
            status: selectedUserDraft.status,
          }),
        },
      );

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.message ?? "Không thể cập nhật hồ sơ người dùng",
        );
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
      isHomepageFeatured: false,
      displayOrder: "9999",
      imageUrl: "",
      specBrand: "",
      specModel: "",
      specCpu: "",
      specRam: "",
      specStorage: "",
      specGpu: "",
      fullDescription: "",
      inTheBox: "",
      manualUrl: "",
      warrantyPolicy: "",
    });
  }

  function startEditingProduct(product) {
    setEditingProductId(product.id);
    setSelectedImageFile(null);
    const specs = product.specifications ?? {};
    const detail = product.detail ?? {};
    setProductForm({
      name: String(product.name ?? ""),
      productCode: String(product.productCode ?? product.slug ?? ""),
      categorySlug: String(product.category?.slug ?? ""),
      supplierId: String(product.supplier?.id ?? ""),
      price: String(Number(product.price ?? 0)),
      stockQuantity: String(Number(product.stockQuantity ?? 0)),
      warrantyMonths: String(Number(product.warrantyMonths ?? 12)),
      isHomepageFeatured: Boolean(product.isHomepageFeatured),
      displayOrder: String(Number(product.displayOrder ?? 9999)),
      imageUrl: String(product.imageUrl ?? ""),
      specBrand: String(specs.brand ?? ""),
      specModel: String(specs.model ?? ""),
      specCpu: String(specs.cpu ?? ""),
      specRam: String(specs.ram ?? ""),
      specStorage: String(specs.storage ?? ""),
      specGpu: String(specs.gpu ?? ""),
      fullDescription: String(detail.fullDescription ?? ""),
      inTheBox: String(detail.inTheBox ?? ""),
      manualUrl: String(detail.manualUrl ?? ""),
      warrantyPolicy: String(detail.warrantyPolicy ?? ""),
    });
  }

  function validateProductForm() {
    const errors = [];

    // Validate tên sản phẩm
    if (!productForm.name.trim()) {
      errors.push("Tên sản phẩm không được để trống");
    }

    // Validate danh mục
    if (!productForm.categorySlug) {
      errors.push("Vui lòng chọn danh mục");
    }

    // Validate giá
    const price = Number(productForm.price);
    if (!productForm.price || price <= 0) {
      errors.push("Giá sản phẩm phải lớn hơn 0");
    }

    // Validate tồn kho
    const stockQuantity = Number(productForm.stockQuantity);
    if (productForm.stockQuantity === "" || stockQuantity < 0) {
      errors.push("Tồn kho không được âm");
    }

    const displayOrder = Number(productForm.displayOrder);
    if (!Number.isFinite(displayOrder) || displayOrder < 0) {
      errors.push("Thứ tự hiển thị phải >= 0");
    }

    // Validate field bắt buộc theo category
    const categoryConfig =
      CATEGORY_SPEC_CONFIG[productForm.categorySlug] ||
      CATEGORY_SPEC_CONFIG.default;
    const requiredFields = categoryConfig.required || [];

    requiredFields.forEach((fieldName) => {
      const formKey = `spec${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`;
      const fieldLabel = {
        brand: "Hãng sản xuất",
        model: "Mẫu",
        cpu: "CPU",
        ram: "RAM",
        storage: "Storage",
        gpu: "GPU",
      }[fieldName];

      if (!productForm[formKey]?.trim()) {
        errors.push(`${fieldLabel} là bắt buộc đối với danh mục này`);
      }
    });

    // Validate ảnh sản phẩm
    if (!productForm.imageUrl.trim() && !selectedImageFile) {
      errors.push("Vui lòng upload ảnh sản phẩm hoặc dán URL ảnh");
    }

    return { errors };
  }

  async function saveProduct() {
    if (!token) {
      return;
    }

    setIsSavingProduct(true);
    try {
      // Validate dữ liệu
      const validation = validateProductForm();
      const { errors: validationErrors } = validation;

      if (validationErrors.length > 0) {
        toast({
          title: "Dữ liệu không hợp lệ",
          description: validationErrors.join("\n"),
          variant: "destructive",
        });
        setIsSavingProduct(false);
        return;
      }

      const specifications = {
        brand: productForm.specBrand.trim(),
        model: productForm.specModel.trim(),
        cpu: productForm.specCpu.trim(),
        ram: productForm.specRam.trim(),
        storage: productForm.specStorage.trim(),
        gpu: productForm.specGpu.trim(),
      };

      const uploadedImageUrl = await uploadProductImageIfNeeded();
      const resolvedProductCode =
        productForm.productCode.trim() || buildProductCode(productForm.name);

      if (!resolvedProductCode) {
        throw new Error(
          "Vui lòng nhập tên sản phẩm để hệ thống tạo mã tự động",
        );
      }

      // Validate mã sản phẩm không trùng lặp
      const existingProduct = managedProducts.find(
        (p) =>
          p.productCode.toLowerCase() === resolvedProductCode.toLowerCase() &&
          p.id !== editingProductId,
      );
      if (existingProduct) {
        throw new Error(
          `Mã sản phẩm "${resolvedProductCode}" đã tồn tại. Vui lòng sử dụng mã khác.`,
        );
      }

      const payload = {
        name: productForm.name.trim(),
        productCode: resolvedProductCode,
        categorySlug: productForm.categorySlug,
        supplierId: productForm.supplierId
          ? Number(productForm.supplierId)
          : null,
        price: Number(productForm.price),
        stockQuantity: Number(productForm.stockQuantity),
        warrantyMonths: Number(productForm.warrantyMonths || 0),
        isHomepageFeatured: Boolean(productForm.isHomepageFeatured),
        displayOrder: Number(productForm.displayOrder || 9999),
        imageUrl: uploadedImageUrl,
        specifications,
        detail: {
          fullDescription: productForm.fullDescription.trim(),
          inTheBox: productForm.inTheBox.trim(),
          manualUrl: productForm.manualUrl.trim() || null,
          warrantyPolicy: productForm.warrantyPolicy.trim(),
        },
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
        title: editingProductId
          ? "Đã cập nhật sản phẩm"
          : "Đã thêm sản phẩm mới",
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

  async function saveDisplayOrderDraft() {
    if (!token || displayOrderDraft.length === 0) {
      return;
    }

    setIsSavingDisplayOrder(true);
    try {
      const payload = {
        items: displayOrderDraft.map((item, index) => ({
          id: Number(item.id),
          displayOrder: index,
        })),
      };

      const response = await fetch("/api/products/display-order", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          result?.message ?? "Không thể cập nhật thứ tự hiển thị",
        );
      }

      await Promise.all([refreshManagedProducts(), refreshDashboardSummary()]);
      await loadDisplayOrderDraft();
      toast({ title: "Đã lưu thứ tự hiển thị" });
    } catch (error) {
      toast({
        title: "Lưu thứ tự thất bại",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setIsSavingDisplayOrder(false);
    }
  }

  function prioritizeByName() {
    setDisplayOrderDraft((prev) =>
      [...prev].sort((a, b) => a.name.localeCompare(b.name, "vi")),
    );
  }

  async function fetchProductRankByQuery({ sort, featuredOnly = false }) {
    const pageSize = 50;
    let page = 1;
    const rankedItems = [];
    let totalPages = 1;

    while (page <= totalPages) {
      const query = new URLSearchParams();
      query.set("page", String(page));
      query.set("pageSize", String(pageSize));
      if (sort) {
        query.set("sort", sort);
      }
      if (featuredOnly) {
        query.set("featuredOnly", "true");
      }

      const response = await fetch(`/api/products?${query.toString()}`);
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.message ?? "Không tải được dữ liệu xếp hạng sản phẩm",
        );
      }

      rankedItems.push(...(Array.isArray(payload?.items) ? payload.items : []));
      totalPages = Number(payload?.pagination?.totalPages ?? 1);
      page += 1;
    }

    return rankedItems;
  }

  function reorderDraftByRankedItems(rankedItems) {
    setDisplayOrderDraft((prev) => {
      const prevById = new Map(prev.map((item) => [Number(item.id), item]));
      const used = new Set();

      const ordered = rankedItems
        .map((item) => {
          const id = Number(item?.id);
          const existing = prevById.get(id);
          if (!existing) {
            return null;
          }
          used.add(id);
          return {
            ...existing,
            stockQuantity: Number(
              item?.stockQuantity ?? existing.stockQuantity ?? 0,
            ),
            isHomepageFeatured: Boolean(
              item?.isHomepageFeatured ?? existing.isHomepageFeatured,
            ),
          };
        })
        .filter(Boolean);

      const remaining = prev.filter((item) => !used.has(Number(item.id)));
      return [...ordered, ...remaining];
    });
  }

  async function applyProductDisplayMode(mode) {
    setProductDisplayMode(mode);

    try {
      if (mode === "priority") {
        await loadDisplayOrderDraft();
        return;
      }

      if (mode === "name") {
        prioritizeByName();
        return;
      }

      if (mode === "stock") {
        setDisplayOrderDraft((prev) =>
          [...prev].sort(
            (a, b) =>
              Number(b.stockQuantity ?? 0) - Number(a.stockQuantity ?? 0) ||
              a.name.localeCompare(b.name, "vi"),
          ),
        );
        return;
      }

      if (mode === "featured") {
        setDisplayOrderDraft((prev) =>
          [...prev].sort(
            (a, b) =>
              Number(Boolean(b.isHomepageFeatured)) -
              Number(Boolean(a.isHomepageFeatured)) ||
              Number(a.displayOrder ?? 9999) - Number(b.displayOrder ?? 9999),
          ),
        );
        return;
      }

      const sortMap = {
        bestSelling: "best_selling",
        newest: "newest",
        priceAsc: "price_asc",
        priceDesc: "price_desc",
      };

      const sort = sortMap[mode];
      if (!sort) {
        return;
      }

      const rankedItems = await fetchProductRankByQuery({ sort });
      reorderDraftByRankedItems(rankedItems);
    } catch (error) {
      toast({
        title: "Không áp dụng được chế độ hiển thị",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    }
  }

  function moveDisplayOrderItem(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
      return;
    }

    setDisplayOrderDraft((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      if (!moved) {
        return prev;
      }
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  async function toggleHomepageFeatured(product) {
    if (!token || !product?.id) {
      return;
    }

    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isHomepageFeatured: !Boolean(product.isHomepageFeatured),
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.message ?? "Không thể cập nhật trạng thái nổi bật",
        );
      }

      await Promise.all([refreshManagedProducts(), refreshDashboardSummary()]);
      await loadDisplayOrderDraft();
      toast({ title: "Đã cập nhật sản phẩm nổi bật" });
    } catch (error) {
      toast({
        title: "Không thể cập nhật nổi bật",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    }
  }

  async function deleteWalletTransaction(userId, transactionId) {
    if (!token) {
      return;
    }

    const shouldDelete = window.confirm(
      "Bạn có chắc muốn xóa giao dịch ví này? Hành động này không thể hoàn tác.",
    );
    if (!shouldDelete) {
      return;
    }

    try {
      const response = await fetch(
        `/api/admin/users/${userId}/wallet-transactions/${transactionId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Xóa giao dịch ví thất bại");
      }

      // Remove transaction from selectedUserDetail
      setSelectedUserDetail((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          walletTransactions: (prev.walletTransactions ?? []).filter(
            (tx) => tx.id !== transactionId,
          ),
        };
      });

      toast({
        title: "Đã xóa giao dịch ví",
        description: "Giao dịch ví đã được xóa thành công",
      });
    } catch (error) {
      toast({
        title: "Không thể xóa giao dịch",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
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
      const normalizedCode = voucherForm.code.trim().toUpperCase();
      const discountValue = Number(voucherForm.discountValue);
      const minOrderValue = Number(voucherForm.minOrderValue || 0);
      const usageLimit = Number(voucherForm.usageLimit || 100);
      const startDate = voucherForm.startDate
        ? new Date(voucherForm.startDate)
        : null;
      const endDate = voucherForm.endDate
        ? new Date(voucherForm.endDate)
        : null;

      if (!normalizedCode) {
        throw new Error("Mã giảm giá không được để trống");
      }
      if (!Number.isFinite(discountValue) || discountValue <= 0) {
        throw new Error("Giá trị giảm phải lớn hơn 0");
      }
      if (!Number.isFinite(minOrderValue) || minOrderValue < 0) {
        throw new Error("Đơn tối thiểu phải >= 0");
      }
      if (!Number.isFinite(usageLimit) || usageLimit <= 0) {
        throw new Error("Số lượt dùng phải lớn hơn 0");
      }
      if (!startDate || Number.isNaN(startDate.getTime())) {
        throw new Error("Vui lòng chọn thời gian bắt đầu hợp lệ");
      }
      if (!endDate || Number.isNaN(endDate.getTime())) {
        throw new Error("Vui lòng chọn thời gian kết thúc hợp lệ");
      }
      if (endDate <= startDate) {
        throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
      }

      const payload = {
        code: normalizedCode,
        couponScope: voucherForm.couponScope,
        discountType: voucherForm.discountType,
        discountValue,
        minOrderValue,
        usageLimit,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: voucherForm.status,
        assignedUserIds: (voucherForm.assignedUserIds ?? []).map((value) =>
          Number(value),
        ),
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
        const fieldMessage = extractIssueMessage(result?.issues);
        throw new Error(
          fieldMessage || result?.message || "Tạo voucher thất bại",
        );
      }

      setVoucherForm({
        code: "",
        couponScope: "PRODUCT",
        discountType: "PERCENT",
        discountValue: "",
        minOrderValue: "0",
        usageLimit: "100",
        startDate: "",
        endDate: "",
        status: "ACTIVE",
        assignedUserIds: [],
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

  function extractIssueMessage(issues) {
    if (!issues || typeof issues !== "object") {
      return "";
    }

    const fieldErrors = issues?.fieldErrors;
    if (fieldErrors && typeof fieldErrors === "object") {
      for (const value of Object.values(fieldErrors)) {
        if (Array.isArray(value) && value.length > 0 && value[0]) {
          return String(value[0]);
        }
      }
    }

    const formErrors = issues?.formErrors;
    if (Array.isArray(formErrors) && formErrors.length > 0 && formErrors[0]) {
      return String(formErrors[0]);
    }

    return "";
  }

  function beginEditVoucher(item) {
    if (!item?.id) {
      return;
    }

    setEditingVoucherId(item.id);
    setVoucherForm({
      code: String(item.code ?? ""),
      couponScope: String(item.couponScope ?? "PRODUCT"),
      discountType: String(item.discountType ?? "PERCENT"),
      discountValue: String(item.discountValue ?? ""),
      minOrderValue: String(item.minOrderValue ?? "0"),
      usageLimit: String(item.usageLimit ?? "100"),
      startDate: item.startDate ? new Date(item.startDate).toISOString().slice(0, 16) : "",
      endDate: item.endDate ? new Date(item.endDate).toISOString().slice(0, 16) : "",
      status: String(item.status ?? "ACTIVE"),
      assignedUserIds: (item.assignedUsers ?? []).map((user) => Number(user.id)),
    });
  }

  async function updateVoucher() {
    if (!token || !editingVoucherId) {
      return;
    }

    setIsSavingVoucher(true);
    try {
      const normalizedCode = voucherForm.code.trim().toUpperCase();
      const discountValue = Number(voucherForm.discountValue);
      const minOrderValue = Number(voucherForm.minOrderValue || 0);
      const usageLimit = Number(voucherForm.usageLimit || 100);
      const startDate = voucherForm.startDate ? new Date(voucherForm.startDate) : null;
      const endDate = voucherForm.endDate ? new Date(voucherForm.endDate) : null;

      if (!normalizedCode) {
        throw new Error("Mã giảm giá không được để trống");
      }
      if (!Number.isFinite(discountValue) || discountValue <= 0) {
        throw new Error("Giá trị giảm phải lớn hơn 0");
      }
      if (!Number.isFinite(minOrderValue) || minOrderValue < 0) {
        throw new Error("Đơn tối thiểu phải >= 0");
      }
      if (!Number.isFinite(usageLimit) || usageLimit <= 0) {
        throw new Error("Số lượt dùng phải lớn hơn 0");
      }
      if (!startDate || Number.isNaN(startDate.getTime())) {
        throw new Error("Vui lòng chọn thời gian bắt đầu hợp lệ");
      }
      if (!endDate || Number.isNaN(endDate.getTime())) {
        throw new Error("Vui lòng chọn thời gian kết thúc hợp lệ");
      }
      if (endDate <= startDate) {
        throw new Error("Thời gian kết thúc phải sau thời gian bắt đầu");
      }

      const payload = {
        code: normalizedCode,
        couponScope: voucherForm.couponScope,
        discountType: voucherForm.discountType,
        discountValue,
        minOrderValue,
        usageLimit,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        status: voucherForm.status,
        assignedUserIds: (voucherForm.assignedUserIds ?? []).map((value) => Number(value)),
      };

      const response = await fetch(`/api/admin/coupons/${editingVoucherId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        const fieldMessage = extractIssueMessage(result?.issues);
        throw new Error(fieldMessage || result?.message || "Cập nhật voucher thất bại");
      }

      await refreshDashboardSummary();
      toast({ title: "Đã cập nhật voucher" });
      setEditingVoucherId(null);
    } catch (error) {
      toast({
        title: "Không thể cập nhật voucher",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setIsSavingVoucher(false);
    }
  }

  async function deleteVoucher(item) {
    if (!token || !item?.id) {
      return;
    }

    const shouldDelete = window.confirm(
      `Bạn có chắc muốn xóa voucher ${item.code}? Voucher đã dùng sẽ không xóa được.`,
    );
    if (!shouldDelete) {
      return;
    }

    setDeletingVoucherId(item.id);
    try {
      const response = await fetch(`/api/admin/coupons/${item.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Xóa voucher thất bại");
      }

      await refreshDashboardSummary();
      toast({ title: "Đã xóa voucher" });
    } catch (error) {
      toast({
        title: "Không thể xóa voucher",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setDeletingVoucherId(null);
    }
  }

  async function createWarehouse() {
    if (!token) {
      return;
    }

    if (!warehouseForm.name.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Tên kho không được để trống",
        variant: "destructive",
      });
      return;
    }

    setIsSavingWarehouse(true);
    try {
      const response = await fetch("/api/admin/warehouses", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: warehouseForm.name.trim(),
          address: warehouseForm.address.trim() || null,
          managerName: warehouseForm.managerName.trim() || null,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Không thể tạo kho mới");
      }

      setWarehouseForm({
        name: "",
        address: "",
        managerName: "",
      });

      await Promise.all([loadWarehouseOverview(), refreshDashboardSummary()]);
      toast({ title: "Đã tạo kho mới" });
    } catch (error) {
      toast({
        title: "Không thể tạo kho",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setIsSavingWarehouse(false);
    }
  }

  async function importBatchIntoWarehouse() {
    if (!token) {
      return;
    }

    if (
      !batchForm.warehouseId ||
      !batchForm.productId ||
      !batchForm.supplierId ||
      !batchForm.importPrice ||
      !batchForm.quantity
    ) {
      toast({
        title: "Thiếu thông tin",
        description:
          "Vui lòng chọn kho, sản phẩm, nhà cung cấp, giá nhập và số lượng",
        variant: "destructive",
      });
      return;
    }

    setIsImportingBatch(true);
    try {
      const response = await fetch("/api/admin/warehouse/import-batch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          warehouseId: Number(batchForm.warehouseId),
          productId: Number(batchForm.productId),
          supplierId: Number(batchForm.supplierId),
          importPrice: Number(batchForm.importPrice),
          quantity: Number(batchForm.quantity),
          batchCode: batchForm.batchCode.trim() || undefined,
        }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(payload?.message ?? "Không thể nhập lô hàng");
      }

      setBatchForm((prev) => ({
        ...prev,
        importPrice: "",
        quantity: "",
        batchCode: "",
      }));

      await Promise.all([
        loadWarehouseOverview(),
        refreshDashboardSummary(),
        refreshManagedProducts(),
      ]);
      toast({ title: "Đã nhập lô hàng và cập nhật tồn kho" });
    } catch (error) {
      toast({
        title: "Không thể nhập lô",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    } finally {
      setIsImportingBatch(false);
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

  const orderStatusChartData = useMemo(() => {
    if (!dashboard?.orderStatuses) {
      return [];
    }

    return dashboard.orderStatuses.map((item) => ({
      name: formatEnum(item.orderStatus),
      value: item._count?.orderStatus ?? 0,
    }));
  }, [dashboard]);

  const userStatusChartData = useMemo(() => {
    if (!dashboard?.userStatuses) {
      return [];
    }

    return dashboard.userStatuses.map((item) => ({
      name: formatEnum(item.status),
      value: item._count?.status ?? 0,
    }));
  }, [dashboard]);

  const displayedOrders = useMemo(() => {
    let filtered = [];

    if (selectedOrderUserFilter?.id) {
      if (selectedOrderUserOrders.length > 0) {
        filtered = selectedOrderUserOrders;
      } else {
        filtered = adminOrders.filter(
          (item) =>
            Number(item.customer?.id) === Number(selectedOrderUserFilter.id),
        );
      }
    } else {
      filtered = adminOrders;
    }

    // Apply search filter
    if (orderSearchKeyword.trim()) {
      const keyword = orderSearchKeyword.toLowerCase().trim();
      filtered = filtered.filter((item) => {
        const orderId = String(item.id).toLowerCase();
        const customerName = (item.customer?.fullName ?? "").toLowerCase();
        const customerEmail = (item.customer?.email ?? "").toLowerCase();
        return (
          orderId.includes(keyword) ||
          customerName.includes(keyword) ||
          customerEmail.includes(keyword)
        );
      });
    }

    // Apply status filter
    if (orderFilterStatus !== "all") {
      filtered = filtered.filter(
        (item) => item.orderStatus === orderFilterStatus,
      );
    }

    // Apply sort
    if (orderSortBy === "newest") {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (orderSortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (orderSortBy === "highest-amount") {
      filtered.sort((a, b) => (b.totalAmount ?? 0) - (a.totalAmount ?? 0));
    } else if (orderSortBy === "lowest-amount") {
      filtered.sort((a, b) => (a.totalAmount ?? 0) - (b.totalAmount ?? 0));
    }

    return filtered;
  }, [
    adminOrders,
    selectedOrderUserFilter,
    selectedOrderUserOrders,
    orderSearchKeyword,
    orderSortBy,
    orderFilterStatus,
  ]);

  const filteredUsers = useMemo(() => {
    let filtered = dashboard?.users ?? [];

    if (userSearchKeyword.trim()) {
      const keyword = userSearchKeyword.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          (item.fullName ?? "").toLowerCase().includes(keyword) ||
          (item.email ?? "").toLowerCase().includes(keyword) ||
          (item.phone ?? "").includes(keyword),
      );
    }

    if (userStatusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === userStatusFilter);
    }

    return filtered;
  }, [dashboard, userSearchKeyword, userStatusFilter]);

  const filteredSuppliers = useMemo(() => {
    let filtered = dashboard?.suppliers ?? [];

    if (catalogSearchKeyword.trim()) {
      const keyword = catalogSearchKeyword.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          (item.name ?? "").toLowerCase().includes(keyword) ||
          (item.email ?? "").toLowerCase().includes(keyword) ||
          (item.phone ?? "").includes(keyword),
      );
    }

    return filtered;
  }, [dashboard, catalogSearchKeyword]);

  const filteredCoupons = useMemo(() => {
    let filtered = dashboard?.coupons ?? [];

    if (voucherSearchKeyword.trim()) {
      const keyword = voucherSearchKeyword.toLowerCase().trim();
      filtered = filtered.filter((item) =>
        (item.code ?? "").toLowerCase().includes(keyword),
      );
    }

    if (voucherStatusFilter !== "all") {
      filtered = filtered.filter((item) => item.status === voucherStatusFilter);
    }

    return filtered;
  }, [dashboard, voucherSearchKeyword, voucherStatusFilter]);

  const filteredReviews = useMemo(() => {
    let filtered = Array.isArray(adminReviews) ? [...adminReviews] : [];

    if (reviewSearchKeyword.trim()) {
      const keyword = reviewSearchKeyword.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          (item.user?.fullName ?? "").toLowerCase().includes(keyword) ||
          (item.user?.email ?? "").toLowerCase().includes(keyword) ||
          (item.product?.name ?? "").toLowerCase().includes(keyword) ||
          (item.comment ?? "").toLowerCase().includes(keyword) ||
          (item.adminReply ?? "").toLowerCase().includes(keyword),
      );
    }

    if (reviewStatusFilter === "visible") {
      filtered = filtered.filter((item) => !item.isHidden);
    }
    if (reviewStatusFilter === "hidden") {
      filtered = filtered.filter((item) => Boolean(item.isHidden));
    }

    if (reviewQuickFilter === "needs-reply") {
      filtered = filtered.filter(
        (item) => !String(item.adminReply ?? "").trim(),
      );
    } else if (reviewQuickFilter === "low-rating") {
      filtered = filtered.filter((item) => Number(item.rating ?? 0) <= 2);
    } else if (reviewQuickFilter === "recent-24h") {
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      filtered = filtered.filter((item) => {
        const createdAt = new Date(item.createdAt).getTime();
        return Number.isFinite(createdAt) && createdAt >= cutoff;
      });
    } else if (reviewQuickFilter === "replied") {
      filtered = filtered.filter((item) =>
        Boolean(String(item.adminReply ?? "").trim()),
      );
    }

    if (reviewSortBy === "newest") {
      filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (reviewSortBy === "oldest") {
      filtered.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    } else if (reviewSortBy === "highest-rating") {
      filtered.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
    } else if (reviewSortBy === "lowest-rating") {
      filtered.sort((a, b) => (a.rating ?? 0) - (b.rating ?? 0));
    }

    return filtered;
  }, [
    adminReviews,
    reviewQuickFilter,
    reviewSearchKeyword,
    reviewSortBy,
    reviewStatusFilter,
  ]);

  const reviewOverview = useMemo(() => {
    const items = Array.isArray(adminReviews) ? adminReviews : [];
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    return {
      total: items.length,
      hidden: items.filter((item) => Boolean(item.isHidden)).length,
      waitingReply: items.filter(
        (item) => !String(item.adminReply ?? "").trim(),
      ).length,
      lowRating: items.filter((item) => Number(item.rating ?? 0) <= 2).length,
      recent24h: items.filter((item) => {
        const createdAt = new Date(item.createdAt).getTime();
        return Number.isFinite(createdAt) && now - createdAt <= oneDay;
      }).length,
    };
  }, [adminReviews]);

  const selectedReview = useMemo(
    () =>
      filteredReviews.find(
        (item) => Number(item.id) === Number(selectedReviewId),
      ) ??
      filteredReviews[0] ??
      null,
    [filteredReviews, selectedReviewId],
  );

  useEffect(() => {
    if (selectedReview) {
      if (Number(selectedReviewId) !== Number(selectedReview.id)) {
        setSelectedReviewId(Number(selectedReview.id));
      }
      return;
    }

    if (selectedReviewId !== null) {
      setSelectedReviewId(null);
    }
  }, [selectedReview, selectedReviewId]);

  const filteredWarehouses = useMemo(() => {
    let filtered = warehouseOverview?.warehouses ?? dashboard?.warehouses ?? [];

    if (warehouseSearchKeyword.trim()) {
      const keyword = warehouseSearchKeyword.toLowerCase().trim();
      filtered = filtered.filter(
        (item) =>
          (item.name ?? "").toLowerCase().includes(keyword) ||
          (item.address ?? "").toLowerCase().includes(keyword) ||
          (item.managerName ?? "").toLowerCase().includes(keyword),
      );
    }

    return filtered;
  }, [dashboard, warehouseOverview, warehouseSearchKeyword]);

  const warehouseRecentBatches = useMemo(
    () => warehouseOverview?.batches ?? [],
    [warehouseOverview],
  );

  const warehouseSummary = useMemo(
    () =>
      warehouseOverview?.summary ?? {
        totalWarehouses: filteredWarehouses.length,
        totalBatches: 0,
        totalProducts: 0,
        totalStockQuantity: 0,
      },
    [warehouseOverview, filteredWarehouses.length],
  );

  async function openUserOrders(user) {
    if (!token || !user?.id) {
      return;
    }

    try {
      setSelectedOrderUserFilter({
        id: user.id,
        fullName: user.fullName ?? user.email,
      });
      setActiveTab("orders");

      const response = await fetch(`/api/admin/users/${user.id}/detail`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(
          payload?.message ?? "Không tải được đơn hàng của người dùng",
        );
      }

      const mappedOrders = (
        Array.isArray(payload?.orders) ? payload.orders : []
      ).map((order) => ({
        ...order,
        customer: {
          id: user.id,
          fullName: user.fullName ?? user.email,
          email: user.email ?? "-",
        },
        itemCount: Number(order.itemCount ?? order.orderItems?.length ?? 0),
      }));

      setSelectedOrderUserOrders(mappedOrders);
    } catch (error) {
      setSelectedOrderUserOrders([]);
      toast({
        title: "Không tải được đơn của người dùng",
        description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
        variant: "destructive",
      });
    }
  }

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
    const usersRows = (dashboard?.users ?? [])
      .slice(0, 8)
      .map((item) => [
        item.fullName ?? "-",
        item.email ?? "-",
        item.role?.name ?? "User",
        statusBadge(formatEnum(item.status)),
      ]);

    const ordersRows = (adminOrders ?? [])
      .slice(0, 8)
      .map((item) => [
        `#${item.id}`,
        item.customer?.fullName ?? item.customer?.email ?? "-",
        formatMoney(item.totalAmount),
        statusBadge(formatEnum(item.paymentStatus)),
        statusBadge(formatEnum(item.orderStatus)),
      ]);

    const productRows = (managedProducts ?? [])
      .slice(0, 8)
      .map((item) => [
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
        formatMoney(
          paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0,
        ),
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
        columns: [
          "Mã đơn",
          "Khách hàng",
          "Tổng tiền",
          "Thanh toán",
          "Trạng thái",
        ],
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

  const currentUserPermissions = useMemo(
    () => normalizePermissionActions(user?.permissions),
    [user?.permissions],
  );

  const allowedNavItems = useMemo(
    () =>
      navItems.filter((item) =>
        canAccessAdminTab(item.id, {
          email: user?.email,
          role: user?.role,
          permissions: currentUserPermissions,
        }),
      ),
    [currentUserPermissions, user?.email, user?.role],
  );

  const allowedNavItemById = useMemo(
    () => new Map(allowedNavItems.map((item) => [item.id, item])),
    [allowedNavItems],
  );

  const visibleMenuGroups = useMemo(
    () =>
      navGroups
        .map((group) => ({
          ...group,
          items: group.tabIds
            .map((tabId) => allowedNavItemById.get(tabId))
            .filter(Boolean),
        }))
        .filter((group) => group.items.length > 0),
    [allowedNavItemById],
  );

  const permissionCatalog = useMemo(() => {
    const fromDashboard = Array.isArray(dashboard?.permissionCatalog)
      ? dashboard.permissionCatalog
      : [];

    if (fromDashboard.length > 0) {
      return fromDashboard;
    }

    return Array.from(
      new Set(
        (dashboard?.roles ?? []).flatMap((role) => role.permissions ?? []),
      ),
    )
      .sort((a, b) => String(a).localeCompare(String(b)))
      .map((actionName) => ({
        actionName,
        description: "",
      }));
  }, [dashboard]);

  const menuPermissionOptions = useMemo(() => {
    const descriptionByAction = new Map(
      permissionCatalog.map((item) => [
        item.actionName,
        item.description ?? "",
      ]),
    );

    const dedupedByAction = new Map();

    for (const item of navItems) {
      const actionName = tabPermissionMap[item.id];
      if (!actionName || dedupedByAction.has(actionName)) {
        continue;
      }

      dedupedByAction.set(actionName, {
        tabId: item.id,
        label: item.label,
        actionName,
        description: descriptionByAction.get(actionName) ?? "",
      });
    }

    return Array.from(dedupedByAction.values());
  }, [permissionCatalog]);

  const toggleRolePermission = useCallback((roleId, permission, checked) => {
    setRolePermissionDraftByRoleId((prev) => {
      const current = new Set(
        Array.isArray(prev?.[roleId]) ? prev[roleId] : [],
      );
      if (checked) {
        current.add(permission);
      } else {
        current.delete(permission);
      }

      return {
        ...prev,
        [roleId]: Array.from(current),
      };
    });
  }, []);

  const saveRolePermissions = useCallback(
    async (role) => {
      const roleId = Number(role?.id);
      if (!Number.isFinite(roleId) || roleId <= 0) {
        return;
      }

      try {
        setSavingRoleId(roleId);
        const response = await fetch(`/api/admin/roles/${roleId}/permissions`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            permissions: rolePermissionDraftByRoleId[roleId] ?? [],
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload?.message || "Không thể lưu phân quyền");
        }

        setDashboard((prev) => {
          if (!prev) {
            return prev;
          }

          const nextRoles = (prev.roles ?? []).map((item) =>
            Number(item.id) === roleId
              ? { ...item, permissions: payload.permissions ?? [] }
              : item,
          );

          return {
            ...prev,
            roles: nextRoles,
          };
        });

        if (String(user?.role ?? "") === String(role?.name ?? "")) {
          try {
            const meResponse = await fetch("/api/auth/me", {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (meResponse.ok) {
              const refreshedUser = await meResponse.json();
              setSession({
                token,
                user: refreshedUser,
              });
            }
          } catch {
            // Ignore refresh errors to keep permission save successful.
          }
        }

        toast({
          title: "Đã cập nhật phân quyền",
          description: `Vai trò ${role?.name ?? roleId} đã được lưu quyền mới`,
        });
      } catch (error) {
        toast({
          title: "Lưu phân quyền thất bại",
          description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
          variant: "destructive",
        });
      } finally {
        setSavingRoleId(null);
      }
    },
    [rolePermissionDraftByRoleId, setSession, toast, token, user?.role],
  );

  const selectedPermissionTarget = useMemo(
    () =>
      permissionTargets.find(
        (item) => String(item.id) === String(selectedPermissionTargetId),
      ) ?? null,
    [permissionTargets, selectedPermissionTargetId],
  );

  const effectiveSelectedPermissionDraft = useMemo(() => {
    if (!selectedPermissionTarget) {
      return [];
    }

    if (
      String(selectedPermissionTarget?.email ?? "")
        .trim()
        .toLowerCase() === "admin@gmail.com"
    ) {
      return permissionCatalog.map((permission) => permission.actionName);
    }

    return normalizePermissionActions(
      permissionDraftByUserId[selectedPermissionTarget.id] ??
      selectedPermissionTarget.permissions ??
      [],
    );
  }, [permissionCatalog, permissionDraftByUserId, selectedPermissionTarget]);

  const toggleUserPermission = useCallback((userId, permission, checked) => {
    setPermissionDraftByUserId((prev) => {
      const current = new Set(
        Array.isArray(prev?.[userId]) ? prev[userId] : [],
      );
      if (checked) {
        current.add(permission);
      } else {
        current.delete(permission);
      }

      return {
        ...prev,
        [userId]: Array.from(current),
      };
    });
  }, []);

  const saveUserPermissions = useCallback(
    async (permissionTarget) => {
      const userId = Number(permissionTarget?.id);
      if (!Number.isFinite(userId) || userId <= 0) {
        return;
      }

      const allowedPermissionActions = new Set(
        menuPermissionOptions.map((item) => item.actionName),
      );
      const permissionsToSave = normalizePermissionActions(
        (permissionDraftByUserId[userId] ?? []).filter((item) =>
          allowedPermissionActions.has(String(item ?? "")),
        ),
      );

      try {
        setSavingPermissionTargetId(userId);
        const response = await fetch(`/api/admin/users/${userId}/permissions`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            permissions: permissionsToSave,
          }),
        });

        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(
            payload?.message || "Không thể lưu phân quyền tài khoản",
          );
        }

        setPermissionTargets((prev) =>
          (prev ?? []).map((item) =>
            Number(item.id) === userId
              ? {
                ...item,
                permissions: payload.permissions ?? [],
                roleId: payload.roleId ?? item.roleId,
                role: payload.role ?? item.role,
              }
              : item,
          ),
        );

        setPermissionDraftByUserId((prev) => ({
          ...prev,
          [userId]: payload.permissions ?? [],
        }));

        if (String(user?.id ?? "") === String(userId)) {
          try {
            const meResponse = await fetch("/api/auth/me", {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            });

            if (meResponse.ok) {
              const refreshedUser = await meResponse.json();
              setSession({
                token,
                user: refreshedUser,
              });
            }
          } catch {
            // Ignore refresh errors to keep permission save successful.
          }
        }

        toast({
          title: "Đã cập nhật quyền tài khoản",
          description: `Tài khoản ${permissionTarget?.email ?? userId} đã được lưu quyền mới`,
        });
      } catch (error) {
        toast({
          title: "Lưu quyền tài khoản thất bại",
          description: error instanceof Error ? error.message : "Đã xảy ra lỗi",
          variant: "destructive",
        });
      } finally {
        setSavingPermissionTargetId(null);
      }
    },
    [
      menuPermissionOptions,
      permissionDraftByUserId,
      setSession,
      toast,
      token,
      user?.id,
    ],
  );

  useEffect(() => {
    if (allowedNavItems.length === 0) {
      return;
    }

    const hasActiveTab = allowedNavItems.some((item) => item.id === activeTab);
    if (!hasActiveTab) {
      setActiveTab(allowedNavItems[0].id);
    }
  }, [activeTab, allowedNavItems]);

  useEffect(() => {
    const activeGroupId = tabGroupByTabId[activeTab];
    if (!activeGroupId) {
      return;
    }

    setOpenMenuGroups((prev) => ({
      ...prev,
      [activeGroupId]: true,
    }));
  }, [activeTab]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [activeTab]);

  useEffect(() => {
    if (activeTab === "products-create" && editingProductId) {
      resetProductForm();
    }
  }, [activeTab, editingProductId]);

  const sectionClassName = (tabId) =>
    `space-y-6 ${activeTab === tabId ? "block" : "hidden"}`;

  const isProductCreateTab = activeTab === "products-create";
  const isProductInventoryTab = activeTab === "products-inventory";
  const isProductEditTab = activeTab === "products-edit";

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,_rgba(255,255,255,1)_0%,_rgba(240,253,250,1)_100%)]">
      <Navbar />

      <div className="mx-auto max-w-[1600px] px-4 pb-10 pt-24 lg:px-6">
        <aside className="hidden lg:fixed lg:top-24 lg:block lg:w-72">
          <div className="max-h-[calc(100vh-7.5rem)] space-y-4 overflow-y-auto rounded-3xl border border-border/60 bg-white/85 p-5 shadow-[0_20px_70px_rgba(15,23,42,0.08)] backdrop-blur">
            <h1 className="text-xl font-bold">Trang quản trị</h1>

            <div className="space-y-2">
              {visibleMenuGroups.map((group) => {
                const isOpen = Boolean(openMenuGroups[group.id]);

                return (
                  <Collapsible
                    key={group.id}
                    open={isOpen}
                    onOpenChange={(nextOpen) => {
                      setOpenMenuGroups((prev) => ({
                        ...prev,
                        [group.id]: nextOpen,
                      }));
                    }}
                    className="rounded-2xl border border-border/60 bg-white/70"
                  >
                    <CollapsibleTrigger className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:bg-secondary/70">
                      <span>{group.label}</span>
                      <ChevronRight
                        className={`h-4 w-4 text-slate-500 transition-transform ${isOpen ? "rotate-90" : ""}`}
                      />
                    </CollapsibleTrigger>

                    <CollapsibleContent className="space-y-1 px-2 pb-2">
                      {group.items.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveTab(item.id)}
                          className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition ${activeTab === item.id
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
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
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
                {visibleMenuGroups.map((group) => (
                  <optgroup key={group.id} label={group.label}>
                    {group.items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}
                      </option>
                    ))}
                  </optgroup>
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
                <p className="text-sm text-muted-foreground">
                  Vui lòng chờ trong giây lát.
                </p>
              </Panel>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  {summaryCards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      onClick={() => setSelectedSummaryCard(card.id)}
                      className={`rounded-3xl border bg-white p-5 text-left shadow-sm transition ${selectedSummaryCard === card.id
                        ? "border-primary ring-2 ring-primary/20"
                        : "hover:border-primary/50"
                        }`}
                    >
                      <p className="text-sm text-muted-foreground">
                        {card.label}
                      </p>
                      <div className="mt-3 text-3xl font-bold">
                        {card.value}
                      </div>
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

            <Panel
              title="Trạng thái đơn hàng"
              description="Số lượng theo trạng thái"
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Biểu đồ cột</h4>
                  {orderStatusChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart data={orderStatusChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Chưa có dữ liệu
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Bảng dữ liệu</h4>
                  <DataTable
                    columns={["Trạng thái", "Số lượng"]}
                    rows={orderStatusRows}
                  />
                </div>
              </div>
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
              <div className="mb-4 grid gap-3 md:grid-cols-3">
                <div className="grid gap-2">
                  <label className="text-xs font-medium">Tìm kiếm</label>
                  <input
                    type="text"
                    placeholder="Tên, email, điện thoại..."
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                    value={userSearchKeyword}
                    onChange={(e) => setUserSearchKeyword(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-medium">Trạng thái</label>
                  <select
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                    value={userStatusFilter}
                    onChange={(e) => setUserStatusFilter(e.target.value)}
                  >
                    <option value="all">Tất cả</option>
                    <option value="ACTIVE">Đang hoạt động</option>
                    <option value="UNVERIFIED">Chưa xác minh</option>
                    <option value="BANNED">Đã khóa</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <span className="text-xs text-muted-foreground">
                    Tìm thấy: <strong>{filteredUsers.length}</strong> user
                  </span>
                </div>
              </div>

              <DataTable
                columns={[
                  "Tên",
                  "Email",
                  "Điện thoại",
                  "Trạng thái",
                  "Thao tác",
                ]}
                rows={(filteredUsers ?? []).map((item) => [
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
                            phone: event.target.value
                              .replace(/\D/g, "")
                              .slice(0, 10),
                          },
                        }))
                      }
                    />
                  ) : (
                    (item.phone ?? "-")
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
                    <div
                      key={`edit-${item.id}`}
                      className="flex flex-wrap gap-2"
                    >
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
                        variant="outline"
                        className="gap-1"
                        onClick={() => openUserOrders(item)}
                      >
                        Xem đơn
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
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
                  <p className="text-sm text-muted-foreground">
                    Đang tải chi tiết người dùng...
                  </p>
                ) : userDetailError ? (
                  <p className="text-sm text-rose-600">
                    Không thể tải dữ liệu chi tiết: {userDetailError}
                  </p>
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
                        <label className="text-sm font-medium">
                          Điện thoại
                        </label>
                        <input
                          className="rounded-md border bg-background px-3 py-2 text-sm"
                          value={selectedUserDraft.phone}
                          onChange={(event) =>
                            setSelectedUserDraft((prev) => ({
                              ...prev,
                              phone: event.target.value
                                .replace(/\D/g, "")
                                .slice(0, 10),
                            }))
                          }
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-medium">
                          Avatar URL
                        </label>
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
                        <label className="text-sm font-medium">
                          Địa chỉ tổng quát
                        </label>
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
                        <label className="text-sm font-medium">
                          Trạng thái
                        </label>
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
                        {isSavingUserDetail
                          ? "Đang lưu..."
                          : "Lưu hồ sơ khách hàng"}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => loadUserDetail(selectedUserDetail.id)}
                        disabled={isLoadingUserDetail}
                      >
                        Tải lại dữ liệu liên quan
                      </Button>
                      <div className="ml-auto text-sm text-muted-foreground">
                        Số dư ví:{" "}
                        {formatMoney(selectedUserDetail.walletBalance)}
                      </div>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <Panel
                        title="Địa chỉ giao hàng"
                        description="Danh sách địa chỉ của khách hàng"
                      >
                        <DataTable
                          columns={[
                            "Nhãn",
                            "Người nhận",
                            "SĐT",
                            "Địa chỉ",
                            "Mặc định",
                          ]}
                          rows={(selectedUserDetail.addresses ?? []).map(
                            (addr) => [
                              addr.label ?? "-",
                              addr.receiverName,
                              addr.phoneNumber,
                              addr.addressLine,
                              addr.isDefault ? "Có" : "Không",
                            ],
                          )}
                        />
                      </Panel>

                      <Panel
                        title="Đơn hàng liên quan"
                        description="20 đơn gần nhất của khách hàng"
                      >
                        <DataTable
                          columns={[
                            "Mã đơn",
                            "Tổng tiền",
                            "Thanh toán",
                            "Trạng thái",
                            "Số món",
                            "Ngày tạo",
                          ]}
                          rows={(selectedUserDetail.orders ?? []).map(
                            (order) => [
                              `#${order.id}`,
                              formatMoney(order.totalAmount),
                              statusBadge(formatEnum(order.paymentStatus)),
                              statusBadge(formatEnum(order.orderStatus)),
                              String(order.itemCount ?? 0),
                              formatDate(order.createdAt),
                            ],
                          )}
                        />
                      </Panel>
                    </div>

                    <div className="grid gap-4 xl:grid-cols-2">
                      <Panel
                        title="Giao dịch ví"
                        description="Lịch sử topup, thanh toán, hoàn tiền"
                      >
                        <DataTable
                          columns={[
                            "Loại",
                            "Số tiền",
                            "Đơn",
                            "Ghi chú",
                            "Thời gian",
                            "Thao tác",
                          ]}
                          rows={(
                            selectedUserDetail.walletTransactions ?? []
                          ).map((tx) => [
                            formatEnum(tx.type),
                            formatMoney(tx.amount),
                            tx.orderId ? `#${tx.orderId}` : "-",
                            tx.note ?? "-",
                            formatDate(tx.createdAt),
                            <Button
                              key={`delete-tx-${tx.id}`}
                              size="sm"
                              variant="outline"
                              className="gap-1 text-rose-600"
                              onClick={() =>
                                deleteWalletTransaction(
                                  selectedUserDetail.id,
                                  tx.id,
                                )
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Xóa
                            </Button>,
                          ])}
                        />
                      </Panel>

                      <Panel
                        title="Yêu cầu trả hàng"
                        description="Các yêu cầu trả hàng của khách hàng"
                      >
                        <DataTable
                          columns={[
                            "Mã",
                            "Đơn",
                            "Lý do",
                            "Trạng thái",
                            "Hoàn",
                            "Yêu cầu lúc",
                          ]}
                          rows={(selectedUserDetail.returnRequests ?? []).map(
                            (request) => [
                              `#${request.id}`,
                              `#${request.orderId}`,
                              request.reason ?? "-",
                              statusBadge(
                                formatReturnStatusLabelAdmin(request.status),
                              ),
                              request.refundAmount
                                ? formatMoney(request.refundAmount)
                                : "-",
                              formatDate(request.requestedAt),
                            ],
                          )}
                        />
                      </Panel>
                    </div>
                  </div>
                ) : null}
              </Panel>
            )}

            <Panel
              title="Thống kê trạng thái người dùng"
              description="Phân bố người dùng theo trạng thái"
            >
              <div className="grid gap-4 lg:grid-cols-2">
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Biểu đồ tròn</h4>
                  {userStatusChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <PieChart>
                        <Pie
                          data={userStatusChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {userStatusChartData.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={
                                ["#10b981", "#f59e0b", "#ef4444", "#6366f1"][
                                index % 4
                                ]
                              }
                            />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Chưa có dữ liệu
                    </p>
                  )}
                </div>
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Chi tiết</h4>
                  <div className="space-y-2">
                    {userStatusChartData.map((item) => (
                      <div
                        key={item.name}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <span>{item.name}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Panel>
          </section>

          <section
            id="products"
            className={`space-y-6 ${isProductCreateTab || isProductInventoryTab || isProductEditTab
              ? "block"
              : "hidden"
              }`}
          >
            <SectionHeader
              sectionId={activeTab}
              icon={Package}
              title={
                isProductCreateTab
                  ? "Thêm sản phẩm mới"
                  : isProductInventoryTab
                    ? "Danh mục sản phẩm"
                    : "Chỉnh sửa sản phẩm"
              }
              description={
                isProductCreateTab
                  ? "Tạo sản phẩm mới với đầy đủ thông tin và thông số"
                  : isProductInventoryTab
                    ? "Quản lý các loại sản phẩm như CPU, RAM, SSD, Mainboard và danh mục liên quan"
                    : "Chọn sản phẩm trong kho và chỉnh sửa chi tiết"
              }
            />
            <div className="grid gap-6">
              <div
                className={`${isProductInventoryTab || isProductEditTab ? "hidden" : ""}`}
              >
                <Panel
                  title={
                    isProductEditTab
                      ? "Chỉnh sửa sản phẩm"
                      : "Thêm sản phẩm mới"
                  }
                  description={
                    isProductEditTab
                      ? "Cập nhật thông tin sản phẩm đã có trong kho"
                      : "Điền thông tin cơ bản, giá bán, tồn kho và hình ảnh sản phẩm"
                  }
                >
                  <div className="space-y-3">
                    {isProductEditTab && !editingProductId ? (
                      <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                        Chưa chọn sản phẩm để sửa. Vui lòng bấm "Sửa" ở danh
                        sách Kho sản phẩm.
                      </div>
                    ) : null}

                    <div className="rounded-md border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-900">
                      <p className="font-semibold">
                        {isProductEditTab
                          ? "Hướng dẫn chỉnh sửa"
                          : "Hướng dẫn nhanh"}
                      </p>
                      <p className="mt-1">
                        {isProductEditTab
                          ? "1) Chọn sản phẩm từ Kho sản phẩm. 2) Cập nhật thông tin cần sửa. 3) Bấm Cập nhật để lưu thay đổi."
                          : "1) Nhập tên và danh mục. 2) Nhập giá bán, tồn kho, mã sản phẩm. 3) Chọn ảnh hoặc dán URL ảnh. 4) Bấm Lưu."}
                      </p>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium">
                        Tên sản phẩm
                      </label>
                      <input
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        placeholder="VD: RTX 4060 8GB GDDR6"
                        value={productForm.name}
                        onChange={(event) =>
                          setProductForm((prev) => ({
                            ...prev,
                            name: event.target.value,
                          }))
                        }
                      />
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium">
                        Mã sản phẩm (duy nhất)
                      </label>
                      <div className="flex gap-2">
                        <input
                          className="flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                          placeholder="Để trống sẽ tự tạo theo tên"
                          value={productForm.productCode}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              productCode: event.target.value,
                            }))
                          }
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            setProductForm((prev) => ({
                              ...prev,
                              productCode: buildProductCode(prev.name),
                            }))
                          }
                        >
                          Tự tạo
                        </Button>
                      </div>
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
                      <label className="text-sm font-medium">
                        Nhà cung cấp
                      </label>
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
                            setProductForm((prev) => ({
                              ...prev,
                              price: event.target.value,
                            }))
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
                      <label className="text-sm font-medium">
                        Bảo hành (tháng)
                      </label>
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

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">
                          Thứ tự hiển thị
                        </label>
                        <input
                          type="number"
                          min="0"
                          className="rounded-md border bg-background px-3 py-2 text-sm"
                          value={productForm.displayOrder}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              displayOrder: event.target.value,
                            }))
                          }
                        />
                        <p className="text-xs text-muted-foreground">
                          Số càng nhỏ hiển thị càng trước ở trang linh kiện.
                        </p>
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-medium">
                          Ưu tiên trang chủ
                        </label>
                        <label className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                          <input
                            type="checkbox"
                            checked={Boolean(productForm.isHomepageFeatured)}
                            onChange={(event) =>
                              setProductForm((prev) => ({
                                ...prev,
                                isHomepageFeatured: event.target.checked,
                              }))
                            }
                          />
                          Hiện trong nhóm sản phẩm nổi bật trang chủ
                        </label>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium">
                        Ảnh sản phẩm
                      </label>
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
                        placeholder="Hoặc dán trực tiếp đường dẫn ảnh (https://...)"
                        value={productForm.imageUrl}
                        onChange={(event) =>
                          setProductForm((prev) => ({
                            ...prev,
                            imageUrl: event.target.value,
                          }))
                        }
                      />
                      <p className="text-xs text-muted-foreground">
                        Hỗ trợ JPG/JPEG/PNG. Nếu đã chọn file, hệ thống tự
                        upload ảnh khi bấm lưu.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label className="text-sm font-medium">
                        Thông số kỹ thuật (
                        {CATEGORY_SPEC_CONFIG[productForm.categorySlug]
                          ?.label || CATEGORY_SPEC_CONFIG.default.label}
                        )
                      </label>
                      <div className="grid grid-cols-2 gap-3">
                        {(
                          CATEGORY_SPEC_CONFIG[productForm.categorySlug]
                            ?.fields || CATEGORY_SPEC_CONFIG.default.fields
                        ).map((fieldName) => {
                          const config =
                            CATEGORY_SPEC_CONFIG[productForm.categorySlug] ||
                            CATEGORY_SPEC_CONFIG.default;
                          const isRequired =
                            config.required?.includes(fieldName);
                          const fieldLabel = {
                            cpu: "CPU",
                            ram: "RAM",
                            storage: "Storage",
                            gpu: "GPU",
                          }[fieldName];
                          const formKey = `spec${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}`;
                          const hint = config.hints?.[fieldName] || "";

                          // Determine field type and options
                          let fieldOptions = [];
                          let inputType = "text";

                          if (fieldName === "brand") {
                            // Brand is datalist (combobox)
                            inputType = "datalist";
                            const categorySlug = productForm.categorySlug;
                            fieldOptions =
                              SPEC_OPTIONS.brand[categorySlug] ||
                              SPEC_OPTIONS.brand.gpu;
                          } else if (fieldName === "ram") {
                            inputType = "select";
                            fieldOptions = SPEC_OPTIONS.ram;
                          } else if (
                            fieldName === "storage" &&
                            productForm.categorySlug?.includes("gpu")
                          ) {
                            // For GPU, storage is VRAM
                            inputType = "select";
                            fieldOptions = SPEC_OPTIONS.gpuRam;
                          } else if (fieldName === "storage") {
                            inputType = "select";
                            fieldOptions = SPEC_OPTIONS.storage;
                          }

                          return (
                            <div key={fieldName} className="grid gap-1">
                              <label className="text-xs font-medium text-muted-foreground">
                                {fieldLabel}
                                {isRequired && (
                                  <span className="text-red-500 ml-0.5">*</span>
                                )}
                              </label>
                              {inputType === "select" ? (
                                <select
                                  className="rounded-md border bg-background px-3 py-2 text-sm"
                                  value={productForm[formKey] || ""}
                                  onChange={(event) =>
                                    setProductForm((prev) => ({
                                      ...prev,
                                      [formKey]: event.target.value,
                                    }))
                                  }
                                >
                                  <option value="">
                                    Chọn {fieldLabel.toLowerCase()}
                                  </option>
                                  {fieldOptions.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : inputType === "datalist" ? (
                                <>
                                  <input
                                    type="text"
                                    placeholder={hint}
                                    className="rounded-md border bg-background px-3 py-2 text-sm"
                                    value={productForm[formKey] || ""}
                                    onChange={(event) =>
                                      setProductForm((prev) => ({
                                        ...prev,
                                        [formKey]: event.target.value,
                                      }))
                                    }
                                    list={`${fieldName}-options-${productForm.categorySlug}`}
                                  />
                                  <datalist
                                    id={`${fieldName}-options-${productForm.categorySlug}`}
                                  >
                                    {fieldOptions.map((opt) => (
                                      <option key={opt} value={opt} />
                                    ))}
                                  </datalist>
                                </>
                              ) : (
                                <input
                                  type="text"
                                  placeholder={hint}
                                  className="rounded-md border bg-background px-3 py-2 text-sm"
                                  value={productForm[formKey] || ""}
                                  onChange={(event) =>
                                    setProductForm((prev) => ({
                                      ...prev,
                                      [formKey]: event.target.value,
                                    }))
                                  }
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Điền các thông số phù hợp với danh mục được chọn.{" "}
                        <span className="text-red-500">*</span> = bắt buộc
                      </p>
                    </div>

                    <div className="space-y-3 pt-3 border-t">
                      <h3 className="text-sm font-semibold">
                        Chi tiết sản phẩm
                      </h3>

                      <div className="grid gap-2">
                        <label className="text-sm font-medium">
                          Mô tả đầy đủ
                        </label>
                        <textarea
                          className="min-h-24 rounded-md border bg-background px-3 py-2 text-sm"
                          placeholder="Mô tả chi tiết sản phẩm, công nghệ, cảm nhận, ưu và nhược điểm..."
                          value={productForm.fullDescription}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              fullDescription: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-medium">
                          Gì trong hộp
                        </label>
                        <textarea
                          className="min-h-16 rounded-md border bg-background px-3 py-2 text-sm"
                          placeholder="Liệt kê những gì có trong hộp sản phẩm. VD: Sản phẩm chính, Hộp bao bì, Sách hướng dẫn, Cáp USB, ..."
                          value={productForm.inTheBox}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              inTheBox: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-medium">
                          Link tài liệu hướng dẫn
                        </label>
                        <input
                          type="url"
                          className="rounded-md border bg-background px-3 py-2 text-sm"
                          placeholder="https://example.com/manual.pdf"
                          value={productForm.manualUrl}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              manualUrl: event.target.value,
                            }))
                          }
                        />
                      </div>

                      <div className="grid gap-2">
                        <label className="text-sm font-medium">
                          Chính sách bảo hành
                        </label>
                        <textarea
                          className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm"
                          placeholder="Mô tả điều kiện bảo hành, cách thức yêu cầu bảo hành, thời hạn bảo hành..."
                          value={productForm.warrantyPolicy}
                          onChange={(event) =>
                            setProductForm((prev) => ({
                              ...prev,
                              warrantyPolicy: event.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-3">
                      <Button
                        className="gap-2"
                        onClick={saveProduct}
                        disabled={
                          isSavingProduct ||
                          (isProductEditTab && !editingProductId)
                        }
                      >
                        {isProductEditTab ? (
                          <Pencil className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        {isProductEditTab
                          ? editingProductId
                            ? "Cập nhật"
                            : "Chọn sản phẩm để sửa"
                          : "Thêm sản phẩm"}
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

              <div className={`${isProductInventoryTab ? "" : "hidden"}`}>
                <CategoryManagementPanel />
              </div>

              <div className={`${isProductEditTab ? "" : "hidden"}`}>
                <Panel
                  title="Kho sản phẩm"
                  description="Task #31 + #32: tìm kiếm nhanh, phân trang 12 sản phẩm/trang"
                >
                  <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Chế độ hiển thị
                    </p>
                    <div className="mb-3 flex flex-wrap gap-2">
                      <Button
                        size="sm"
                        variant={
                          productDisplayMode === "priority"
                            ? "default"
                            : "outline"
                        }
                        onClick={() => applyProductDisplayMode("priority")}
                      >
                        Ưu tiên thủ công
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          productDisplayMode === "stock" ? "default" : "outline"
                        }
                        onClick={() => applyProductDisplayMode("stock")}
                      >
                        Nhiều hàng
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          productDisplayMode === "bestSelling"
                            ? "default"
                            : "outline"
                        }
                        onClick={() => applyProductDisplayMode("bestSelling")}
                      >
                        Bán chạy
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          productDisplayMode === "featured"
                            ? "default"
                            : "outline"
                        }
                        onClick={() => applyProductDisplayMode("featured")}
                      >
                        Sản phẩm nổi bật
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          productDisplayMode === "newest"
                            ? "default"
                            : "outline"
                        }
                        onClick={() => applyProductDisplayMode("newest")}
                      >
                        Mới nhất
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          productDisplayMode === "priceAsc"
                            ? "default"
                            : "outline"
                        }
                        onClick={() => applyProductDisplayMode("priceAsc")}
                      >
                        Giá tăng dần
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          productDisplayMode === "priceDesc"
                            ? "default"
                            : "outline"
                        }
                        onClick={() => applyProductDisplayMode("priceDesc")}
                      >
                        Giá giảm dần
                      </Button>
                      <Button
                        size="sm"
                        variant={
                          productDisplayMode === "name" ? "default" : "outline"
                        }
                        onClick={() => applyProductDisplayMode("name")}
                      >
                        Theo tên
                      </Button>
                    </div>

                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={prioritizeByName}
                      >
                        Ưu tiên theo tên A-Z
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveDisplayOrderDraft}
                        disabled={
                          isSavingDisplayOrder || displayOrderDraft.length === 0
                        }
                      >
                        {isSavingDisplayOrder
                          ? "Đang lưu..."
                          : "Lưu thứ tự kéo-thả"}
                      </Button>
                    </div>

                    <div className="grid gap-2 text-xs text-muted-foreground">
                      <p>
                        Kéo-thả danh sách dưới đây để đổi thứ tự hiển thị trên
                        trang linh kiện.
                      </p>
                      <div className="max-h-72 overflow-auto rounded-md border bg-background/70 p-2">
                        {isLoadingDisplayOrder ? (
                          <p className="px-2 py-1 text-xs text-muted-foreground">
                            Đang tải danh sách...
                          </p>
                        ) : displayOrderDraft.length === 0 ? (
                          <p className="px-2 py-1 text-xs text-muted-foreground">
                            Chưa có dữ liệu sản phẩm.
                          </p>
                        ) : (
                          displayOrderDraft.map((item, index) => (
                            <div
                              key={`order-${item.id}`}
                              className="flex cursor-move items-center justify-between rounded border px-2 py-1"
                              draggable
                              onDragStart={(event) => {
                                event.dataTransfer.setData(
                                  "text/plain",
                                  String(index),
                                );
                              }}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) => {
                                event.preventDefault();
                                const from = Number(
                                  event.dataTransfer.getData("text/plain"),
                                );
                                moveDisplayOrderItem(from, index);
                              }}
                            >
                              <div className="min-w-0">
                                <p className="line-clamp-1">
                                  #{index + 1} {item.name}
                                </p>
                                <p className="text-[10px] text-muted-foreground">
                                  Tồn: {item.stockQuantity}
                                </p>
                              </div>
                              <div className="flex items-center gap-1">
                                {item.isHomepageFeatured && (
                                  <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                    Nổi bật
                                  </span>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-4 flex flex-wrap items-center gap-2">
                    <input
                      className="w-full max-w-sm rounded-md border bg-background px-3 py-2 text-sm"
                      placeholder="Tìm theo tên hoặc mã sản phẩm"
                      value={managedProductKeywordInput}
                      onChange={(event) =>
                        setManagedProductKeywordInput(event.target.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          setManagedProductPage(1);
                          setManagedProductKeyword(
                            managedProductKeywordInput.trim(),
                          );
                        }
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        setManagedProductPage(1);
                        setManagedProductKeyword(
                          managedProductKeywordInput.trim(),
                        );
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
                      "Ưu tiên",
                      "Thứ tự",
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
                      item.isHomepageFeatured ? "Trang chủ" : "-",
                      String(Number(item.displayOrder ?? 9999)),
                      formatMoney(item.price),
                      String(item.stockQuantity ?? 0),
                      statusBadge(
                        Number(item.stockQuantity ?? 0) > 0
                          ? "Còn hàng"
                          : "Hết hàng",
                      ),
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
                      <div
                        key={`actions-${item.id}`}
                        className="flex flex-wrap gap-2"
                      >
                        <Button
                          size="sm"
                          variant={
                            item.isHomepageFeatured ? "default" : "outline"
                          }
                          className="gap-1"
                          onClick={() => toggleHomepageFeatured(item)}
                        >
                          {item.isHomepageFeatured
                            ? "Đang nổi bật"
                            : "Đặt nổi bật"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1"
                          onClick={() => {
                            startEditingProduct(item);
                            setActiveTab("products-edit");
                          }}
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
                        Trang {managedProductPagination.page} /{" "}
                        {managedProductPagination.totalPages}
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
            <Panel
              title="Nhà cung cấp"
              description="Dữ liệu trực tiếp từ bảng Suppliers"
            >
              <div className="mb-4 flex gap-3">
                <div className="flex-1 grid gap-2">
                  <label className="text-xs font-medium">Tìm kiếm</label>
                  <input
                    type="text"
                    placeholder="Tên, email, điện thoại..."
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                    value={catalogSearchKeyword}
                    onChange={(e) => setCatalogSearchKeyword(e.target.value)}
                  />
                </div>
                <div className="flex items-end">
                  <span className="text-xs text-muted-foreground">
                    Tìm thấy: <strong>{filteredSuppliers.length}</strong> NCC
                  </span>
                </div>
              </div>

              <DataTable
                columns={["Tên", "Email", "Điện thoại", "Người liên hệ"]}
                rows={(filteredSuppliers ?? []).map((item) => [
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
              <div className="xl:col-span-2 space-y-6">
                <Panel
                  title="Thêm voucher"
                  description="Áp dụng cho thanh toán giỏ hàng"
                >
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
                        <label className="text-sm font-medium">
                          Phạm vi mã
                        </label>
                        <select
                          className="rounded-md border bg-background px-3 py-2 text-sm"
                          value={voucherForm.couponScope}
                          onChange={(event) =>
                            setVoucherForm((prev) => ({
                              ...prev,
                              couponScope: event.target.value,
                            }))
                          }
                        >
                          <option value="PRODUCT">Giảm giá sản phẩm</option>
                          <option value="SHIPPING">Giảm phí vận chuyển</option>
                        </select>
                      </div>

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
                        <label className="text-sm font-medium">
                          Giá trị giảm
                        </label>
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
                        <label className="text-sm font-medium">
                          Đơn tối thiểu
                        </label>
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
                        <label className="text-sm font-medium">
                          Số lượt dùng
                        </label>
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
                      <label className="text-sm font-medium">
                        Chỉ định user được dùng (không chọn = tất cả)
                      </label>
                      <div className="rounded-md border bg-background p-3 space-y-2">
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setVoucherForm((prev) => ({
                                ...prev,
                                assignedUserIds: (dashboard?.users ?? []).map(
                                  (user) => user.id,
                                ),
                              }))
                            }
                          >
                            Chọn tất cả
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setVoucherForm((prev) => ({
                                ...prev,
                                assignedUserIds: [],
                              }))
                            }
                          >
                            Bỏ chọn tất cả
                          </Button>
                        </div>

                        <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                          {(dashboard?.users ?? []).map((user) => {
                            const checked = (
                              voucherForm.assignedUserIds ?? []
                            ).includes(user.id);
                            return (
                              <label
                                key={`voucher-user-${user.id}`}
                                className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/60"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(event) => {
                                    const isChecked = event.target.checked;
                                    setVoucherForm((prev) => {
                                      const current = new Set(
                                        prev.assignedUserIds ?? [],
                                      );
                                      if (isChecked) {
                                        current.add(user.id);
                                      } else {
                                        current.delete(user.id);
                                      }
                                      return {
                                        ...prev,
                                        assignedUserIds: Array.from(current),
                                      };
                                    });
                                  }}
                                />
                                <span className="text-sm">
                                  <span className="font-medium">
                                    {user.fullName}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {" "}
                                    ({user.email})
                                  </span>
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium">
                        Thời gian bắt đầu
                      </label>
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
                      <label className="text-sm font-medium">
                        Thời gian kết thúc
                      </label>
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

                    <Button
                      onClick={createVoucher}
                      disabled={isSavingVoucher}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Tạo voucher
                    </Button>
                  </div>
                </Panel>

                <Panel
                  title="Sửa voucher"
                  description="Chọn một voucher ở danh sách để chỉnh sửa"
                >
                  {editingVoucherId ? (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Đang sửa voucher ID: <strong>{editingVoucherId}</strong>
                      </p>
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
                          <label className="text-sm font-medium">Phạm vi mã</label>
                          <select
                            className="rounded-md border bg-background px-3 py-2 text-sm"
                            value={voucherForm.couponScope}
                            onChange={(event) =>
                              setVoucherForm((prev) => ({
                                ...prev,
                                couponScope: event.target.value,
                              }))
                            }
                          >
                            <option value="PRODUCT">Giảm giá sản phẩm</option>
                            <option value="SHIPPING">Giảm phí vận chuyển</option>
                          </select>
                        </div>

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

                      <div className="flex gap-2">
                        <Button
                          type="button"
                          onClick={updateVoucher}
                          disabled={isSavingVoucher}
                          className="gap-2"
                        >
                          <Pencil className="h-4 w-4" />
                          Cập nhật voucher
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setEditingVoucherId(null)}
                        >
                          Hủy
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Chọn nút Sửa ở danh sách bên phải để mở form chỉnh sửa.
                    </p>
                  )}
                </Panel>
              </div>

              <div className="xl:col-span-3">
                <Panel
                  title="Danh sách mã giảm giá"
                  description="Mã giảm giá được tạo từ trang quản trị"
                >
                  <div className="mb-4 grid gap-3 md:grid-cols-3">
                    <div className="grid gap-2">
                      <label className="text-xs font-medium">Tìm kiếm</label>
                      <input
                        type="text"
                        placeholder="Mã giảm giá..."
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={voucherSearchKeyword}
                        onChange={(e) =>
                          setVoucherSearchKeyword(e.target.value)
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-medium">Trạng thái</label>
                      <select
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={voucherStatusFilter}
                        onChange={(e) => setVoucherStatusFilter(e.target.value)}
                      >
                        <option value="all">Tất cả</option>
                        <option value="ACTIVE">Đang hoạt động</option>
                        <option value="EXPIRED">Hết hạn</option>
                        <option value="DISABLED">Vô hiệu hóa</option>
                      </select>
                    </div>
                    <div className="flex items-end">
                      <span className="text-xs text-muted-foreground">
                        Tìm thấy: <strong>{filteredCoupons.length}</strong> mã
                      </span>
                    </div>
                  </div>

                  <DataTable
                    columns={[
                      "Mã",
                      "Phạm vi",
                      "Loại",
                      "Giá trị",
                      "Đơn tối thiểu",
                      "User được dùng",
                      "Đã dùng / Giới hạn",
                      "Thời gian",
                      "Trạng thái",
                      "Thao tác",
                    ]}
                    rows={(filteredCoupons ?? []).map((item) => [
                      item.code,
                      item.couponScope === "SHIPPING"
                        ? "Vận chuyển"
                        : "Sản phẩm",
                      formatEnum(item.discountType),
                      item.discountType === "PERCENT"
                        ? `${Number(item.discountValue)}%`
                        : formatMoney(item.discountValue),
                      formatMoney(item.minOrderValue),
                      Array.isArray(item.assignedUsers) &&
                        item.assignedUsers.length > 0
                        ? item.assignedUsers
                          .map(
                            (user) =>
                              user.fullName || user.email || `#${user.id}`,
                          )
                          .join(", ")
                        : "Tất cả",
                      `${item.usedCount} / ${item.usageLimit}`,
                      `${formatDate(item.startDate)} - ${formatDate(item.endDate)}`,
                      statusBadge(formatEnum(item.status)),
                      <div
                        key={`voucher-action-${item.id}`}
                        className="flex gap-2"
                      >
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => beginEditVoucher(item)}
                          disabled={
                            editingVoucherId === item.id ||
                            deletingVoucherId === item.id
                          }
                        >
                          Sửa
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => deleteVoucher(item)}
                          disabled={
                            editingVoucherId === item.id ||
                            deletingVoucherId === item.id
                          }
                        >
                          {deletingVoucherId === item.id
                            ? "Đang xóa..."
                            : "Xóa"}
                        </Button>
                      </div>,
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
                    Đang xem trực tiếp đơn hàng của:{" "}
                    <strong>{selectedOrderUserFilter.fullName}</strong>
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSelectedOrderUserFilter(null);
                      setSelectedOrderUserOrders([]);
                    }}
                  >
                    Bỏ lọc
                  </Button>
                </div>
              )}

              <div className="mb-4 grid gap-3 md:grid-cols-4">
                <div className="grid gap-2">
                  <label className="text-xs font-medium">Tìm kiếm</label>
                  <input
                    type="text"
                    placeholder="Mã đơn, tên khách, email..."
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                    value={orderSearchKeyword}
                    onChange={(e) => setOrderSearchKeyword(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-medium">Sắp xếp</label>
                  <select
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                    value={orderSortBy}
                    onChange={(e) => setOrderSortBy(e.target.value)}
                  >
                    <option value="newest">Mới nhất</option>
                    <option value="oldest">Cũ nhất</option>
                    <option value="highest-amount">Số tiền cao</option>
                    <option value="lowest-amount">Số tiền thấp</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-medium">Trạng thái</label>
                  <select
                    className="rounded-md border bg-background px-3 py-2 text-sm"
                    value={orderFilterStatus}
                    onChange={(e) => setOrderFilterStatus(e.target.value)}
                  >
                    <option value="all">Tất cả</option>
                    <option value="PENDING">Chờ xác nhận</option>
                    <option value="PROCESSING">Đang chuẩn bị</option>
                    <option value="SHIPPING">Đang vận chuyển</option>
                    <option value="DELIVERED">Đã giao hàng</option>
                    <option value="CANCELLED">Đã hủy</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <span className="text-xs text-muted-foreground">
                    Tìm thấy: <strong>{displayedOrders.length}</strong> đơn
                  </span>
                </div>
              </div>

              <DataTable
                columns={[
                  "Mã đơn",
                  "Khách hàng",
                  "Tổng tiền",
                  "Phương thức",
                  "Thanh toán",
                  "Trạng thái",
                  "Cập nhật",
                ]}
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
                  formatPaymentMethodLabelAdmin(item.paymentMethod),
                  statusBadge(
                    formatPaymentStatusLabelAdmin(item.paymentStatus),
                  ),
                  statusBadge(
                    formatOrderStatusLabelAdmin(
                      item.orderStatus,
                      item.paymentStatus,
                    ),
                  ),
                  <div
                    key={`order-actions-${item.id}`}
                    className="flex items-center gap-2"
                  >
                    {renderOrderActionCell(item)}
                    <Button
                      size="sm"
                      variant="destructive"
                      disabled={deletingOrderId === item.id}
                      onClick={() => deleteOrder(item.id)}
                    >
                      {deletingOrderId === item.id ? "Đang xóa..." : "Xóa"}
                    </Button>
                  </div>,
                ])}
              />
              {displayedOrders.length === 0 && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Không có đơn hàng phù hợp.
                </p>
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
                <div className="mt-3 text-sm text-muted-foreground">
                  Phương thức thanh toán:{" "}
                  <strong>
                    {formatPaymentMethodLabelAdmin(
                      selectedOrderDetail.paymentMethod,
                    )}
                  </strong>
                </div>
                <div className="mt-4">
                  <h4 className="mb-2 text-sm font-semibold">
                    Lịch sử trạng thái
                  </h4>
                  <DataTable
                    columns={["Từ", "Sang", "Thời gian", "Ghi chú"]}
                    rows={(selectedOrderDetail.statusHistory ?? []).map(
                      (history) => [
                        formatEnum(history.fromStatus),
                        formatEnum(history.toStatus),
                        formatDate(history.createdAt),
                        history.note ?? "-",
                      ],
                    )}
                  />
                </div>
              </Panel>
            )}
          </section>

          <section id="returns" className={sectionClassName("returns") }>
            <SectionHeader
              sectionId="returns"
              icon={RotateCcw}
              title="Quản lý trả hàng"
              description="Duyệt, theo dõi và xử lý hoàn tiền cho các yêu cầu trả hàng"
            />

            <div className="grid gap-6 xl:grid-cols-5">
              <div className="xl:col-span-2 space-y-4">
                <Panel
                  title="Tổng quan trả hàng"
                  description="Theo dõi nhanh trạng thái xử lý"
                >
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Tổng yêu cầu</p>
                      <p className="text-xl font-semibold">
                        {adminReturnRequests.length}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Đang chờ</p>
                      <p className="text-xl font-semibold text-amber-600">
                        {adminReturnRequests.filter(
                          (item) =>
                            String(item.status ?? "").toUpperCase() === "PENDING",
                        ).length}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Đã duyệt</p>
                      <p className="text-xl font-semibold text-sky-600">
                        {adminReturnRequests.filter(
                          (item) =>
                            String(item.status ?? "").toUpperCase() === "APPROVED",
                        ).length}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Đã hoàn tiền</p>
                      <p className="text-xl font-semibold text-emerald-600">
                        {adminReturnRequests.filter(
                          (item) =>
                            String(item.status ?? "").toUpperCase() === "REFUNDED",
                        ).length}
                      </p>
                    </div>
                  </div>
                </Panel>

                <Panel
                  title="Bộ lọc nhanh"
                  description="Tìm yêu cầu theo mã đơn, khách hàng hoặc trạng thái"
                >
                  <div className="space-y-3">
                    <div className="grid gap-2">
                      <label className="text-xs font-medium">Tìm kiếm</label>
                      <input
                        type="text"
                        placeholder="Mã yêu cầu, mã đơn, tên khách, email..."
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={returnSearchKeyword}
                        onChange={(event) =>
                          setReturnSearchKeyword(event.target.value)
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-xs font-medium">Trạng thái</label>
                      <select
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={returnStatusFilter}
                        onChange={(event) =>
                          setReturnStatusFilter(event.target.value)
                        }
                      >
                        <option value="all">Tất cả</option>
                        <option value="PENDING">Đang chờ</option>
                        <option value="APPROVED">Đã duyệt</option>
                        <option value="REJECTED">Đã từ chối</option>
                        <option value="SHIPPING_BACK">Đang gửi trả</option>
                        <option value="RECEIVED">Đã nhận hàng</option>
                        <option value="REFUNDED">Đã hoàn tiền</option>
                      </select>
                    </div>
                    <div className="flex items-center justify-between rounded-xl border bg-secondary/30 px-3 py-2 text-xs text-muted-foreground">
                      <span>
                        Tìm thấy: <strong>{filteredReturnRequests.length}</strong> yêu cầu
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setReturnSearchKeyword("");
                          setReturnStatusFilter("all");
                        }}
                        disabled={!returnSearchKeyword && returnStatusFilter === "all"}
                      >
                        Xóa lọc
                      </Button>
                    </div>
                  </div>
                </Panel>
              </div>

              <div className="xl:col-span-3 space-y-4">
                <Panel
                  title="Danh sách yêu cầu trả hàng"
                  description="Duyệt, theo dõi vận chuyển và hoàn tiền"
                >
                  {isLoadingReturnRequests ? (
                    <p className="text-sm text-muted-foreground">
                      Đang tải dữ liệu trả hàng...
                    </p>
                  ) : filteredReturnRequests.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Chưa có yêu cầu trả hàng phù hợp.
                    </p>
                  ) : (
                    <DataTable
                      columns={[
                        "Mã",
                        "Khách",
                        "Đơn",
                        "Lý do",
                        "Trạng thái",
                        "Hoàn",
                        "Ngân hàng",
                        "Yêu cầu lúc",
                        "Thao tác",
                      ]}
                      rows={filteredReturnRequests.map((request) => {
                        const requestId = Number(request.id);
                        const isBusy = updatingReturnRequestId === requestId;
                        const status = String(request.status ?? "").toUpperCase();

                        return [
                          `#${request.id}`,
                          request.user?.fullName || request.user?.email || "-",
                          `#${request.orderId}`,
                          <span
                            key={`reason-${request.id}`}
                            className="block max-w-[260px] whitespace-normal break-words"
                          >
                            {request.reason ?? "-"}
                          </span>,
                          statusBadge(
                            formatReturnStatusLabelAdmin(request.status),
                          ),
                          request.refundAmount
                            ? formatMoney(request.refundAmount)
                            : "-",
                          <div
                            key={`bank-${request.id}`}
                            className="max-w-[220px] space-y-1 text-xs text-muted-foreground"
                          >
                            <div>{request.bankName ?? "-"}</div>
                            <div>{request.bankAccountNumber ?? "-"}</div>
                            <div>{request.bankAccountName ?? "-"}</div>
                          </div>,
                          formatDate(request.requestedAt),
                          <div
                            key={`return-actions-${request.id}`}
                            className="flex flex-wrap gap-2"
                          >
                            {status === "PENDING" && (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() =>
                                    handleReturnRequestAction(request, "APPROVE")
                                  }
                                  disabled={isBusy}
                                >
                                  {isBusy ? "..." : "Duyệt"}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() =>
                                    handleReturnRequestAction(request, "REJECT")
                                  }
                                  disabled={isBusy}
                                >
                                  Từ chối
                                </Button>
                              </>
                            )}
                            {status === "APPROVED" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleReturnRequestAction(
                                    request,
                                    "SHIPPING_BACK",
                                  )
                                }
                                disabled={isBusy}
                              >
                                Đánh dấu gửi trả
                              </Button>
                            )}
                            {(status === "APPROVED" ||
                              status === "SHIPPING_BACK") && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleReturnRequestAction(request, "RECEIVED")
                                }
                                disabled={isBusy}
                              >
                                Đã nhận hàng
                              </Button>
                            )}
                            {status === "RECEIVED" && (
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() =>
                                  handleReturnRequestAction(request, "REFUND")
                                }
                                disabled={isBusy}
                              >
                                Hoàn tiền
                              </Button>
                            )}
                          </div>,
                        ];
                      })}
                    />
                  )}
                </Panel>
              </div>
            </div>
          </section>

          <section id="warehouse" className={sectionClassName("warehouse")}>
            <SectionHeader
              sectionId="warehouse"
              icon={Warehouse}
              title="Quản lý kho"
              description="Tạo kho, nhập lô và theo dõi tồn kho"
            />
            <div className="grid gap-6 xl:grid-cols-5">
              <div className="xl:col-span-2 space-y-6">
                <Panel
                  title="Tạo kho mới"
                  description="Thêm kho để quản lý lô hàng"
                >
                  <div className="space-y-3">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Tên kho</label>
                      <input
                        type="text"
                        placeholder="VD: Kho Hà Nội"
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={warehouseForm.name}
                        onChange={(e) =>
                          setWarehouseForm((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Địa chỉ</label>
                      <input
                        type="text"
                        placeholder="Địa chỉ kho"
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={warehouseForm.address}
                        onChange={(e) =>
                          setWarehouseForm((prev) => ({
                            ...prev,
                            address: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Quản lý kho</label>
                      <input
                        type="text"
                        placeholder="Tên người quản lý"
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={warehouseForm.managerName}
                        onChange={(e) =>
                          setWarehouseForm((prev) => ({
                            ...prev,
                            managerName: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <Button
                      onClick={createWarehouse}
                      disabled={isSavingWarehouse}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      {isSavingWarehouse ? "Đang tạo..." : "Tạo kho"}
                    </Button>
                  </div>
                </Panel>

                <Panel
                  title="Nhập lô hàng"
                  description="Tạo batch mới và cộng tồn kho sản phẩm"
                >
                  <div className="space-y-3">
                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Kho</label>
                      <select
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={batchForm.warehouseId}
                        onChange={(e) =>
                          setBatchForm((prev) => ({
                            ...prev,
                            warehouseId: e.target.value,
                          }))
                        }
                      >
                        <option value="">Chọn kho</option>
                        {(warehouseOverview?.warehouses ?? []).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium">Sản phẩm</label>
                      <select
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={batchForm.productId}
                        onChange={(e) =>
                          setBatchForm((prev) => ({
                            ...prev,
                            productId: e.target.value,
                          }))
                        }
                      >
                        <option value="">Chọn sản phẩm</option>
                        {(warehouseOverview?.products ?? []).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name} (tồn: {Number(item.stockQuantity ?? 0)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium">
                        Nhà cung cấp
                      </label>
                      <select
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={batchForm.supplierId}
                        onChange={(e) =>
                          setBatchForm((prev) => ({
                            ...prev,
                            supplierId: e.target.value,
                          }))
                        }
                      >
                        <option value="">Chọn nhà cung cấp</option>
                        {(warehouseOverview?.suppliers ?? []).map((item) => (
                          <option key={item.id} value={item.id}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Giá nhập</label>
                        <input
                          type="number"
                          min="1"
                          className="rounded-md border bg-background px-3 py-2 text-sm"
                          value={batchForm.importPrice}
                          onChange={(e) =>
                            setBatchForm((prev) => ({
                              ...prev,
                              importPrice: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <label className="text-sm font-medium">Số lượng</label>
                        <input
                          type="number"
                          min="1"
                          className="rounded-md border bg-background px-3 py-2 text-sm"
                          value={batchForm.quantity}
                          onChange={(e) =>
                            setBatchForm((prev) => ({
                              ...prev,
                              quantity: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>

                    <div className="grid gap-2">
                      <label className="text-sm font-medium">
                        Mã lô (tuỳ chọn)
                      </label>
                      <input
                        type="text"
                        placeholder="Để trống để hệ thống tự sinh"
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={batchForm.batchCode}
                        onChange={(e) =>
                          setBatchForm((prev) => ({
                            ...prev,
                            batchCode: e.target.value,
                          }))
                        }
                      />
                    </div>

                    <Button
                      onClick={importBatchIntoWarehouse}
                      disabled={isImportingBatch}
                      className="gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      {isImportingBatch ? "Đang nhập..." : "Nhập lô hàng"}
                    </Button>
                  </div>
                </Panel>
              </div>

              <div className="xl:col-span-3 space-y-6">
                <Panel
                  title="Tình trạng kho"
                  description="Dữ liệu tổng hợp kho, lô và tồn sản phẩm"
                >
                  <div className="mb-4 grid gap-3 md:grid-cols-4">
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Tổng kho</p>
                      <p className="text-xl font-semibold">
                        {warehouseSummary.totalWarehouses}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">
                        Lô gần nhất
                      </p>
                      <p className="text-xl font-semibold">
                        {warehouseSummary.totalBatches}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Sản phẩm</p>
                      <p className="text-xl font-semibold">
                        {warehouseSummary.totalProducts}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-muted/20 p-3">
                      <p className="text-xs text-muted-foreground">Tổng tồn</p>
                      <p className="text-xl font-semibold">
                        {warehouseSummary.totalStockQuantity}
                      </p>
                    </div>
                  </div>

                  <div className="mb-4 flex gap-3">
                    <div className="flex-1 grid gap-2">
                      <label className="text-xs font-medium">Tìm kiếm</label>
                      <input
                        type="text"
                        placeholder="Tên kho, địa chỉ, quản lý..."
                        className="rounded-md border bg-background px-3 py-2 text-sm"
                        value={warehouseSearchKeyword}
                        onChange={(e) =>
                          setWarehouseSearchKeyword(e.target.value)
                        }
                      />
                    </div>
                    <div className="flex items-end">
                      <span className="text-xs text-muted-foreground">
                        Tìm thấy: <strong>{filteredWarehouses.length}</strong>{" "}
                        kho
                      </span>
                    </div>
                  </div>

                  {isLoadingWarehouse ? (
                    <p className="text-sm text-muted-foreground">
                      Đang tải dữ liệu kho...
                    </p>
                  ) : (filteredWarehouses ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Chưa có dữ liệu kho
                    </p>
                  ) : (
                    <DataTable
                      columns={["Kho", "Địa chỉ", "Quản lý", "Số lô"]}
                      rows={(filteredWarehouses ?? []).map((item) => [
                        item.name,
                        item.address ?? "-",
                        item.managerName ?? "-",
                        String(item.batches?.length ?? 0),
                      ])}
                    />
                  )}
                </Panel>

                <Panel
                  title="Lô hàng mới nhất"
                  description="Theo dõi nhập kho gần đây"
                >
                  {(warehouseRecentBatches ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Chưa có lô hàng nào
                    </p>
                  ) : (
                    <DataTable
                      columns={[
                        "Mã lô",
                        "Kho",
                        "Sản phẩm",
                        "NCC",
                        "Giá nhập",
                        "Số lượng",
                      ]}
                      rows={(warehouseRecentBatches ?? []).map((item) => [
                        item.batchCode ?? "-",
                        item.warehouse?.name ?? "-",
                        item.product?.name ?? "-",
                        item.supplier?.name ?? "-",
                        formatMoney(item.importPrice),
                        String(item.quantity ?? 0),
                      ])}
                    />
                  )}
                </Panel>
              </div>
            </div>
          </section>

          <section id="reviews" className={sectionClassName("reviews")}>
            <SectionHeader
              sectionId="reviews"
              icon={Star}
              title="Quản lý đánh giá"
              description="Theo dõi, kiểm duyệt và phản hồi đánh giá khách hàng"
            />
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <Panel title="Tổng đánh giá" description="Toàn bộ hệ thống">
                  <p className="text-2xl font-bold">{reviewOverview.total}</p>
                </Panel>
                <Panel title="Chờ phản hồi" description="Ưu tiên xử lý">
                  <p className="text-2xl font-bold text-amber-600">
                    {reviewOverview.waitingReply}
                  </p>
                </Panel>
                <Panel title="Đã ẩn" description="Nội dung vi phạm">
                  <p className="text-2xl font-bold text-slate-700">
                    {reviewOverview.hidden}
                  </p>
                </Panel>
                <Panel title="Sao thấp" description="Từ 1 đến 2 sao">
                  <p className="text-2xl font-bold text-rose-600">
                    {reviewOverview.lowRating}
                  </p>
                </Panel>
                <Panel title="24 giờ qua" description="Đánh giá mới">
                  <p className="text-2xl font-bold text-sky-600">
                    {reviewOverview.recent24h}
                  </p>
                </Panel>
              </div>

              <Panel
                title="Kiểm duyệt đánh giá"
                description="Danh sách gọn bên trái, xử lý chi tiết bên phải"
              >
                <div className="mb-4 grid gap-3 md:grid-cols-4">
                  <div className="grid gap-2">
                    <label className="text-xs font-medium">Tìm kiếm</label>
                    <input
                      type="text"
                      placeholder="Khách, sản phẩm, nội dung..."
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                      value={reviewSearchKeyword}
                      onChange={(e) => setReviewSearchKeyword(e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-medium">Sắp xếp</label>
                    <select
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                      value={reviewSortBy}
                      onChange={(e) => setReviewSortBy(e.target.value)}
                    >
                      <option value="newest">Mới nhất</option>
                      <option value="oldest">Cũ nhất</option>
                      <option value="highest-rating">Đánh giá cao</option>
                      <option value="lowest-rating">Đánh giá thấp</option>
                    </select>
                  </div>
                  <div className="grid gap-2">
                    <label className="text-xs font-medium">Hiển thị</label>
                    <select
                      className="rounded-md border bg-background px-3 py-2 text-sm"
                      value={reviewStatusFilter}
                      onChange={(e) => setReviewStatusFilter(e.target.value)}
                    >
                      <option value="all">Tất cả</option>
                      <option value="visible">Đang hiển thị</option>
                      <option value="hidden">Đã ẩn</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <span className="text-xs text-muted-foreground">
                      Tìm thấy: <strong>{filteredReviews.length}</strong> đánh
                      giá
                    </span>
                  </div>
                </div>

                <div className="mb-4 flex flex-wrap gap-2">
                  {[
                    { id: "all", label: "Tất cả" },
                    { id: "needs-reply", label: "Chờ phản hồi" },
                    { id: "replied", label: "Đã phản hồi" },
                    { id: "low-rating", label: "Sao thấp (<=2)" },
                    { id: "recent-24h", label: "Mới trong 24h" },
                  ].map((chip) => (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() => setReviewQuickFilter(chip.id)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${reviewQuickFilter === chip.id
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                        }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>

                {isLoadingReviews ? (
                  <p className="text-sm text-muted-foreground">
                    Đang tải dữ liệu đánh giá...
                  </p>
                ) : filteredReviews.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Không có đánh giá phù hợp với bộ lọc hiện tại.
                  </p>
                ) : (
                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                    <div className="space-y-3 rounded-2xl border border-border/60 bg-secondary/20 p-3">
                      {filteredReviews.map((item) => {
                        const isSelected =
                          Number(selectedReview?.id) === Number(item.id);
                        return (
                          <button
                            key={`review-list-item-${item.id}`}
                            type="button"
                            onClick={() => setSelectedReviewId(Number(item.id))}
                            className={`w-full rounded-xl border px-3 py-3 text-left transition ${isSelected
                              ? "border-primary bg-primary/5 shadow-sm"
                              : "border-border/70 bg-background hover:border-primary/40"
                              }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">
                                  {item.product?.name ?? "-"}
                                </p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {item.user?.fullName ??
                                    item.user?.email ??
                                    "Ẩn danh"}
                                </p>
                              </div>
                              {statusBadge(
                                item.isHidden ? "Đã ẩn" : "Đang hiển thị",
                              )}
                            </div>
                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-semibold text-amber-600">{`${item.rating} sao`}</span>
                              <span>•</span>
                              <span>{formatDate(item.createdAt)}</span>
                            </div>
                            <p className="mt-2 line-clamp-2 text-sm text-slate-700">
                              {item.comment || "Không có nội dung"}
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="rounded-2xl border border-border/60 bg-background p-4">
                      {selectedReview ? (
                        <div className="space-y-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <h4 className="text-base font-semibold">
                                {selectedReview.product?.name ?? "Sản phẩm"}
                              </h4>
                              <p className="text-xs text-muted-foreground">
                                {selectedReview.user?.fullName ??
                                  selectedReview.user?.email ??
                                  "Ẩn danh"}
                              </p>
                            </div>
                            {statusBadge(
                              selectedReview.isHidden
                                ? "Đã ẩn"
                                : "Đang hiển thị",
                            )}
                          </div>

                          <div className="rounded-xl border border-border/60 bg-secondary/30 p-3 text-sm">
                            <p className="font-medium text-amber-600">{`${selectedReview.rating} sao`}</p>
                            <p className="mt-1 whitespace-pre-wrap">
                              {selectedReview.comment ||
                                "Không có nội dung đánh giá"}
                            </p>
                          </div>

                          <div className="grid gap-2 text-xs text-muted-foreground md:grid-cols-2">
                            <div>
                              Tạo lúc: {formatDate(selectedReview.createdAt)}
                            </div>
                            <div>
                              Cập nhật: {formatDate(selectedReview.updatedAt)}
                            </div>
                            <div>
                              Kiểm duyệt:{" "}
                              {selectedReview.moderatedAt
                                ? formatDate(selectedReview.moderatedAt)
                                : "Chưa"}
                            </div>
                            <div>
                              Người kiểm duyệt:{" "}
                              {selectedReview.moderator?.fullName ?? "-"}
                            </div>
                          </div>

                          {selectedReview.hiddenReason ? (
                            <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                              Lý do ẩn: {selectedReview.hiddenReason}
                            </div>
                          ) : null}

                          <div className="space-y-2">
                            <label className="text-xs font-semibold">
                              Phản hồi quản trị
                            </label>
                            <textarea
                              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                              rows={4}
                              placeholder="Nhập phản hồi tư vấn kỹ thuật hoặc cảm ơn khách hàng..."
                              value={
                                reviewReplyDraftById[selectedReview.id] ?? ""
                              }
                              onChange={(event) =>
                                setReviewReplyDraftById((prev) => ({
                                  ...prev,
                                  [selectedReview.id]: event.target.value,
                                }))
                              }
                            />
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="text-xs text-muted-foreground">
                                {selectedReview.adminRepliedAt
                                  ? `Lần phản hồi cuối: ${formatDate(selectedReview.adminRepliedAt)}`
                                  : "Chưa có phản hồi"}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={
                                  replyingReviewId === Number(selectedReview.id)
                                }
                                onClick={() =>
                                  saveReviewReply(Number(selectedReview.id))
                                }
                              >
                                {replyingReviewId === Number(selectedReview.id)
                                  ? "Đang lưu..."
                                  : "Lưu phản hồi"}
                              </Button>
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={
                                moderatingReviewId === Number(selectedReview.id)
                              }
                              onClick={() =>
                                moderateReview(
                                  selectedReview,
                                  !selectedReview.isHidden,
                                )
                              }
                            >
                              {moderatingReviewId === Number(selectedReview.id)
                                ? "Đang cập nhật..."
                                : selectedReview.isHidden
                                  ? "Hiện đánh giá"
                                  : "Ẩn đánh giá"}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={
                                deletingReviewId === Number(selectedReview.id)
                              }
                              onClick={() => removeReview(selectedReview)}
                            >
                              {deletingReviewId === Number(selectedReview.id)
                                ? "Đang xóa..."
                                : "Xóa đánh giá"}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )}
              </Panel>
            </div>
          </section>

          <section id="chat" className={sectionClassName("chat")}>
            <SectionHeader
              sectionId="chat"
              icon={MessageSquareMore}
              title="Chat khách hàng"
              description="Phòng chat mới nhất"
            />
            <AdminChatPanel token={token} currentUser={user} toast={toast} />
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

          <section
            id="verification"
            className={sectionClassName("verification")}
          >
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
                columns={[
                  "Email",
                  "OTP",
                  "Mục đích",
                  "Tạo lúc",
                  "Hết hạn",
                  "Trạng thái",
                ]}
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
              title="Phân quyền"
              description="Chọn tài khoản nhân viên và tick đúng chức năng được phép hiển thị"
            />
            <Panel
              title="Chọn tài khoản"
              description="Tài khoản admin@gmail.com luôn có toàn bộ quyền"
            >
              <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                <div className="space-y-3">
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Tài khoản nhân viên
                  </label>
                  <select
                    className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                    value={selectedPermissionTargetId}
                    onChange={(event) =>
                      setSelectedPermissionTargetId(event.target.value)
                    }
                  >
                    {permissionTargets.map((item) => (
                      <option key={item.id} value={String(item.id)}>
                        {item.fullName || item.email}{" "}
                        {item.role?.name ? `(${item.role.name})` : ""}
                      </option>
                    ))}
                  </select>

                  {selectedPermissionTarget ? (
                    <div className="rounded-2xl border border-border/60 bg-secondary/40 p-4 text-sm">
                      <div className="font-semibold">
                        {selectedPermissionTarget.fullName ||
                          selectedPermissionTarget.email}
                      </div>
                      <div className="text-muted-foreground">
                        {selectedPermissionTarget.email}
                      </div>
                      <div className="mt-2 text-xs uppercase tracking-wide text-muted-foreground">
                        {String(selectedPermissionTarget.email ?? "")
                          .trim()
                          .toLowerCase() === "admin@gmail.com"
                          ? "Siêu quản trị"
                          : selectedPermissionTarget.role?.name ||
                          "Chưa có vai trò"}
                      </div>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">
                      Quyền theo menu
                    </span>
                    {selectedPermissionTarget ? (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                        {
                          menuPermissionOptions.filter((item) =>
                            effectiveSelectedPermissionDraft.includes(
                              item.actionName,
                            ),
                          ).length
                        }{" "}
                        mục
                      </span>
                    ) : null}
                  </div>

                  <div className="grid gap-3 lg:grid-cols-2">
                    {menuPermissionOptions.map((permissionItem) => {
                      const actionName = String(
                        permissionItem.actionName ?? "",
                      );
                      const isSuperAdmin =
                        String(selectedPermissionTarget?.email ?? "")
                          .trim()
                          .toLowerCase() === "admin@gmail.com";
                      const checked = isSuperAdmin
                        ? true
                        : effectiveSelectedPermissionDraft.includes(actionName);

                      return (
                        <label
                          key={actionName}
                          className="flex cursor-pointer items-start gap-2 rounded-2xl border border-border/60 bg-secondary/50 px-3 py-2 text-sm"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isSuperAdmin || !selectedPermissionTarget}
                            onChange={(event) =>
                              selectedPermissionTarget
                                ? toggleUserPermission(
                                  selectedPermissionTarget.id,
                                  actionName,
                                  event.target.checked,
                                )
                                : null
                            }
                            className="mt-1"
                          />
                          <span className="flex flex-col gap-1">
                            <span className="font-medium">
                              {permissionItem.label}
                            </span>

                            {permissionItem.description ? (
                              <span className="text-xs text-muted-foreground">
                                {permissionItem.description}
                              </span>
                            ) : null}
                          </span>
                        </label>
                      );
                    })}
                  </div>

                  <Button
                    type="button"
                    onClick={() =>
                      selectedPermissionTarget
                        ? saveUserPermissions(selectedPermissionTarget)
                        : null
                    }
                    disabled={
                      !selectedPermissionTarget ||
                      savingPermissionTargetId ===
                      Number(selectedPermissionTarget?.id) ||
                      String(selectedPermissionTarget?.email ?? "")
                        .trim()
                        .toLowerCase() === "admin@gmail.com"
                    }
                    className="w-full"
                  >
                    {savingPermissionTargetId ===
                      Number(selectedPermissionTarget?.id)
                      ? "Đang lưu quyền tài khoản..."
                      : String(selectedPermissionTarget?.email ?? "")
                        .trim()
                        .toLowerCase() === "admin@gmail.com"
                        ? "Siêu quản trị luôn có toàn quyền"
                        : "Lưu quyền tài khoản"}
                  </Button>
                </div>
              </div>
            </Panel>
          </section>
        </main>
      </div>
    </div>
  );
}

function SectionHeader({ icon: Icon, title, description, sectionId }) {
  const schema = schemaBySection[sectionId] ?? schemaBySection.dashboard;

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
      value === "Đã hoàn tiền" ||
      value === "Đã duyệt" ||
      value === "Đã nhận hàng" ||
      value === "Đã giao" ||
      value === "Đã giao hàng" ||
      value === "Đã kết nối" ||
      value === "Đã đăng" ||
      value === "Phổ biến" ||
      value === "Đã xác minh" ||
      value === "Còn hàng" ||
      value === "Đã dùng" ||
      value === "Đang hiển thị"
      ? "bg-emerald-100 text-emerald-700"
      : value === "Đang chờ" ||
        value === "Chờ xác nhận" ||
        value === "Chờ thanh toán" ||
        value === "Đang xử lý" ||
        value === "Đang chuẩn bị" ||
        value === "Đang gửi trả" ||
        value === "Tạm dừng" ||
        value === "Cần xem xét" ||
        value === "Bản nháp" ||
        value === "Ổn định"
        ? "bg-amber-100 text-amber-700"
        : value === "Đang giao" ||
          value === "Đang vận chuyển" ||
          value === "Quản trị viên" ||
          value === "Nhân viên" ||
          value === "Mở"
          ? "bg-sky-100 text-sky-700"
          : value === "Đã từ chối"
            ? "bg-rose-100 text-rose-700"
          : value === "Đã ẩn"
            ? "bg-slate-200 text-slate-700"
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

function formatOrderStatusLabelAdmin(orderStatusValue, paymentStatusValue) {
  const orderStatus = String(orderStatusValue ?? "")
    .trim()
    .toUpperCase();
  const paymentStatus = String(paymentStatusValue ?? "")
    .trim()
    .toUpperCase();

  if (orderStatus === "PENDING") return "Chờ xác nhận";
  if (orderStatus === "PROCESSING") return "Đang chuẩn bị";
  if (orderStatus === "SHIPPING") return "Đang vận chuyển";
  if (orderStatus === "DELIVERED") return "Đã giao hàng";
  if (orderStatus === "CANCELLED" && paymentStatus === "FAILED")
    return "Thất bại";
  if (orderStatus === "CANCELLED") return "Đã hủy";
  return formatEnum(orderStatus);
}

function formatPaymentStatusLabelAdmin(value) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  if (normalized === "PAID") return "Đã thanh toán";
  if (normalized === "PENDING") return "Chờ thanh toán";
  if (normalized === "FAILED") return "Thanh toán thất bại";
  if (normalized === "REFUNDED") return "Đã hoàn tiền";
  return formatEnum(normalized);
}

function formatReturnStatusLabelAdmin(value) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized === "PENDING") return "Đang chờ";
  if (normalized === "APPROVED") return "Đã duyệt";
  if (normalized === "REJECTED") return "Đã từ chối";
  if (normalized === "SHIPPING_BACK") return "Đang gửi trả";
  if (normalized === "RECEIVED") return "Đã nhận hàng";
  if (normalized === "REFUNDED") return "Đã hoàn tiền";
  if (normalized === "CANCELLED") return "Đã hủy";
  return formatEnum(normalized);
}

function formatPaymentMethodLabelAdmin(value) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  if (normalized === "COD") return "COD";
  if (normalized === "VNPAY" || normalized === "PAYOS") return "QR";
  return normalized || "-";
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

function buildProductCode(name) {
  const base = String(name ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "D")
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 18);

  if (!base) {
    return "";
  }

  const suffix = String(Date.now()).slice(-6);
  return `${base}-${suffix}`;
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
    return decodeURIComponent(
      String(value ?? "")
        .trim()
        .toLowerCase(),
    );
  } catch {
    return String(value ?? "")
      .trim()
      .toLowerCase();
  }
}

function normalizeTabToken(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/^#+/, "")
    .replace(/[^a-z0-9]/g, "");
}

function getTabAliases(item) {
  const compactSlug = slugifyTabLabel(item.label).replace(/-/g, "");
  const aliases = [
    item.id,
    item.hash,
    item.label,
    slugifyTabLabel(item.label),
    compactSlug,
  ];

  if (item.id === "products") {
    aliases.push("sanpham", "san-pham", "sp");
  }
  if (item.id === "users") {
    aliases.push("nguoidung", "nguoi-dung", "user");
  }
  if (item.id === "orders") {
    aliases.push("donhang", "don-hang", "order");
  }

  return aliases.map(normalizeTabToken).filter(Boolean);
}

function resolveTabIdFromLocation() {
  if (typeof window === "undefined") {
    return null;
  }

  const hashToken = normalizeTabToken(
    normalizeHash(window.location.hash || ""),
  );
  const queryToken = normalizeTabToken(
    new URLSearchParams(window.location.search).get("tab") ?? "",
  );
  const token = hashToken || queryToken;

  if (!token) {
    return null;
  }

  const match = navItems.find((item) => getTabAliases(item).includes(token));
  return match?.id ?? null;
}

function normalizePermissionActions(values) {
  return Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((item) => String(item ?? "").trim())
        .filter(Boolean),
    ),
  );
}

function canAccessAdminTab(tabId, context = {}) {
  const permission = tabPermissionMap[tabId];
  if (!permission) {
    return true;
  }

  const normalizedEmail = String(context.email ?? "")
    .trim()
    .toLowerCase();
  if (normalizedEmail === SUPER_ADMIN_EMAIL) {
    return true;
  }

  const normalizedRole = String(context.role ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
  const permissions = normalizePermissionActions(context.permissions);

  const isAdminRole =
    normalizedRole.includes("admin") || normalizedRole.includes("quan tri");
  const hasAdminPermission = permissions.some((item) =>
    String(item ?? "")
      .toLowerCase()
      .startsWith("admin_"),
  );

  if (!isAdminRole && !hasAdminPermission) {
    return false;
  }

  return permissions.includes(permission);
}
