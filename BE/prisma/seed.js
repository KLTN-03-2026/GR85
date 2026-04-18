import "dotenv/config";
import { PrismaClient, UserStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await hash("123456", 10);

  const [adminRole, userRole] = await Promise.all([
    prisma.role.upsert({
      where: { name: "Admin" },
      update: { description: "System administrator" },
      create: { name: "Admin", description: "System administrator" },
    }),
    prisma.role.upsert({
      where: { name: "User" },
      update: { description: "Default customer role" },
      create: { name: "User", description: "Default customer role" },
    }),
  ]);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@gmail.com" },
    update: {
      fullName: "System Admin",
      passwordHash: hashedPassword,
      status: UserStatus.ACTIVE,
      roleId: adminRole.id,
      phone: "0900000000",
      address: "TP.HCM",
    },
    create: {
      email: "admin@gmail.com",
      fullName: "System Admin",
      passwordHash: hashedPassword,
      status: UserStatus.ACTIVE,
      roleId: adminRole.id,
      phone: "0900000000",
      address: "TP.HCM",
    },
  });

  await prisma.cart.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: { userId: adminUser.id },
  });

  const categoriesInput = [
    // Core PC Components
    { name: "CPU", slug: "cpu", description: "Bộ xử lý trung tâm" },
    { name: "Mainboard", slug: "mainboard", description: "Bo mạch chủ" },
    { name: "RAM", slug: "ram", description: "Bộ nhớ tạm" },
    { name: "VGA", slug: "vga", description: "Card đồ họa" },
    { name: "SSD", slug: "ssd", description: "Lưu trữ tốc độ cao" },
    { name: "HDD", slug: "hdd", description: "Ổ cứng" },
    { name: "PSU", slug: "psu", description: "Nguồn điện" },
    { name: "Case", slug: "case", description: "Vỏ máy" },
    { name: "Cooling", slug: "cooling", description: "Tản nhiệt" },
    // Peripherals
    { name: "Monitor", slug: "monitor", description: "Màn hình" },
    { name: "Mouse", slug: "mouse", description: "Chuột" },
    { name: "Keyboard", slug: "keyboard", description: "Bàn phím" },
    { name: "Headset", slug: "headset", description: "Tai nghe" },
    { name: "Speaker", slug: "speaker", description: "Loa" },
    { name: "Webcam", slug: "webcam", description: "Camera web" },
    { name: "Microphone", slug: "microphone", description: "Microphone" },
    // Accessories & Cables
    { name: "Cable", slug: "cable", description: "Cáp kết nối" },
    { name: "Hub", slug: "hub", description: "Bộ chia cổng" },
    { name: "Stand", slug: "stand", description: "Giá đỡ" },
    { name: "Pad", slug: "pad", description: "Lót chuột" },
  ];

  const suppliersInput = [
    {
      name: "Tech Distribution VN",
      contactPerson: "Nguyen Van A",
      phone: "0901000001",
      email: "techdist@example.com",
      address: "Quan 1, TP.HCM",
    },
    {
      name: "PC Parts Hub",
      contactPerson: "Tran Thi B",
      phone: "0901000002",
      email: "pcparts@example.com",
      address: "Quan 3, TP.HCM",
    },
    {
      name: "Global Component Supply",
      contactPerson: "Le Van C",
      phone: "0901000003",
      email: "globalsupply@example.com",
      address: "Quan 7, TP.HCM",
    },
  ];

  const categories = await Promise.all(
    categoriesInput.map((item) =>
      prisma.category.upsert({
        where: { slug: item.slug },
        update: {
          name: item.name,
          description: item.description,
        },
        create: item,
      }),
    ),
  );

  const suppliers = [];

  for (const item of suppliersInput) {
    const existingSupplier = await prisma.supplier.findFirst({
      where: { name: item.name },
    });

    if (existingSupplier) {
      const updatedSupplier = await prisma.supplier.update({
        where: { id: existingSupplier.id },
        data: {
          contactPerson: item.contactPerson,
          phone: item.phone,
          email: item.email,
          address: item.address,
        },
      });
      suppliers.push(updatedSupplier);
      continue;
    }

    const createdSupplier = await prisma.supplier.create({
      data: item,
    });
    suppliers.push(createdSupplier);
  }

  const cpuProducts = [
    {
      name: "Intel Core i3-14100",
      slug: "intel-core-i3-14100",
      price: 3200000,
      cores: 4,
      threads: 8,
      baseClock: "3.5GHz",
    },
    {
      name: "Intel Core i5-14400F",
      slug: "intel-core-i5-14400f",
      price: 5200000,
      cores: 10,
      threads: 16,
      baseClock: "2.5GHz",
    },
    {
      name: "Intel Core i5-14600K",
      slug: "intel-core-i5-14600k",
      price: 8500000,
      cores: 14,
      threads: 20,
      baseClock: "3.5GHz",
    },
    {
      name: "Intel Core i7-14700K",
      slug: "intel-core-i7-14700k",
      price: 10800000,
      cores: 20,
      threads: 28,
      baseClock: "3.4GHz",
    },
    {
      name: "Intel Core i9-14900K",
      slug: "intel-core-i9-14900k",
      price: 15500000,
      cores: 24,
      threads: 32,
      baseClock: "3.2GHz",
    },
    {
      name: "AMD Ryzen 5 5600G",
      slug: "amd-ryzen-5-5600g",
      price: 3800000,
      cores: 6,
      threads: 12,
      baseClock: "3.9GHz",
    },
    {
      name: "AMD Ryzen 5 7600",
      slug: "amd-ryzen-5-7600",
      price: 5600000,
      cores: 6,
      threads: 12,
      baseClock: "3.8GHz",
    },
    {
      name: "AMD Ryzen 7 5800X3D",
      slug: "amd-ryzen-7-5800x3d",
      price: 8200000,
      cores: 8,
      threads: 16,
      baseClock: "3.4GHz",
    },
    {
      name: "AMD Ryzen 7 7700X",
      slug: "amd-ryzen-7-7700x",
      price: 8900000,
      cores: 8,
      threads: 16,
      baseClock: "4.5GHz",
    },
    {
      name: "AMD Ryzen 7 7800X3D",
      slug: "amd-ryzen-7-7800x3d",
      price: 9700000,
      cores: 8,
      threads: 16,
      baseClock: "4.2GHz",
    },
    {
      name: "AMD Ryzen 9 7900X",
      slug: "amd-ryzen-9-7900x",
      price: 11200000,
      cores: 12,
      threads: 24,
      baseClock: "4.7GHz",
    },
    {
      name: "AMD Ryzen 9 7900X3D",
      slug: "amd-ryzen-9-7900x3d",
      price: 13500000,
      cores: 12,
      threads: 24,
      baseClock: "4.0GHz",
    },
    {
      name: "AMD Ryzen 9 7950X",
      slug: "amd-ryzen-9-7950x",
      price: 14800000,
      cores: 16,
      threads: 32,
      baseClock: "4.5GHz",
    },
    {
      name: "Intel Core Ultra 5 135U",
      slug: "intel-core-ultra-5-135u",
      price: 4200000,
      cores: 10,
      threads: 12,
      baseClock: "1.3GHz",
    },
    {
      name: "AMD Ryzen 5 8600H",
      slug: "amd-ryzen-5-8600h",
      price: 5100000,
      cores: 6,
      threads: 12,
      baseClock: "3.2GHz",
    },
    {
      name: "Intel Core i7-14650HX",
      slug: "intel-core-i7-14650hx",
      price: 11900000,
      cores: 14,
      threads: 20,
      baseClock: "1.8GHz",
    },
    {
      name: "AMD Ryzen 7 8840HS",
      slug: "amd-ryzen-7-8840hs",
      price: 10500000,
      cores: 8,
      threads: 16,
      baseClock: "3.3GHz",
    },
    {
      name: "Intel Core i5-13600K",
      slug: "intel-core-i5-13600k",
      price: 7200000,
      cores: 14,
      threads: 20,
      baseClock: "3.0GHz",
    },
    {
      name: "AM D Ryzen 5 5500",
      slug: "amd-ryzen-5-5500",
      price: 2900000,
      cores: 6,
      threads: 12,
      baseClock: "3.6GHz",
    },
    {
      name: "Intel Pentium G7400",
      slug: "intel-pentium-g7400",
      price: 1900000,
      cores: 2,
      threads: 4,
      baseClock: "3.7GHz",
    },
  ];

  const mainboardProducts = [
    {
      name: "ASUS TUF B760M-PLUS WIFI",
      slug: "asus-tuf-b760m-plus-wifi",
      price: 4200000,
      socket: "LGA1700",
      chipset: "B760",
    },
    {
      name: "MSI PRO B650M-A WIFI",
      slug: "msi-pro-b650m-a-wifi",
      price: 4300000,
      socket: "AM5",
      chipset: "B650",
    },
    {
      name: "Gigabyte Z790 AORUS ELITE AX",
      slug: "gigabyte-z790-aorus-elite-ax",
      price: 7300000,
      socket: "LGA1700",
      chipset: "Z790",
    },
    {
      name: "ASRock B550M Steel Legend",
      slug: "asrock-b550m-steel-legend",
      price: 2900000,
      socket: "AM4",
      chipset: "B550",
    },
    {
      name: "ASUS ProArt B850-CREATOR",
      slug: "asus-proart-b850-creator",
      price: 6800000,
      socket: "AM5",
      chipset: "B850",
    },
    {
      name: "Gigabyte B650M AORUS PRO",
      slug: "gigabyte-b650m-aorus-pro",
      price: 4600000,
      socket: "AM5",
      chipset: "B650",
    },
    {
      name: "MSI MPG Z790 EDGE WIFI",
      slug: "msi-mpg-z790-edge-wifi",
      price: 8900000,
      socket: "LGA1700",
      chipset: "Z790",
    },
    {
      name: "ASUS ROG STRIX Z690-E",
      slug: "asus-rog-strix-z690-e",
      price: 7200000,
      socket: "LGA1700",
      chipset: "Z690",
    },
    {
      name: "ASRock Z590 Phantom Gaming-ITX/TB3",
      slug: "asrock-z590-pg-itx",
      price: 5200000,
      socket: "LGA1200",
      chipset: "Z590",
    },
    {
      name: "ASUS PRIME B550M-K",
      slug: "asus-prime-b550m-k",
      price: 2100000,
      socket: "AM4",
      chipset: "B550",
    },
    {
      name: "MSI MPG B850E EDGE WIFI",
      slug: "msi-mpg-b850e-edge-wifi",
      price: 7800000,
      socket: "AM5",
      chipset: "B850E",
    },
    {
      name: "Gigabyte X870E AORUS MASTER",
      slug: "gigabyte-x870e-aorus-master",
      price: 9200000,
      socket: "AM5",
      chipset: "X870E",
    },
    {
      name: "ASUS ROG MAXIMUS Z890-E",
      slug: "asus-rog-maximus-z890-e",
      price: 11500000,
      socket: "LGA1851",
      chipset: "Z890",
    },
    {
      name: "ASRock B550 Phantom Gaming-ITX/TB3",
      slug: "asrock-b550-pg-itx",
      price: 4100000,
      socket: "AM4",
      chipset: "B550",
    },
    {
      name: "Gigabyte Z690 GAMING X DDR4",
      slug: "gigabyte-z690-gaming-x-ddr4",
      price: 4800000,
      socket: "LGA1700",
      chipset: "Z690",
    },
    {
      name: "MSI MEG Z690 GODLIKE",
      slug: "msi-meg-z690-godlike",
      price: 15500000,
      socket: "LGA1700",
      chipset: "Z690",
    },
    {
      name: "ASUS ProArt Z790-CREATOR WIFI",
      slug: "asus-proart-z790-creator",
      price: 8500000,
      socket: "LGA1700",
      chipset: "Z790",
    },
    {
      name: "ASRock Z870-E NOVA",
      slug: "asrock-z870-e-nova",
      price: 6200000,
      socket: "LGA1851",
      chipset: "Z870E",
    },
    {
      name: "Gigabyte B550M DS3H",
      slug: "gigabyte-b550m-ds3h",
      price: 1700000,
      socket: "AM4",
      chipset: "B550",
    },
    {
      name: "ASUS M5E-RS WIFI",
      slug: "asus-m5e-rs-wifi",
      price: 5900000,
      socket: "AM5",
      chipset: "B850",
    },
  ];

  const ramProducts = [
    {
      name: "Corsair Vengeance DDR5 32GB 6000",
      slug: "corsair-vengeance-ddr5-32gb-6000",
      price: 3400000,
      type: "DDR5",
      speed: "6000MHz",
    },
    {
      name: "Kingston Fury Beast DDR5 32GB 5600",
      slug: "kingston-fury-beast-ddr5-32gb-5600",
      price: 2950000,
      type: "DDR5",
      speed: "5600MHz",
    },
    {
      name: "G.Skill Ripjaws DDR4 16GB 3200",
      slug: "gskill-ripjaws-ddr4-16gb-3200",
      price: 950000,
      type: "DDR4",
      speed: "3200MHz",
    },
    {
      name: "TeamGroup T-Force Delta RGB DDR5 32GB 6400",
      slug: "teamgroup-tforce-delta-rgb",
      price: 3650000,
      type: "DDR5",
      speed: "6400MHz",
    },
    {
      name: "Crucial P5 Plus DDR4 16GB 3600",
      slug: "crucial-p5-plus-ddr4",
      price: 1100000,
      type: "DDR4",
      speed: "3600MHz",
    },
    {
      name: "Patriot Viper Steel DDR4 16GB 4400",
      slug: "patriot-viper-steel-ddr4",
      price: 1850000,
      type: "DDR4",
      speed: "4400MHz",
    },
    {
      name: "ADATA XPG SPECTRIX D60G DDR4 16GB 3000",
      slug: "adata-xpg-d60g-ddr4",
      price: 750000,
      type: "DDR4",
      speed: "3000MHz",
    },
    {
      name: "Corsair Vengeance RGB PRO DDR5 32GB 5600",
      slug: "corsair-rgb-pro-ddr5",
      price: 3200000,
      type: "DDR5",
      speed: "5600MHz",
    },
    {
      name: "Kingston HyperX Fury DDR4 16GB 3733",
      slug: "kingston-hyperx-fury-ddr4",
      price: 1200000,
      type: "DDR4",
      speed: "3733MHz",
    },
    {
      name: "Crucial Ballistix RGB DDR4 16GB 3000",
      slug: "crucial-ballistix-rgb-ddr4",
      price: 850000,
      type: "DDR4",
      speed: "3000MHz",
    },
    {
      name: "G.Skill Flare X DDR5 32GB 6000",
      slug: "gskill-flare-x-ddr5",
      price: 3100000,
      type: "DDR5",
      speed: "6000MHz",
    },
    {
      name: "Corsair Dominator Platinum RGB DDR5 32GB 6400",
      slug: "corsair-dominator-platinum-ddr5",
      price: 4200000,
      type: "DDR5",
      speed: "6400MHz",
    },
    {
      name: "Kingston Fury Renegade DDR5 48GB 7200",
      slug: "kingston-fury-renegade-ddr5",
      price: 5800000,
      type: "DDR5",
      speed: "7200MHz",
    },
    {
      name: "ADATA XPG LIAN DuoPro RGB DDR5 32GB 6400",
      slug: "adata-xpg-lian-duo",
      price: 3800000,
      type: "DDR5",
      speed: "6400MHz",
    },
    {
      name: "Mushkin Blackline DDR4 16GB 3200",
      slug: "mushkin-blackline-ddr4",
      price: 750000,
      type: "DDR4",
      speed: "3200MHz",
    },
    {
      name: "Team Vulcan Alpha DDR4 8GB 3000",
      slug: "team-vulcan-alpha-ddr4",
      price: 420000,
      type: "DDR4",
      speed: "3000MHz",
    },
    {
      name: "G.Skill Trident Z Neo DDR4 16GB 3600",
      slug: "gskill-trident-z-neo-ddr4",
      price: 1350000,
      type: "DDR4",
      speed: "3600MHz",
    },
    {
      name: "Corsair Vengeance LPX DDR5 64GB 6000",
      slug: "corsair-vengeance-lpx-ddr5",
      price: 6200000,
      type: "DDR5",
      speed: "6000MHz",
    },
    {
      name: "Kingston Fury Impact DDR4 16GB 2933",
      slug: "kingston-fury-impact-ddr4",
      price: 980000,
      type: "DDR4",
      speed: "2933MHz",
    },
    {
      name: "ADATA Spectrix D50 RGB DDR4 16GB 4133",
      slug: "adata-spectrix-d50-ddr4",
      price: 1650000,
      type: "DDR4",
      speed: "4133MHz",
    },
  ];

  const vgaProducts = [
    {
      name: "NVIDIA GeForce RTX 4060 8GB",
      slug: "nvidia-geforce-rtx-4060-8gb",
      price: 8400000,
      chipset: "RTX 4060",
      memory: "8GB",
    },
    {
      name: "NVIDIA GeForce RTX 4070 SUPER 12GB",
      slug: "nvidia-geforce-rtx-4070-super-12gb",
      price: 16500000,
      chipset: "RTX 4070 SUPER",
      memory: "12GB",
    },
    {
      name: "AMD Radeon RX 7600 8GB",
      slug: "amd-radeon-rx-7600-8gb",
      price: 7600000,
      chipset: "RX 7600",
      memory: "8GB",
    },
    {
      name: "AMD Radeon RX 7800 XT 16GB",
      slug: "amd-radeon-rx-7800-xt-16gb",
      price: 15100000,
      chipset: "RX 7800 XT",
      memory: "16GB",
    },
    {
      name: "NVIDIA GeForce RTX 4090 24GB",
      slug: "nvidia-geforce-rtx-4090-24gb",
      price: 29500000,
      chipset: "RTX 4090",
      memory: "24GB",
    },
    {
      name: "AMD Radeon RX 6700 XT 12GB",
      slug: "amd-radeon-rx-6700-xt",
      price: 9800000,
      chipset: "RX 6700 XT",
      memory: "12GB",
    },
    {
      name: "NVIDIA GeForce RTX 4080 SUPER 16GB",
      slug: "nvidia-rtx-4080-super-16gb",
      price: 22200000,
      chipset: "RTX 4080 SUPER",
      memory: "16GB",
    },
    {
      name: "Intel Arc A770 8GB",
      slug: "intel-arc-a770-8gb",
      price: 5900000,
      chipset: "Arc A770",
      memory: "8GB",
    },
    {
      name: "NVIDIA GeForce RTX 4060 Ti 8GB",
      slug: "nvidia-rtx-4060-ti-8gb",
      price: 12100000,
      chipset: "RTX 4060 Ti",
      memory: "8GB",
    },
    {
      name: "AMD Radeon RX 6800 XT 16GB",
      slug: "amd-radeon-rx-6800-xt-16gb",
      price: 13200000,
      chipset: "RX 6800 XT",
      memory: "16GB",
    },
    {
      name: "NVIDIA GeForce RTX 4070 12GB",
      slug: "nvidia-rtx-4070-12gb",
      price: 14800000,
      chipset: "RTX 4070",
      memory: "12GB",
    },
    {
      name: "AMD Radeon RX 7900 XTX 24GB",
      slug: "amd-radeon-rx-7900-xtx",
      price: 21900000,
      chipset: "RX 7900 XTX",
      memory: "24GB",
    },
    {
      name: "NVIDIA GeForce RTX 2080 Ti 11GB",
      slug: "nvidia-rtx-2080-ti-11gb",
      price: 18500000,
      chipset: "RTX 2080 Ti",
      memory: "11GB",
    },
    {
      name: "AMD Radeon RX 5700 XT 8GB",
      slug: "amd-radeon-rx-5700-xt-8gb",
      price: 6200000,
      chipset: "RX 5700 XT",
      memory: "8GB",
    },
    {
      name: "Intel Arc A750 8GB",
      slug: "intel-arc-a750-8gb",
      price: 3800000,
      chipset: "Arc A750",
      memory: "8GB",
    },
    {
      name: "NVIDIA GeForce RTX 3060 12GB",
      slug: "nvidia-rtx-3060-12gb",
      price: 7900000,
      chipset: "RTX 3060",
      memory: "12GB",
    },
    {
      name: "AMD Radeon RX 6600 XT 16GB",
      slug: "amd-radeon-rx-6600-xt-16gb",
      price: 8900000,
      chipset: "RX 6600 XT",
      memory: "16GB",
    },
    {
      name: "NVIDIA GeForce RTX 4050 6GB",
      slug: "nvidia-rtx-4050-6gb",
      price: 4500000,
      chipset: "RTX 4050",
      memory: "6GB",
    },
    {
      name: "AMD Radeon RX 7700 XT 12GB",
      slug: "amd-radeon-rx-7700-xt-12gb",
      price: 10200000,
      chipset: "RX 7700 XT",
      memory: "12GB",
    },
    {
      name: "NVIDIA GeForce GTX 1660 SUPER 6GB",
      slug: "nvidia-gtx-1660-super-6gb",
      price: 4200000,
      chipset: "GTX 1660 SUPER",
      memory: "6GB",
    },
  ];

  const ssdProducts = [
    {
      name: "Samsung 980 PRO 1TB NVMe",
      slug: "samsung-980-pro-1tb-nvme",
      price: 2390000,
      interface: "PCIe 4.0",
      capacity: "1TB",
    },
    {
      name: "WD Black SN850X 1TB",
      slug: "wd-black-sn850x-1tb",
      price: 2490000,
      interface: "PCIe 4.0",
      capacity: "1TB",
    },
    {
      name: "Kingston NV2 1TB",
      slug: "kingston-nv2-1tb",
      price: 1590000,
      interface: "PCIe 4.0",
      capacity: "1TB",
    },
    {
      name: "Crucial P3 Plus 2TB",
      slug: "crucial-p3-plus-2tb",
      price: 3290000,
      interface: "PCIe 4.0",
      capacity: "2TB",
    },
    {
      name: "Samsung 870 QVO 1TB SATA",
      slug: "samsung-870-qvo-1tb",
      price: 850000,
      interface: "SATA",
      capacity: "1TB",
    },
    {
      name: "Seagate Barracuda SSD 1TB",
      slug: "seagate-barracuda-ssd-1tb",
      price: 1200000,
      interface: "SATA",
      capacity: "1TB",
    },
    {
      name: "SK Hynix Platinum P41 1TB",
      slug: "sk-hynix-platinum-p41-1tb",
      price: 1850000,
      interface: "PCIe 4.0",
      capacity: "1TB",
    },
    {
      name: "Corsair MP600 CORE 1TB",
      slug: "corsair-mp600-core-1tb",
      price: 1450000,
      interface: "PCIe 4.0",
      capacity: "1TB",
    },
    {
      name: "G.Skill Falcon Pro 1TB",
      slug: "gskill-falcon-pro-1tb",
      price: 2150000,
      interface: "PCIe 4.0",
      capacity: "1TB",
    },
    {
      name: "ADATA XPG GAMMIX S70 1TB",
      slug: "adata-xpg-gammix-s70-1tb",
      price: 1750000,
      interface: "PCIe 4.0",
      capacity: "1TB",
    },
    {
      name: "Samsung 990 PRO 2TB NVMe",
      slug: "samsung-990-pro-2tb",
      price: 4500000,
      interface: "PCIe 4.0",
      capacity: "2TB",
    },
    {
      name: "WD Blue SN580 1TB",
      slug: "wd-blue-sn580-1tb",
      price: 1350000,
      interface: "PCIe 4.0",
      capacity: "1TB",
    },
    {
      name: "Kingston KC3000 1TB",
      slug: "kingston-kc3000-1tb",
      price: 2000000,
      interface: "PCIe 4.0",
      capacity: "1TB",
    },
    {
      name: "Patriot Viper VPN100 1TB",
      slug: "patriot-viper-vpn100-1tb",
      price: 1600000,
      interface: "PCIe 3.0",
      capacity: "1TB",
    },
    {
      name: "Crucial BX500 480GB SATA",
      slug: "crucial-bx500-480gb",
      price: 420000,
      interface: "SATA",
      capacity: "480GB",
    },
    {
      name: "Samsung 990 EVO 1TB",
      slug: "samsung-990-evo-1tb",
      price: 2200000,
      interface: "PCIe 4.0",
      capacity: "1TB",
    },
    {
      name: "Gigabyte AORUS Gen4 SSD 1TB",
      slug: "gigabyte-aorus-gen4-1tb",
      price: 1900000,
      interface: "PCIe 4.0",
      capacity: "1TB",
    },
    {
      name: "Corsair MP600 ELITE 1TB",
      slug: "corsair-mp600-elite-1tb",
      price: 1100000,
      interface: "PCIe 4.0",
      capacity: "1TB",
    },
    {
      name: "PNY CS3040 1TB",
      slug: "pny-cs3040-1tb",
      price: 1300000,
      interface: "PCIe 4.0",
      capacity: "1TB",
    },
    {
      name: "ADATA Ultimate SU650 480GB SATA",
      slug: "adata-ultimate-su650-480gb",
      price: 380000,
      interface: "SATA",
      capacity: "480GB",
    },
  ];

  function slugifyText(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  function buildImageUrls(product, category) {
    const categorySlug = String(product.categorySlug ?? category?.slug ?? "").toLowerCase();
    const tagMap = {
      cpu: "computer,cpu,processor",
      ram: "computer,ram,memory",
      mainboard: "computer,motherboard,pc",
      ssd: "computer,ssd,storage",
      vga: "computer,gpu,graphics-card",
      mouse: "computer,mouse,gaming",
      keyboard: "computer,keyboard,mechanical",
      headset: "computer,headset,gaming",
      hub: "usb,hub,adapter",
      microphone: "microphone,studio,recording",
      webcam: "webcam,camera,streaming",
      monitor: "monitor,display,computer",
      speaker: "speaker,audio,desktop",
      cable: "cable,connector,usb",
      stand: "monitor,stand,desk",
      pad: "mousepad,desk,gaming",
    };

    const tags = tagMap[categorySlug] ?? "computer,hardware,desktop";
    const baseLock = hashString(product.slug || product.name || `${categorySlug}-product`);

    return [1, 2, 3, 4].map((index) => {
      const lock = baseLock + index;
      return `https://loremflickr.com/1200/900/${tags}?lock=${lock}`;
    });
  }

  function hashString(value) {
    const text = String(value ?? "");
    let hash = 0;
    for (let i = 0; i < text.length; i += 1) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash) + 1000;
  }

  function buildLongDescription(product, category, supplier) {
    const specs = Object.entries(product.specifications ?? {})
      .slice(0, 8)
      .map(([key, value]) => `<li><strong>${key}</strong>: ${String(value)}</li>`)
      .join("");

    return `
      <p><strong>${product.name}</strong> là sản phẩm thuộc nhóm <strong>${category?.name ?? "linh kiện"}</strong>, được thiết kế cho nhu cầu sử dụng thực tế như làm việc văn phòng, học tập, giải trí đa phương tiện và chơi game. Mẫu này tập trung vào sự cân bằng giữa hiệu năng, độ ổn định và giá trị sử dụng lâu dài, phù hợp cho cả người dùng mới lẫn người dùng đã có kinh nghiệm build máy.</p>
      <p>Trong quá trình xây dựng cấu hình, sản phẩm cho thấy tính linh hoạt cao vì có thể phối hợp với nhiều linh kiện phổ biến mà vẫn giữ mức nhiệt và điện năng hợp lý. Ở điều kiện vận hành thông thường, sản phẩm phản hồi tốt, hạn chế nghẽn cổ chai trong các tác vụ thường gặp và duy trì trải nghiệm mượt trong thời gian sử dụng dài.</p>
      <p>Xét theo hướng nâng cấp, đây là lựa chọn phù hợp cho cả hệ thống mới và kịch bản nâng cấp từng giai đoạn. Bạn có thể tối ưu theo ngân sách, xử lý đúng điểm nghẽn hiệu năng trước và mở rộng dần khi cần. Khả năng tương thích tốt với các chuẩn thông dụng cũng giúp việc lắp đặt, bảo trì và nâng cấp sau này thuận tiện hơn.</p>
      <p>Thông số nổi bật:</p>
      <ul>${specs}</ul>
      <p>Sản phẩm hiện được phân phối bởi <strong>${supplier?.name ?? "PC Perfect"}</strong> cùng chính sách bảo hành rõ ràng và hỗ trợ kỹ thuật đầy đủ, giúp người dùng yên tâm trong toàn bộ vòng đời sử dụng.</p>
    `.trim();
  }

  const showcaseCategoryConfigs = [
    {
      categorySlug: "monitor",
      imageQuery: "computer monitor",
      stockBase: 24,
      warrantyMonths: 36,
      priceStep: 180000,
      brands: ["Dell", "LG", "ASUS", "AOC", "BenQ"],
      variants: [
        { slug: "24-fhd-144hz", title: '24\" IPS FHD 144Hz', price: 3290000, specs: { size: '24\"', resolution: "1920x1080", panelType: "IPS", refreshRate: "144Hz" } },
        { slug: "27-qhd-165hz", title: '27\" IPS QHD 165Hz', price: 4990000, specs: { size: '27\"', resolution: "2560x1440", panelType: "IPS", refreshRate: "165Hz" } },
        { slug: "32-qhd-75hz", title: '32\" VA QHD 75Hz', price: 4490000, specs: { size: '32\"', resolution: "2560x1440", panelType: "VA", refreshRate: "75Hz" } },
        { slug: "34-ultrawide-100hz", title: '34\" Ultrawide 100Hz', price: 8990000, specs: { size: '34\"', resolution: "3440x1440", panelType: "IPS", refreshRate: "100Hz" } },
      ],
    },
    {
      categorySlug: "mouse",
      imageQuery: "gaming mouse",
      stockBase: 32,
      warrantyMonths: 24,
      priceStep: 90000,
      brands: ["Logitech", "Razer", "SteelSeries", "Corsair", "HyperX"],
      variants: [
        { slug: "wireless-office", title: "Wireless Office Mouse", price: 1290000, specs: { dpi: "4000", buttons: "6", wireless: "Yes", weight: "95g" } },
        { slug: "ambidextrous-gaming", title: "Ambidextrous Gaming Mouse", price: 1690000, specs: { dpi: "12000", buttons: "8", wireless: "No", weight: "85g" } },
        { slug: "ultralight-pro", title: "Ultra-Light Mouse", price: 2890000, specs: { dpi: "26000", buttons: "8", wireless: "Yes", weight: "60g" } },
        { slug: "trackball-ergonomic", title: "Ergonomic Trackball Mouse", price: 2190000, specs: { dpi: "3200", buttons: "7", wireless: "Yes", weight: "110g" } },
      ],
    },
    {
      categorySlug: "keyboard",
      imageQuery: "mechanical keyboard",
      stockBase: 18,
      warrantyMonths: 24,
      priceStep: 120000,
      brands: ["Corsair", "Keychron", "Razer", "SteelSeries", "Akko"],
      variants: [
        { slug: "full-size-mechanical", title: "Mechanical Full-Size Keyboard", price: 2490000, specs: { switchType: "Mechanical", switches: "Cherry MX", rgb: "Yes", layout: "Full-size" } },
        { slug: "tkl-hot-swap", title: "Hot-Swap TKL Keyboard", price: 2190000, specs: { switchType: "Mechanical", switches: "Hot-swap", rgb: "Yes", layout: "TKL" } },
        { slug: "compact-65", title: "Compact 65% Keyboard", price: 1690000, specs: { switchType: "Mechanical", switches: "Gateron", rgb: "Yes", layout: "65%" } },
        { slug: "wireless-low-profile", title: "Low-Profile Wireless Keyboard", price: 2990000, specs: { switchType: "Low-profile", switches: "Scissor", rgb: "No", layout: "75%" } },
      ],
    },
    {
      categorySlug: "headset",
      imageQuery: "gaming headset",
      stockBase: 22,
      warrantyMonths: 24,
      priceStep: 140000,
      brands: ["SteelSeries", "HyperX", "Corsair", "Logitech", "Razer"],
      variants: [
        { slug: "over-ear-gaming", title: "Over-Ear Gaming Headset", price: 1590000, specs: { driverSize: "50mm", impedance: "32 Ohms", frequency: "20Hz - 20kHz", microphone: "Boom" } },
        { slug: "studio-monitor", title: "Studio Monitor Headset", price: 2890000, specs: { driverSize: "40mm", impedance: "64 Ohms", frequency: "15Hz - 28kHz", microphone: "Detachable" } },
        { slug: "wireless-anc", title: "Wireless ANC Headset", price: 3990000, specs: { driverSize: "40mm", impedance: "32 Ohms", frequency: "20Hz - 20kHz", microphone: "Yes" } },
        { slug: "usb-streaming", title: "USB Streaming Headset", price: 2190000, specs: { driverSize: "50mm", impedance: "32 Ohms", frequency: "20Hz - 20kHz", microphone: "Retractable" } },
      ],
    },
    {
      categorySlug: "speaker",
      imageQuery: "desktop speaker",
      stockBase: 20,
      warrantyMonths: 12,
      priceStep: 80000,
      brands: ["Edifier", "JBL", "Bose", "Logitech", "Creative"],
      variants: [
        { slug: "2-0-desktop", title: "2.0 Desktop Speaker", price: 1290000, specs: { power: "10W", frequency: "80Hz - 20kHz", connectivity: "3.5mm", wireless: "No" } },
        { slug: "bluetooth-portable", title: "Bluetooth Portable Speaker", price: 1890000, specs: { power: "20W", frequency: "60Hz - 20kHz", connectivity: "Bluetooth, AUX", wireless: "Yes" } },
        { slug: "bookshelf-pair", title: "Bookshelf Speaker Pair", price: 3290000, specs: { power: "42W", frequency: "50Hz - 20kHz", connectivity: "Bluetooth, AUX, USB", wireless: "Yes" } },
        { slug: "rgb-gaming", title: "RGB Gaming Speaker", price: 990000, specs: { power: "12W", frequency: "70Hz - 20kHz", connectivity: "USB, 3.5mm", wireless: "No" } },
      ],
    },
    {
      categorySlug: "webcam",
      imageQuery: "webcam camera",
      stockBase: 16,
      warrantyMonths: 12,
      priceStep: 70000,
      brands: ["Logitech", "Razer", "ASUS", "AverMedia", "Dell"],
      variants: [
        { slug: "1080p-autofocus", title: "1080p Autofocus Webcam", price: 1290000, specs: { resolution: "1080p Full HD", fps: "30fps", fieldOfView: "78°", autofocus: "Yes" } },
        { slug: "2k-streaming", title: "2K Streaming Webcam", price: 1990000, specs: { resolution: "2K", fps: "60fps", fieldOfView: "82°", autofocus: "Yes" } },
        { slug: "4k-creator", title: "4K Creator Webcam", price: 3490000, specs: { resolution: "4K", fps: "30fps", fieldOfView: "90°", autofocus: "Yes" } },
        { slug: "ring-light", title: "Ring Light Webcam", price: 890000, specs: { resolution: "1080p Full HD", fps: "30fps", fieldOfView: "90°", autofocus: "No" } },
      ],
    },
    {
      categorySlug: "microphone",
      imageQuery: "studio microphone",
      stockBase: 14,
      warrantyMonths: 12,
      priceStep: 90000,
      brands: ["Audio-Technica", "Shure", "Rode", "Elgato", "Blue"],
      variants: [
        { slug: "usb-condenser", title: "USB Condenser Microphone", price: 1390000, specs: { type: "Condenser", pattern: "Cardioid", frequency: "20Hz - 20kHz", connection: "USB" } },
        { slug: "xlr-dynamic", title: "XLR Dynamic Microphone", price: 2890000, specs: { type: "Dynamic", pattern: "Cardioid", frequency: "50Hz - 15kHz", connection: "XLR" } },
        { slug: "podcast-condenser", title: "Podcast Condenser Microphone", price: 2490000, specs: { type: "Condenser", pattern: "Cardioid", frequency: "20Hz - 20kHz", connection: "XLR" } },
        { slug: "usb-c-streaming", title: "Streaming USB-C Microphone", price: 1790000, specs: { type: "Condenser", pattern: "Cardioid", frequency: "20Hz - 20kHz", connection: "USB-C" } },
      ],
    },
    {
      categorySlug: "cable",
      imageQuery: "hdmi cable",
      stockBase: 60,
      warrantyMonths: 12,
      priceStep: 30000,
      brands: ["ASUS", "Anker", "UGREEN", "Baseus", "Belkin"],
      variants: [
        { slug: "hdmi-2-1", title: "HDMI 2.1 Cable", price: 190000, specs: { type: "HDMI 2.1", length: "2m", bandwidth: "48Gbps", color: "Black" } },
        { slug: "displayport-1-4", title: "DisplayPort 1.4 Cable", price: 210000, specs: { type: "DisplayPort 1.4", length: "2m", bandwidth: "32.4Gbps", color: "Black" } },
        { slug: "usb-c-100w", title: "USB-C 100W Cable", price: 160000, specs: { type: "USB-C", length: "1.5m", bandwidth: "10Gbps", color: "Gray" } },
        { slug: "ethernet-cat6", title: "Ethernet Cat 6 Cable", price: 120000, specs: { type: "Cat 6", length: "3m", bandwidth: "1Gbps", color: "Blue" } },
      ],
    },
    {
      categorySlug: "hub",
      imageQuery: "usb c hub",
      stockBase: 42,
      warrantyMonths: 12,
      priceStep: 50000,
      brands: ["Anker", "UGREEN", "Baseus", "Satechi", "Belkin"],
      variants: [
        { slug: "4-in-1", title: "4-in-1 USB-C Hub", price: 390000, specs: { ports: "4", usbC: "Yes", hdmi: "No", powerDelivery: "65W" } },
        { slug: "7-in-1", title: "7-in-1 USB-C Hub", price: 790000, specs: { ports: "7", usbC: "Yes", hdmi: "Yes", powerDelivery: "100W" } },
        { slug: "9-in-1-dock", title: "9-in-1 Docking Hub", price: 1290000, specs: { ports: "9", usbC: "Yes", hdmi: "Yes", powerDelivery: "100W" } },
        { slug: "compact-usb3", title: "Compact USB 3.0 Hub", price: 290000, specs: { ports: "4", usbC: "No", hdmi: "No", powerDelivery: "No" } },
      ],
    },
    {
      categorySlug: "stand",
      imageQuery: "monitor stand",
      stockBase: 28,
      warrantyMonths: 12,
      priceStep: 40000,
      brands: ["Elgato", "Lention", "Ugreen", "Baseus", "Generic"],
      variants: [
        { slug: "adjustable-monitor", title: "Adjustable Monitor Stand", price: 490000, specs: { maxWeight: "5kg", armLength: "30cm", rotation: "0°", material: "Steel" } },
        { slug: "laptop-elevated", title: "Laptop Stand", price: 390000, specs: { maxWeight: "4kg", armLength: "26cm", rotation: "0°", material: "Aluminum" } },
        { slug: "dual-monitor-arm", title: "Dual Monitor Arm", price: 1890000, specs: { maxWeight: "8kg", armLength: "79cm", rotation: "360°", material: "Aluminum" } },
        { slug: "streaming-desk", title: "Streaming Desk Stand", price: 690000, specs: { maxWeight: "3kg", armLength: "55cm", rotation: "270°", material: "Steel" } },
      ],
    },
    {
      categorySlug: "pad",
      imageQuery: "mouse pad",
      stockBase: 50,
      warrantyMonths: 12,
      priceStep: 20000,
      brands: ["SteelSeries", "Razer", "Corsair", "Logitech", "Generic"],
      variants: [
        { slug: "control-pad", title: "Control Mouse Pad", price: 190000, specs: { size: "Large", material: "Cloth", thickness: "2mm", rgb: "No" } },
        { slug: "speed-pad", title: "Speed Mouse Pad", price: 240000, specs: { size: "Large", material: "Micro-weave", thickness: "3mm", rgb: "No" } },
        { slug: "extended-pad", title: "Extended Mouse Pad", price: 390000, specs: { size: "Extended", material: "Cloth", thickness: "4mm", rgb: "No" } },
        { slug: "rgb-pad", title: "RGB Mouse Pad", price: 1290000, specs: { size: "Large", material: "Cloth", thickness: "3.5mm", rgb: "Yes" } },
      ],
    },
  ];

  function buildShowcaseProducts(config) {
    return config.brands.flatMap((brand, brandIndex) =>
      config.variants.map((variant, variantIndex) => ({
        name: `${brand} ${variant.title}`,
        slug: `${config.categorySlug}-${slugifyText(brand)}-${variant.slug}`,
        price: variant.price + brandIndex * config.priceStep,
        categorySlug: config.categorySlug,
        stockQuantity: config.stockBase + brandIndex * 3 + variantIndex * 2,
        warrantyMonths: config.warrantyMonths,
        specifications: {
          brand,
          ...variant.specs,
        },
        imageQuery: config.imageQuery,
      })),
    );
  }

  const peripheralProducts = showcaseCategoryConfigs.flatMap((config) => buildShowcaseProducts(config));

  const productSeeds = [
    ...cpuProducts.map((p) => ({
      ...p,
      categorySlug: "cpu",
      stockQuantity: 60,
      warrantyMonths: 36,
      specifications: {
        brand: p.brand || getRandomBrand(),
        cores: p.cores,
        threads: p.threads,
        baseClock: p.baseClock,
      },
    })),
    ...mainboardProducts.map((p) => ({
      ...p,
      categorySlug: "mainboard",
      stockQuantity: 45,
      warrantyMonths: 36,
      specifications: {
        socket: p.socket,
        chipset: p.chipset,
        ramSlots: 4,
        wifi: true,
      },
    })),
    ...ramProducts.map((p) => ({
      ...p,
      categorySlug: "ram",
      stockQuantity: 70,
      warrantyMonths: 60,
      specifications: {
        type: p.type,
        capacity: "32GB",
        speed: p.speed,
        kit: "2x16GB",
      },
    })),
    ...vgaProducts.map((p) => ({
      ...p,
      categorySlug: "vga",
      stockQuantity: 35,
      warrantyMonths: 36,
      specifications: {
        chipset: p.chipset,
        memory: p.memory,
        bus: "256-bit",
        tdp: "300W",
      },
    })),
    ...ssdProducts.map((p) => ({
      ...p,
      categorySlug: "ssd",
      stockQuantity: 85,
      warrantyMonths: 60,
      specifications: {
        interface: p.interface,
        capacity: p.capacity,
        readSpeed: "7000MB/s",
        writeSpeed: "5000MB/s",
      },
    })),
    ...peripheralProducts,
  ];

  function getRandomBrand() {
    const brands = ["Intel", "AMD"];
    return brands[Math.floor(Math.random() * brands.length)];
  }

  let detailUpsertCount = 0;
  let imageUpsertCount = 0;

  for (let index = 0; index < productSeeds.length; index += 1) {
    const product = productSeeds[index];
    const category = categories.find(
      (item) => item.slug === product.categorySlug,
    );

    if (!category) {
      throw new Error(`Category not found for product ${product.slug}`);
    }

    const supplier = suppliers[index % suppliers.length];

    const seededProduct = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {
        name: product.name,
        categoryId: category.id,
        supplierId: supplier.id,
        price: product.price,
        stockQuantity: product.stockQuantity,
        warrantyMonths: product.warrantyMonths,
        specifications: product.specifications,
      },
      create: {
        name: product.name,
        slug: product.slug,
        categoryId: category.id,
        supplierId: supplier.id,
        price: product.price,
        stockQuantity: product.stockQuantity,
        warrantyMonths: product.warrantyMonths,
        specifications: product.specifications,
      },
    });

    const longDescription = buildLongDescription(product, category, supplier);

    await prisma.productDetail.upsert({
      where: { productId: seededProduct.id },
      update: {
        fullDescription: longDescription,
        inTheBox: `1 x ${product.name}; 1 x phụ kiện đi kèm; 1 x tài liệu hướng dẫn; 1 x phiếu bảo hành`,
        manualUrl: null,
        warrantyPolicy: `Bảo hành chính hãng ${product.warrantyMonths} tháng theo chính sách của nhà cung cấp và trung tâm hỗ trợ kỹ thuật.`,
      },
      create: {
        productId: seededProduct.id,
        fullDescription: longDescription,
        inTheBox: `1 x ${product.name}; 1 x phụ kiện đi kèm; 1 x tài liệu hướng dẫn; 1 x phiếu bảo hành`,
        manualUrl: null,
        warrantyPolicy: `Bảo hành chính hãng ${product.warrantyMonths} tháng theo chính sách của nhà cung cấp và trung tâm hỗ trợ kỹ thuật.`,
      },
    });

    const imageUrls = buildImageUrls(product, category);

    await prisma.productImage.deleteMany({
      where: { productId: seededProduct.id },
    });

    await prisma.productImage.createMany({
      data: imageUrls.map((imageUrl, imageIndex) => ({
        productId: seededProduct.id,
        imageUrl,
        isPrimary: imageIndex === 0,
        sortOrder: imageIndex + 1,
        altText: product.name,
      })),
    });

    detailUpsertCount += 1;
    imageUpsertCount += imageUrls.length;
  }

  console.log("Seeded admin account and sample catalog successfully.");
  console.log("Admin login: admin@gmail.com / 123456");
  console.log(`Total seeded products: ${productSeeds.length}`);
  console.log(`Total upserted product details: ${detailUpsertCount}`);
  console.log(`Total upserted product images: ${imageUpsertCount}`);
  console.log(`User role id: ${userRole.id}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
