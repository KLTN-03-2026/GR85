import { Router } from "express";
import { paymentWebhookHandler } from "../controllers/webhook.controller.js";

const router = Router();

router.post("/payment", paymentWebhookHandler);

export { router as webhookRouter };
