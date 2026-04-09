import { createServer } from './app';
import { env } from './config/env';
import { prisma } from './db/prisma';

async function bootstrap() {
  const app = createServer();

  try {
    await prisma.$connect();
    app.listen(env.PORT, () => {
      console.log(`API server is running on http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error('Failed to start API server', error);
    process.exit(1);
  }
}

bootstrap();
