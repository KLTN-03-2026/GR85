import crypto from "node:crypto";
import { z } from "zod";
import { env } from "../../config/env.js";
import {
  handlePaymentWebhook,
  mapServiceErrorToHttp,
} from "../../services/order-status-sync.service.js";

const paymentWebhookSchema = z.object({
  orderId: z.number().int().positive(),
  success: z.boolean(),
  transactionId: z.string().max(200).optional(),
  timestamp: z.string().optional(),
});

export async function paymentWebhookHandler(req, res) {
  try {
    verifyWebhookSignature(req);

    const parsed = paymentWebhookSchema.parse(req.body ?? {});

    console.info(
      `[WebhookPayment] order=${parsed.orderId} success=${String(parsed.success)} tx=${String(parsed.transactionId ?? "")}`,
    );

    const result = await handlePaymentWebhook({
      orderId: parsed.orderId,
      paymentSuccess: parsed.success,
      source: "PAYMENT",
    });

    return res.status(200).json({
      ok: true,
      updated: result.updated,
      order: result.order.order,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        message: "Invalid webhook payload",
        issues: error.flatten(),
      });
    }

    if (error instanceof Error && error.message === "Invalid webhook signature") {
      return res.status(401).json({ message: "Invalid webhook signature" });
    }

    const mapped = mapServiceErrorToHttp(error);
    if (mapped.statusCode >= 500) {
      console.error("[WebhookPayment]", error);
    }

    return res.status(mapped.statusCode).json({ message: mapped.message });
  }
}

function verifyWebhookSignature(req) {
  const secret = String(env.WEBHOOK_SECRET ?? "").trim();
  if (!secret) {
    console.info("[WebhookPayment] WEBHOOK_SECRET is empty, skip signature verification (mock mode)");
    return;
  }

  const rawBody = JSON.stringify(req.body ?? {});
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");

  const received = String(req.headers["x-webhook-signature"] ?? "").trim();
  if (!received) {
    throw new Error("Invalid webhook signature");
  }

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);

  if (
    expectedBuffer.length !== receivedBuffer.length ||
    !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)
  ) {
    throw new Error("Invalid webhook signature");
  }
}
