import { createServer } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./db/prisma.js";

async function bootstrap() {
  const app = createServer();

  try {
    await prisma.$connect();
    app.listen(env.PORT, () => {
      console.log(`API server is running on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("Failed to start API server", error);
    process.exit(1);
  }
}

bootstrap();
