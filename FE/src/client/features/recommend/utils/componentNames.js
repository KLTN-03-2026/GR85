// Mapping giữa tên tiếng Anh và tiếng Việt chuẩn hóa cho các linh kiện
export const COMPONENT_NAME_MAPPING = {
  // Categories
  categories: {
    cpu: "Bộ xử lý",
    vga: "Card màn hình",
    gpu: "Card màn hình",
    mainboard: "Bo mạch chủ",
    ram: "Bộ nhớ RAM",
    ssd: "Ổ cứng SSD",
    hdd: "Ổ cứng HDD",
    psu: "Nguồn điện",
    case: "Thùng máy",
    cooling: "Tản nhiệt",
    monitor: "Màn hình",
    mouse: "Chuột",
    keyboard: "Bàn phím",
    headset: "Tai nghe",
    webcam: "Webcam",
    speaker: "Loa",
    microphone: "Micro",
    hub: "Bộ chia cổng",
    pad: "Tấm lót chuột",
    stand: "Giá đỡ",
    cable: "Cáp kết nối",
  },

  // Brand standardization
  brands: {
    intel: "Intel",
    amd: "AMD",
    nvidia: "NVIDIA",
    msi: "MSI",
    gigabyte: "Gigabyte",
    asus: "ASUS",
    corsair: "Corsair",
    kingston: "Kingston",
    samsung: "Samsung",
    western: "Western Digital",
    seagate: "Seagate",
    noctua: "Noctua",
    be: "be quiet!",
    coolermaster: "Cooler Master",
    deepcool: "DEEPCOOL",
    evga: "EVGA",
    asrock: "ASRock",
    biostar: "BIOSTAR",
    palit: "Palit",
    kfa: "KFA",
    zotac: "ZOTAC",
  },

  // Common product name standardization
  products: {
    // CPU naming
    "i9": "Intel Core i9",
    "i7": "Intel Core i7",
    "i5": "Intel Core i5",
    "i3": "Intel Core i3",
    "ryzen 9": "AMD Ryzen 9",
    "ryzen 7": "AMD Ryzen 7",
    "ryzen 5": "AMD Ryzen 5",
    "ryzen 3": "AMD Ryzen 3",

    // GPU naming
    "rtx 4090": "NVIDIA RTX 4090",
    "rtx 4080": "NVIDIA RTX 4080",
    "rtx 4070": "NVIDIA RTX 4070",
    "rtx 4060": "NVIDIA RTX 4060",
    "rx 7900": "AMD Radeon RX 7900",
    "rx 7800": "AMD Radeon RX 7800",
  },

  // Specifications standardization
  specs: {
    "cores": "Lõi",
    "threads": "Luồng",
    "ghz": "GHz",
    "vram": "VRAM",
    "memory": "Dung lượng",
    "speed": "Tốc độ",
    "capacity": "Dung lượng",
    "frequency": "Tần số",
    "power": "Công suất",
    "efficiency": "Hiệu suất",
    "rpm": "Vòng/phút",
    "noise": "Tiếng ồn",
    "db": "dB",
  },
};

/**
 * Chuẩn hóa tên danh mục tiếng Việt
 * @param {string} categorySlug - Category slug (cpu, vga, mainboard, etc.)
 * @returns {string} - Tên tiếng Việt chuẩn hóa
 */
export function getVietnameseCategory(categorySlug) {
  const slug = String(categorySlug || "").toLowerCase().trim();
  return COMPONENT_NAME_MAPPING.categories[slug] || categorySlug;
}

/**
 * Chuẩn hóa tên hãng tiếng Việt
 * @param {string} brandName - Tên hãng
 * @returns {string} - Tên chuẩn hóa
 */
export function getStandardizedBrand(brandName) {
  if (!brandName) return "";
  const lower = String(brandName).toLowerCase().trim();
  return COMPONENT_NAME_MAPPING.brands[lower] || brandName;
}

/**
 * Chuẩn hóa tên sản phẩm (rút gọn và làm rõ)
 * @param {string} productName - Tên sản phẩm
 * @returns {string} - Tên chuẩn hóa
 */
export function standardizeProductName(productName) {
  if (!productName) return "";
  
  let name = String(productName).trim();
  
  // Loại bỏ các ký tự không cần thiết
  name = name.replace(/[\(\)\[\]]/g, " ");
  
  // Chuẩn hóa khoảng trắng
  name = name.replace(/\s+/g, " ");
  
  // Chuyển đổi chữ hoa chữ thường một cách hợp lý
  name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  
  return name;
}

/**
 * Tạo thẻ tiếng Việt hoàn chỉnh cho một linh kiện
 * @param {object} item - Component object
 * @returns {string} - Tên đầy đủ tiếng Việt (Danh mục: Hãng - Sản phẩm)
 */
export function getFullComponentLabel(item) {
  if (!item) return "";
  
  const categoryVi = getVietnameseCategory(item.category || item.categorySlug);
  const brandVi = getStandardizedBrand(item.brand);
  const productName = standardizeProductName(item.name);
  
  return `${categoryVi}: ${brandVi} - ${productName}`;
}

/**
 * Format giá theo tiêu chuẩn Việt Nam
 * @param {number} price - Giá tiền
 * @returns {string} - Giá định dạng
 */
export function formatPriceVN(price) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

/**
 * Tạo mô tả sản phẩm tiếng Việt hoàn chỉnh
 * @param {object} item - Component object
 * @returns {string} - Mô tả đầy đủ
 */
export function createComponentDescription(item) {
  if (!item) return "";
  
  const fullLabel = getFullComponentLabel(item);
  const price = formatPriceVN(item.price);
  
  let desc = `${fullLabel}\n${price}`;
  
  if (item.stockQuantity) {
    desc += `\nTồn kho: ${item.stockQuantity}`;
  }
  
  if (item.specifications && Object.keys(item.specifications).length > 0) {
    desc += "\nThông số:\n";
    Object.entries(item.specifications).forEach(([key, value]) => {
      const keyVi = COMPONENT_NAME_MAPPING.specs[key.toLowerCase()] || key;
      desc += `  • ${keyVi}: ${value}\n`;
    });
  }
  
  return desc;
}
