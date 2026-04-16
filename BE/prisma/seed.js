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
    { name: "CPU", slug: "cpu", description: "Bo xu ly trung tam" },
    { name: "Mainboard", slug: "mainboard", description: "Bang mach chu" },
    { name: "RAM", slug: "ram", description: "Bo nho tam" },
    { name: "VGA", slug: "vga", description: "Card do hoa" },
    { name: "SSD", slug: "ssd", description: "Luu tru toc do cao" },
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
  ];

  function getRandomBrand() {
    const brands = ["Intel", "AMD"];
    return brands[Math.floor(Math.random() * brands.length)];
  }

  for (let index = 0; index < productSeeds.length; index += 1) {
    const product = productSeeds[index];
    const category = categories.find(
      (item) => item.slug === product.categorySlug,
    );

    if (!category) {
      throw new Error(`Category not found for product ${product.slug}`);
    }

    const supplier = suppliers[index % suppliers.length];

    await prisma.product.upsert({
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
  }

  // Remove previously seeded warehouse demo data.
  await prisma.batch.deleteMany({
    where: {
      batchCode: {
        startsWith: "SEED-WH-",
      },
    },
  });

  await prisma.warehouse.deleteMany({
    where: {
      name: {
        in: ["Kho trung tam TP.HCM", "Kho phia Bac"],
      },
    },
  });

  console.log("Seeded admin account and sample catalog successfully.");
  console.log("Admin login: admin@gmail.com / 123456");
  console.log(`Total seeded products: ${productSeeds.length}`);
  console.log("Warehouse demo data removed.");
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
