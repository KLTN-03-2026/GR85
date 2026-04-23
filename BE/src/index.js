import { createServer } from "./app.js";
import { createServer as createHttpServer } from "node:http";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";
import { initializeChatSocket } from "./realtime/chat.socket.js";

async function bootstrap() {
  const app = createServer();
  const httpServer = createHttpServer(app);

  try {
    await prisma.$connect();
    initializeChatSocket(httpServer);

    httpServer.listen(env.PORT, () => {
      console.log(`Máy chủ API đang chạy tại http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("Không thể khởi động máy chủ API", error);
    process.exit(1);
  }
}

bootstrap();
