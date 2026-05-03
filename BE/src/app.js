import cors from "cors";
import express from "express";
import path from "node:path";
import { apiRouter } from "./api/routes/index.js";
import { env } from "./config/env.js";

export function createServer() {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use((req, _res, next) => {
    console.info(`[API] ${req.method} ${req.originalUrl}`);
    return next();
  });
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  app.use("/api", apiRouter);

  app.use((error, _req, res, _next) => {
    console.error(error);

    const status = error?.status || error?.statusCode || (error?.expose ? 400 : 500);
    const message = error?.expose && error?.message ? error.message : (status === 500 ? "Lỗi máy chủ nội bộ" : error?.message ?? "Lỗi yêu cầu");

    return res.status(status).json({ message });
  });

  return app;
}
