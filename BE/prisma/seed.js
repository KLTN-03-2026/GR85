import "dotenv/config";
import { PrismaClient, UserStatus } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await hash("123456", 10);

  const [adminRole, userRole, employeeRole] = await Promise.all([
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
    prisma.role.upsert({
      where: { name: "Employee" },
      update: { description: "Store employee role" },
      create: { name: "Employee", description: "Store employee role" },
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

  const employeeUser = await prisma.user.upsert({
    where: { email: "employee@gmail.com" },
    update: {
      fullName: "System Employee",
      passwordHash: hashedPassword,
      status: UserStatus.ACTIVE,
      roleId: employeeRole.id,
      phone: "0900000001",
      address: "TP.HCM",
    },
    create: {
      email: "employee@gmail.com",
      fullName: "System Employee",
      passwordHash: hashedPassword,
      status: UserStatus.ACTIVE,
      roleId: employeeRole.id,
      phone: "0900000001",
      address: "TP.HCM",
    },
  });

  await prisma.cart.upsert({
    where: { userId: employeeUser.id },
    update: {},
    create: { userId: employeeUser.id },
  });

  const categoriesInput = [
    // Core PC Components
    { name: "Monitor", slug: "monitor", description: "Màn hình" },
    { name: "Mouse", slug: "mouse", description: "Chuột" },
    { name: "Keyboard", slug: "keyboard", description: "Bàn phím" },
    { name: "Headset", slug: "headset", description: "Tai nghe" },
    { name: "Speaker", slug: "speaker", description: "Loa" },
    { name: "Webcam", slug: "webcam", description: "Camera web" },
    { name: "Microphone", slug: "microphone", description: "Microphone" },
    // Accessories & Cables
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

    const tags = query || tagMap[categorySlug] || "computer,hardware,desktop";
    const baseLock = hashString(
      product.slug || product.name || `${categorySlug}-product`,
    );

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
      .map(
        ([key, value]) => `<li><strong>${key}</strong>: ${String(value)}</li>`,
      )
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
        {
          slug: "24-fhd-144hz",
          title: '24\" IPS FHD 144Hz',
          price: 3290000,
          specs: {
            size: '24\"',
            resolution: "1920x1080",
            panelType: "IPS",
            refreshRate: "144Hz",
          },
        },
        {
          slug: "27-qhd-165hz",
          title: '27\" IPS QHD 165Hz',
          price: 4990000,
          specs: {
            size: '27\"',
            resolution: "2560x1440",
            panelType: "IPS",
            refreshRate: "165Hz",
          },
        },
        {
          slug: "32-qhd-75hz",
          title: '32\" VA QHD 75Hz',
          price: 4490000,
          specs: {
            size: '32\"',
            resolution: "2560x1440",
            panelType: "VA",
            refreshRate: "75Hz",
          },
        },
        {
          slug: "34-ultrawide-100hz",
          title: '34\" Ultrawide 100Hz',
          price: 8990000,
          specs: {
            size: '34\"',
            resolution: "3440x1440",
            panelType: "IPS",
            refreshRate: "100Hz",
          },
        },
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
        {
          slug: "wireless-office",
          title: "Wireless Office Mouse",
          price: 1290000,
          specs: { dpi: "4000", buttons: "6", wireless: "Yes", weight: "95g" },
        },
        {
          slug: "ambidextrous-gaming",
          title: "Ambidextrous Gaming Mouse",
          price: 1690000,
          specs: { dpi: "12000", buttons: "8", wireless: "No", weight: "85g" },
        },
        {
          slug: "ultralight-pro",
          title: "Ultra-Light Mouse",
          price: 2890000,
          specs: { dpi: "26000", buttons: "8", wireless: "Yes", weight: "60g" },
        },
        {
          slug: "trackball-ergonomic",
          title: "Ergonomic Trackball Mouse",
          price: 2190000,
          specs: { dpi: "3200", buttons: "7", wireless: "Yes", weight: "110g" },
        },
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
        {
          slug: "full-size-mechanical",
          title: "Mechanical Full-Size Keyboard",
          price: 2490000,
          specs: {
            switchType: "Mechanical",
            switches: "Cherry MX",
            rgb: "Yes",
            layout: "Full-size",
          },
        },
        {
          slug: "tkl-hot-swap",
          title: "Hot-Swap TKL Keyboard",
          price: 2190000,
          specs: {
            switchType: "Mechanical",
            switches: "Hot-swap",
            rgb: "Yes",
            layout: "TKL",
          },
        },
        {
          slug: "compact-65",
          title: "Compact 65% Keyboard",
          price: 1690000,
          specs: {
            switchType: "Mechanical",
            switches: "Gateron",
            rgb: "Yes",
            layout: "65%",
          },
        },
        {
          slug: "wireless-low-profile",
          title: "Low-Profile Wireless Keyboard",
          price: 2990000,
          specs: {
            switchType: "Low-profile",
            switches: "Scissor",
            rgb: "No",
            layout: "75%",
          },
        },
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
        {
          slug: "over-ear-gaming",
          title: "Over-Ear Gaming Headset",
          price: 1590000,
          specs: {
            driverSize: "50mm",
            impedance: "32 Ohms",
            frequency: "20Hz - 20kHz",
            microphone: "Boom",
          },
        },
        {
          slug: "studio-monitor",
          title: "Studio Monitor Headset",
          price: 2890000,
          specs: {
            driverSize: "40mm",
            impedance: "64 Ohms",
            frequency: "15Hz - 28kHz",
            microphone: "Detachable",
          },
        },
        {
          slug: "wireless-anc",
          title: "Wireless ANC Headset",
          price: 3990000,
          specs: {
            driverSize: "40mm",
            impedance: "32 Ohms",
            frequency: "20Hz - 20kHz",
            microphone: "Yes",
          },
        },
        {
          slug: "usb-streaming",
          title: "USB Streaming Headset",
          price: 2190000,
          specs: {
            driverSize: "50mm",
            impedance: "32 Ohms",
            frequency: "20Hz - 20kHz",
            microphone: "Retractable",
          },
        },
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
        {
          slug: "2-0-desktop",
          title: "2.0 Desktop Speaker",
          price: 1290000,
          specs: {
            power: "10W",
            frequency: "80Hz - 20kHz",
            connectivity: "3.5mm",
            wireless: "No",
          },
        },
        {
          slug: "bluetooth-portable",
          title: "Bluetooth Portable Speaker",
          price: 1890000,
          specs: {
            power: "20W",
            frequency: "60Hz - 20kHz",
            connectivity: "Bluetooth, AUX",
            wireless: "Yes",
          },
        },
        {
          slug: "bookshelf-pair",
          title: "Bookshelf Speaker Pair",
          price: 3290000,
          specs: {
            power: "42W",
            frequency: "50Hz - 20kHz",
            connectivity: "Bluetooth, AUX, USB",
            wireless: "Yes",
          },
        },
        {
          slug: "rgb-gaming",
          title: "RGB Gaming Speaker",
          price: 990000,
          specs: {
            power: "12W",
            frequency: "70Hz - 20kHz",
            connectivity: "USB, 3.5mm",
            wireless: "No",
          },
        },
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
        {
          slug: "1080p-autofocus",
          title: "1080p Autofocus Webcam",
          price: 1290000,
          specs: {
            resolution: "1080p Full HD",
            fps: "30fps",
            fieldOfView: "78°",
            autofocus: "Yes",
          },
        },
        {
          slug: "2k-streaming",
          title: "2K Streaming Webcam",
          price: 1990000,
          specs: {
            resolution: "2K",
            fps: "60fps",
            fieldOfView: "82°",
            autofocus: "Yes",
          },
        },
        {
          slug: "4k-creator",
          title: "4K Creator Webcam",
          price: 3490000,
          specs: {
            resolution: "4K",
            fps: "30fps",
            fieldOfView: "90°",
            autofocus: "Yes",
          },
        },
        {
          slug: "ring-light",
          title: "Ring Light Webcam",
          price: 890000,
          specs: {
            resolution: "1080p Full HD",
            fps: "30fps",
            fieldOfView: "90°",
            autofocus: "No",
          },
        },
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
        {
          slug: "usb-condenser",
          title: "USB Condenser Microphone",
          price: 1390000,
          specs: {
            type: "Condenser",
            pattern: "Cardioid",
            frequency: "20Hz - 20kHz",
            connection: "USB",
          },
        },
        {
          slug: "xlr-dynamic",
          title: "XLR Dynamic Microphone",
          price: 2890000,
          specs: {
            type: "Dynamic",
            pattern: "Cardioid",
            frequency: "50Hz - 15kHz",
            connection: "XLR",
          },
        },
        {
          slug: "podcast-condenser",
          title: "Podcast Condenser Microphone",
          price: 2490000,
          specs: {
            type: "Condenser",
            pattern: "Cardioid",
            frequency: "20Hz - 20kHz",
            connection: "XLR",
          },
        },
        {
          slug: "usb-c-streaming",
          title: "Streaming USB-C Microphone",
          price: 1790000,
          specs: {
            type: "Condenser",
            pattern: "Cardioid",
            frequency: "20Hz - 20kHz",
            connection: "USB-C",
          },
        },
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
        {
          slug: "hdmi-2-1",
          title: "HDMI 2.1 Cable",
          price: 190000,
          specs: {
            type: "HDMI 2.1",
            length: "2m",
            bandwidth: "48Gbps",
            color: "Black",
          },
        },
        {
          slug: "displayport-1-4",
          title: "DisplayPort 1.4 Cable",
          price: 210000,
          specs: {
            type: "DisplayPort 1.4",
            length: "2m",
            bandwidth: "32.4Gbps",
            color: "Black",
          },
        },
        {
          slug: "usb-c-100w",
          title: "USB-C 100W Cable",
          price: 160000,
          specs: {
            type: "USB-C",
            length: "1.5m",
            bandwidth: "10Gbps",
            color: "Gray",
          },
        },
        {
          slug: "ethernet-cat6",
          title: "Ethernet Cat 6 Cable",
          price: 120000,
          specs: {
            type: "Cat 6",
            length: "3m",
            bandwidth: "1Gbps",
            color: "Blue",
          },
        },
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
        {
          slug: "4-in-1",
          title: "4-in-1 USB-C Hub",
          price: 390000,
          specs: { ports: "4", usbC: "Yes", hdmi: "No", powerDelivery: "65W" },
        },
        {
          slug: "7-in-1",
          title: "7-in-1 USB-C Hub",
          price: 790000,
          specs: {
            ports: "7",
            usbC: "Yes",
            hdmi: "Yes",
            powerDelivery: "100W",
          },
        },
        {
          slug: "9-in-1-dock",
          title: "9-in-1 Docking Hub",
          price: 1290000,
          specs: {
            ports: "9",
            usbC: "Yes",
            hdmi: "Yes",
            powerDelivery: "100W",
          },
        },
        {
          slug: "compact-usb3",
          title: "Compact USB 3.0 Hub",
          price: 290000,
          specs: { ports: "4", usbC: "No", hdmi: "No", powerDelivery: "No" },
        },
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
        {
          slug: "adjustable-monitor",
          title: "Adjustable Monitor Stand",
          price: 490000,
          specs: {
            maxWeight: "5kg",
            armLength: "30cm",
            rotation: "0°",
            material: "Steel",
          },
        },
        {
          slug: "laptop-elevated",
          title: "Laptop Stand",
          price: 390000,
          specs: {
            maxWeight: "4kg",
            armLength: "26cm",
            rotation: "0°",
            material: "Aluminum",
          },
        },
        {
          slug: "dual-monitor-arm",
          title: "Dual Monitor Arm",
          price: 1890000,
          specs: {
            maxWeight: "8kg",
            armLength: "79cm",
            rotation: "360°",
            material: "Aluminum",
          },
        },
        {
          slug: "streaming-desk",
          title: "Streaming Desk Stand",
          price: 690000,
          specs: {
            maxWeight: "3kg",
            armLength: "55cm",
            rotation: "270°",
            material: "Steel",
          },
        },
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
        {
          slug: "control-pad",
          title: "Control Mouse Pad",
          price: 190000,
          specs: {
            size: "Large",
            material: "Cloth",
            thickness: "2mm",
            rgb: "No",
          },
        },
        {
          slug: "speed-pad",
          title: "Speed Mouse Pad",
          price: 240000,
          specs: {
            size: "Large",
            material: "Micro-weave",
            thickness: "3mm",
            rgb: "No",
          },
        },
        {
          slug: "extended-pad",
          title: "Extended Mouse Pad",
          price: 390000,
          specs: {
            size: "Extended",
            material: "Cloth",
            thickness: "4mm",
            rgb: "No",
          },
        },
        {
          slug: "rgb-pad",
          title: "RGB Mouse Pad",
          price: 1290000,
          specs: {
            size: "Large",
            material: "Cloth",
            thickness: "3.5mm",
            rgb: "Yes",
          },
        },
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

  const peripheralProducts = showcaseCategoryConfigs.flatMap((config) =>
    buildShowcaseProducts(config),
  );

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

  // Seed Banks and BankAccounts for account verification demo
  const banks = [
    { code: "VCB", name: "Ngân hàng Vietcombank" },
    { code: "BIDV", name: "Ngân hàng BIDV" },
    { code: "TCB", name: "Ngân hàng Techcombank" },
    { code: "MBB", name: "Ngân hàng MB" },
    { code: "ACB", name: "Ngân hàng ACB" },
    { code: "VPB", name: "Ngân hàng VP Bank" },
    { code: "STB", name: "Ngân hàng Sacombank" },
  ];

  for (const b of banks) {
    await prisma.bank.upsert({
      where: { code: b.code },
      update: { name: b.name, isActive: true },
      create: { code: b.code, name: b.name, isActive: true },
    });
  }

  // Create demo bank accounts (realistic test data)
  const bankMap = await prisma.bank.findMany();
  const bankByCode = bankMap.reduce(
    (acc, cur) => ({ ...acc, [cur.code]: cur }),
    {},
  );

  const demoAccounts = [
    {
      bankCode: "MBB",
      accountNumber: "0397199215",
      accountName: "Trần Minh Huy",
      isVerified: true,
    },
    {
      bankCode: "VCB",
      accountNumber: "1234567890",
      accountName: "Nguyễn Văn A",
      isVerified: true,
    },
    {
      bankCode: "VCB",
      accountNumber: "9876543210",
      accountName: "Trần Thị B",
      isVerified: true,
    },
    {
      bankCode: "BIDV",
      accountNumber: "1111222233",
      accountName: "Lê Văn D",
      isVerified: true,
    },
    {
      bankCode: "TCB",
      accountNumber: "7777888899",
      accountName: "Võ Văn F",
      isVerified: true,
    },
  ];

  for (const acc of demoAccounts) {
    const bank = bankByCode[acc.bankCode];
    if (!bank) continue;
    await prisma.bankAccount.upsert({
      where: { accountNumber: acc.accountNumber },
      update: {
        accountName: acc.accountName,
        accountHolder: acc.accountName,
        isVerified: acc.isVerified,
        bankId: bank.id,
      },
      create: {
        bankId: bank.id,
        accountNumber: acc.accountNumber,
        accountName: acc.accountName,
        accountHolder: acc.accountName,
        isVerified: acc.isVerified,
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
