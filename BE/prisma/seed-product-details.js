import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Template mô tả dựa trên category
const descriptionTemplates = {
  cpu: (product) => `
<h2>${product.name}</h2>
<p>Bộ xử lý ${product.name} được thiết kế để cung cấp hiệu suất cao cho các ứng dụng yêu cầu khắt khe.</p>
<h3>Đặc điểm chính:</h3>
<ul>
<li>Hỗ trợ các công nghệ tối tân</li>
<li>Tiêu thụ điện năng tối ưu</li>
<li>Tương thích với các mainboard hỗ trợ</li>
</ul>
  `,
  gpu: (product) => `
<h2>${product.name}</h2>
<p>Card đồ họa ${product.name} cung cấp hiệu suất render đỉnh cao cho gaming, streaming và content creation.</p>
<h3>Thông số nổi bật:</h3>
<ul>
<li>Ray tracing và DLSS support</li>
<li>Nhiều núi CUDA/Stream Processors</li>
<li>Hỗ trợ 4K gaming</li>
</ul>
  `,
  ram: (product) => `
<h2>${product.name}</h2>
<p>Bộ nhớ RAM ${product.name} mang lại tốc độ truy cập nhanh và ổn định cho hệ thống.</p>
<h3>Tính năng:</h3>
<ul>
<li>Tốc độ cao (DDR5/DDR4)</li>
<li>Độ trễ thấp</li>
<li>RGB lighting tùy chỉnh (nếu có)</li>
</ul>
  `,
  ssd: (product) => `
<h2>${product.name}</h2>
<p>Ổ SSD ${product.name} mang lại tốc độ đọc ghi vượt trội so với HDD truyền thống.</p>
<h3>Ưu điểm:</h3>
<ul>
<li>Tốc độ khởi động nhanh</li>
<li>Load game/ứng dụng tức thì</li>
<li>Độ bền cao</li>
</ul>
  `,
  motherboard: (product) => `
<h2>${product.name}</h2>
<p>Mainboard ${product.name} là nền tảng đáng tin cậy cho hệ thống máy tính của bạn.</p>
<h3>Đặc điểm:</h3>
<ul>
<li>Hỗ trợ CPU mới nhất</li>
<li>Nhiều cổng kết nối</li>
<li>Tính năng OC nâng cao (nếu có)</li>
</ul>
  `,
  cooler: (product) => `
<h2>${product.name}</h2>
<p>Tản nhiệt ${product.name} giữ nhiệt độ CPU ở mức tối ưu cho hiệu suất ổn định.</p>
<h3>Các tính năng:</h3>
<ul>
<li>Quạt hiệu suất cao</li>
<li>Lắp đặt dễ dàng</li>
<li>Hoàn toàn im lặng</li>
</ul>
  `,
  case: (product) => `
<h2>${product.name}</h2>
<p>Vỏ máy ${product.name} cung cấp không gian tốt cho hệ thống nước/không khí tuần hoàn.</p>
<h3>Tính năng:</h3>
<ul>
<li>Thiết kế hiện đại</li>
<li>Nhiều cổng kết nối</li>
<li>Luồng khí tối ưu</li>
</ul>
  `,
  power: (product) => `
<h2>${product.name}</h2>
<p>Nguồn điện ${product.name} cung cấp năng lượng ổn định cho toàn bộ hệ thống.</p>
<h3>Đặc điểm:</h3>
<ul>
<li>Công suất đủ lớn</li>
<li>Hiệu suất cao (80+ Bronze/Gold)</li>
<li>An toàn và bảo vệ circuit</li>
</ul>
  `,
  monitor: (product) => `
<h2>${product.name}</h2>
<p>Màn hình ${product.name} mang lại trải nghiệm hình ảnh sắc nét và màu sắc chính xác.</p>
<h3>Thông số:</h3>
<ul>
<li>Độ phân giải cao</li>
<li>Tần số quét 60Hz trở lên</li>
<li>Góc nhìn rộng</li>
</ul>
  `,
  default: (product) => `
<h2>${product.name}</h2>
<p>Sản phẩm ${product.name} được chọn lọc kỹ lưỡng để mang lại giá trị tối đa cho khách hàng.</p>
<h3>Ưu điểm chính:</h3>
<ul>
<li>Chất lượng cao</li>
<li>Giá cạnh tranh</li>
<li>Bảo hành chính hãng</li>
</ul>
  `,
};

async function seedProductDetails() {
  try {
    console.log("🔄 Đang đọc tất cả sản phẩm từ database...");
    
    // Đọc tất cả sản phẩm cùng category
    const products = await prisma.product.findMany({
      include: { category: true, detail: true },
    });

    console.log(`✓ Tìm thấy ${products.length} sản phẩm`);

    let createdCount = 0;
    let skippedCount = 0;

    for (const product of products) {
      // Kiểm tra ProductDetail đã tồn tại chưa
      if (product.detail) {
        console.log(`⏭️  ${product.name} - đã có chi tiết, bỏ qua`);
        skippedCount++;
        continue;
      }

      // Chọn template dựa trên category slug
      const categorySlug = product.category?.slug?.toLowerCase() || "default";
      const templateKey = categorySlug.replace("-", "").replace(" ", "");
      const template = descriptionTemplates[templateKey] || descriptionTemplates.default;
      
      const fullDescription = template(product);
      
      // Tạo ProductDetail
      const detail = await prisma.productDetail.create({
        data: {
          productId: product.id,
          fullDescription,
          inTheBox: `${product.name}, hộp bao bì, sách hướng dẫn (nếu có), cáp/phụ kiện (tùy theo sản phẩm)`,
          manualUrl: null,
          warrantyPolicy: `Bảo hành ${product.warrantyMonths} tháng từ ngày mua. Liên hệ với cửa hàng để được hỗ trợ.`,
        },
      });

      console.log(`✅ Tạo chi tiết cho: ${product.name} (ID: ${product.id})`);
      createdCount++;
    }

    console.log(`\n📊 Kết quả:`);
    console.log(`   ✅ Tạo mới: ${createdCount}`);
    console.log(`   ⏭️  Bỏ qua: ${skippedCount}`);
    console.log(`   📦 Tổng cộng: ${products.length}`);

  } catch (error) {
    console.error("❌ Lỗi:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seedProductDetails();
