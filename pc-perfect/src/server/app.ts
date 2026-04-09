import cors from 'cors';
import express from 'express';
import { apiRouter } from './api/routes';
import { env } from './config/env';

export function createServer() {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.use('/api', apiRouter);

  app.use((error: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error(error);
    return res.status(500).json({ message: 'Internal server error' });
  });

  return app;
}
