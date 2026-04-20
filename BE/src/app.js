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
  app.use("/uploads", express.static(path.resolve(process.cwd(), "uploads")));

  app.use("/api", apiRouter);

  app.use((error, _req, res, _next) => {
    console.error(error);
    return res.status(500).json({ message: "Lỗi máy chủ nội bộ" });
  });

  return app;
}
