import { Router } from "express";
import { authRouter } from "./auth.routes.js";
import { adminRouter } from "./admin.routes.js";
import { cartRouter } from "./cart.routes.js";
import { orderRouter } from "./order.routes.js";
import { productRouter } from "./product.routes.js";
import { aiRouter } from "./ai.routes.js";
import { paymentRouter } from "./payment.route.js";

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
router.use("/cart", cartRouter);
router.use("/orders", orderRouter);
router.use("/products", productRouter);
router.use("/ai", aiRouter);
router.use("/payments", paymentRouter);

export { router as apiRouter };
