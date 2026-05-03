import { Router } from "express";
import {
  confirmPayosReturn,
  createPaymentLink,
  getPayosStatus,
  receiveWebhook,
  receiveSepayWebhook,
} from "../controllers/payment.controller.js";

const router = Router();

router.post("/create-link", createPaymentLink);
router.post("/webhook", receiveWebhook);
router.post("/sepay/webhook", receiveSepayWebhook);
router.get("/confirm-return", confirmPayosReturn);
router.get("/status", getPayosStatus);

export { router as paymentRouter };
