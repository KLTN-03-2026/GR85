import { Router } from "express";
import {
  confirmPayosReturnSafe,
  createPaymentLink,
  getPayosStatusSafe,
  receiveWebhook,
} from "../controllers/payment.controller.js";

const router = Router();

router.post("/create-link", createPaymentLink);
router.post("/webhook", receiveWebhook);
router.get("/confirm-return", confirmPayosReturnSafe);
router.get("/status", getPayosStatusSafe);

export { router as paymentRouter };
