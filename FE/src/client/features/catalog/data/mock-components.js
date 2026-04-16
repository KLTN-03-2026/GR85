// ⚠️ ALL PRODUCT DATA IS NOW LOADED FROM MySQL VIA API
// This file now only contains configuration data

export const componentCategories = [
  { id: "cpu", name: "CPU", icon: "Cpu", color: "cpu" },
  { id: "gpu", name: "Card đồ họa", icon: "Monitor", color: "gpu" },
  { id: "ram", name: "RAM", icon: "MemoryStick", color: "ram" },
  { id: "storage", name: "Ổ cứng", icon: "HardDrive", color: "storage" },
  {
    id: "motherboard",
    name: "Bo mạch chủ",
    icon: "CircuitBoard",
    color: "motherboard",
  },
  { id: "psu", name: "Nguồn", icon: "Zap", color: "psu" },
  { id: "case", name: "Case", icon: "Box", color: "case" },
  { id: "cooling", name: "Tản nhiệt", icon: "Fan", color: "cooling" },
  // Peripherals
  { id: "monitor", name: "Màn hình", icon: "Monitor", color: "monitor" },
  { id: "mouse", name: "Chuột", icon: "Package", color: "mouse" },
  { id: "keyboard", name: "Bàn phím", icon: "Package", color: "keyboard" },
  { id: "headset", name: "Tai nghe", icon: "Package", color: "headset" },
  { id: "speaker", name: "Loa", icon: "Package", color: "speaker" },
  { id: "webcam", name: "Webcam", icon: "Package", color: "webcam" },
  { id: "microphone", name: "Microphone", icon: "Package", color: "microphone" },
  { id: "cable", name: "Cáp", icon: "Package", color: "cable" },
  { id: "hub", name: "Hub", icon: "Package", color: "hub" },
  { id: "stand", name: "Giá đỡ", icon: "Package", color: "stand" },
  { id: "pad", name: "Lót chuột", icon: "Package", color: "pad" },
];

export const usageTypes = [
  { id: "gaming", name: "Gaming", description: "Chơi game AAA, esports" },
  {
    id: "workstation",
    name: "Workstation",
    description: "Render 3D, AI/ML, Video editing",
  },
  { id: "streaming", name: "Streaming", description: "Stream + Chơi game" },
  { id: "office", name: "Văn phòng", description: "Làm việc, học tập" },
  { id: "all-rounder", name: "Đa năng", description: "Cân bằng mọi nhu cầu" },
];

export const brands = [
  "AMD",
  "Intel",
  "NVIDIA",
  "ASUS",
  "Gigabyte",
  "MSI",
  "Corsair",
  "G.Skill",
  "Samsung",
  "WD Black",
  "Lian Li",
  "NZXT",
  "Noctua",
];

