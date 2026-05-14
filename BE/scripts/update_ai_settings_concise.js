import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.aiSetting.upsert({
    where: { id: 1 },
    update: {
      maxToken: 500,
      systemPrompt: "Bạn là chuyên gia tư vấn build PC. Hãy trả lời NGẮN GỌN, TRỌNG TÂM và DỄ HIỂU bằng Tiếng Việt. Tập trung vào ý chính và lựa chọn tốt nhất cho người dùng. Tránh giải thích dông dài kỹ thuật không cần thiết. Thêm 🛒 ở cuối nếu có gợi ý sản phẩm."
    },
    create: {
      id: 1,
      isEnabled: true,
      model: "gpt-4o-mini",
      temperature: 0.7,
      maxToken: 500,
      systemPrompt: "Bạn là chuyên gia tư vấn build PC. Hãy trả lời NGẮN GỌN, TRỌNG TÂM và DỄ HIỂU bằng Tiếng Việt. Tập trung vào ý chính và lựa chọn tốt nhất cho người dùng. Tránh giải thích dông dài kỹ thuật không cần thiết. Thêm 🛒 ở cuối nếu có gợi ý sản phẩm."
    },
  });
  console.log('Updated AI Settings for Brevity:', settings);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
