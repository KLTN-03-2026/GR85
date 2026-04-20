import { createServer } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";

async function bootstrap() {
  const app = createServer();

  try {
    await prisma.$connect();
    app.listen(env.PORT, () => {
      console.log(`Máy chủ API đang chạy tại http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("Không thể khởi động máy chủ API", error);
    process.exit(1);
  }
}

bootstrap();
