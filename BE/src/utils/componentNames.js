// Backend mapping cho tên tiếng Việt chuẩn hóa

export const COMPONENT_NAME_MAPPING = {
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
};

export function getVietnameseCategory(categorySlug) {
  const slug = String(categorySlug || "").toLowerCase().trim();
  return COMPONENT_NAME_MAPPING.categories[slug] || categorySlug;
}

export function mapCategoryToVietnamese(categorySlug) {
  return getVietnameseCategory(categorySlug);
}
