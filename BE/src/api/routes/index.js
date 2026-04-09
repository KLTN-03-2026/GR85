import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { adminRouter } from "./admin.routes.js";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "pc-perfect-api",
    timestamp: new Date().toISOString(),
  });
});

router.use("/auth", authRouter);
router.use("/admin", adminRouter);

export { router as apiRouter };
