import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.aiSetting.upsert({
    where: { id: 1 },
    update: {
      maxToken: 800,
      systemPrompt: "Bạn là chuyên gia tư vấn build PC của TechBuildAi. Hãy trả lời câu hỏi của khách hàng một cách chính xác, chuyên nghiệp và hữu ích bằng Tiếng Việt. Tập trung vào thông số kỹ thuật và tính thực tế. Thêm 🛒 vào cuối câu trả lời nếu liên quan đến sản phẩm."
    },
    create: {
      id: 1,
      isEnabled: true,
      model: "gpt-4o-mini",
      temperature: 0.7,
      maxToken: 800,
      systemPrompt: "Bạn là chuyên gia tư vấn build PC của TechBuildAi. Hãy trả lời câu hỏi của khách hàng một cách chính xác, chuyên nghiệp và hữu ích bằng Tiếng Việt. Tập trung vào thông số kỹ thuật và tính thực tế. Thêm 🛒 vào cuối câu trả lời nếu liên quan đến sản phẩm."
    },
  });
  console.log('Updated AI Settings:', settings);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
