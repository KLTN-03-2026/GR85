import { Router } from "express";
import {
  confirmPayosReturn,
  createPaymentLink,
  getPayosStatus,
  receiveWebhook,
} from "../controllers/payment.controller.js";

const router = Router();

router.post("/create-link", createPaymentLink);
router.post("/webhook", receiveWebhook);
router.get("/confirm-return", confirmPayosReturn);
router.get("/status", getPayosStatus);

export { router as paymentRouter };
