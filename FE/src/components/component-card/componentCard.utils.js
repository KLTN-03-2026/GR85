const CATEGORY_STYLE_MAP = {
  cpu: "bg-cpu/20 text-cpu border-cpu/30",
  gpu: "bg-gpu/20 text-gpu border-gpu/30",
  ram: "bg-ram/20 text-ram border-ram/30",
  storage: "bg-storage/20 text-storage border-storage/30",
  motherboard: "bg-motherboard/20 text-motherboard border-motherboard/30",
  psu: "bg-psu/20 text-psu border-psu/30",
  case: "bg-case/20 text-case border-case/30",
  cooling: "bg-cooling/20 text-cooling border-cooling/30",
  monitor: "bg-blue-500/20 text-blue-700 border-blue-500/30",
  mouse: "bg-purple-500/20 text-purple-700 border-purple-500/30",
  keyboard: "bg-indigo-500/20 text-indigo-700 border-indigo-500/30",
  headset: "bg-orange-500/20 text-orange-700 border-orange-500/30",
  speaker: "bg-rose-500/20 text-rose-700 border-rose-500/30",
  webcam: "bg-teal-500/20 text-teal-700 border-teal-500/30",
  microphone: "bg-amber-500/20 text-amber-700 border-amber-500/30",
  cable: "bg-slate-500/20 text-slate-700 border-slate-500/30",
  hub: "bg-cyan-500/20 text-cyan-700 border-cyan-500/30",
  stand: "bg-lime-500/20 text-lime-700 border-lime-500/30",
  pad: "bg-fuchsia-500/20 text-fuchsia-700 border-fuchsia-500/30",
  hdd: "bg-gray-500/20 text-gray-700 border-gray-500/30",
};

const CATEGORY_LABEL_MAP = {
  cpu: "CPU",
  gpu: "GPU",
  ram: "RAM",
  storage: "SSD",
  motherboard: "Mainboard",
  psu: "PSU",
  case: "Case",
  cooling: "Tản nhiệt",
  monitor: "Màn hình",
  mouse: "Chuột",
  keyboard: "Bàn phím",
  headset: "Tai nghe",
  speaker: "Loa",
  webcam: "Webcam",
  microphone: "Mic",
  cable: "Cáp",
  hub: "Hub",
  stand: "Giá đỡ",
  pad: "Lót chuột",
  hdd: "HDD",
};

export function formatComponentPrice(price) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(price);
}

export function getComponentCategoryStyle(category) {
  return CATEGORY_STYLE_MAP[category] || "bg-gray-100/20 text-gray-700 border-gray-100/30";
}

export function getComponentCategoryLabel(category) {
  return CATEGORY_LABEL_MAP[category] || "Sản phẩm";
}