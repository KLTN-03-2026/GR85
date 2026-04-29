import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import {
  addItemToCart,
  confirmMockVnpayPayment,
  checkoutCart,
  estimateCartShipping,
  getMyCart,
  handleVnpayIpn,
  handleVnpayReturn,
  listAvailableCoupons,
  previewCartPricing,
  removeCartItem,
  updateCartItemQuantity,
} from "../../services/cart.service.js";

const router = Router();

const addItemSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive().default(1),
});

const updateQuantitySchema = z.object({
  quantity: z.number().int(),
});

const checkoutSchema = z.object({
  shippingAddress: z.string().optional(),
  phoneNumber: z.string().optional(),
  addressId: z.number().int().positive().optional(),
  couponCode: z.string().max(50).optional(),
  productCouponCode: z.string().max(50).optional(),
  shippingCouponCode: z.string().max(50).optional(),
  selectedCartItemIds: z.array(z.number().int().positive()).optional(),
  useWalletBalance: z.boolean().optional().default(true),
  paymentMethod: z.enum(["VNPAY", "COD", "PAYOS", "SEPAY"]).default("PAYOS"),
  bankCode: z.string().optional(),
  provider: z.enum(["GHN", "VIETTEL_POST", "VIETTEL", "VIETTELPOST"]).optional(),
});

const previewPricingSchema = z.object({
  couponCode: z.string().max(50).optional(),
  productCouponCode: z.string().max(50).optional(),
  shippingCouponCode: z.string().max(50).optional(),
  addressId: z.number().int().positive().optional(),
  shippingAddress: z.string().max(500).optional(),
  provider: z.enum(["GHN", "VIETTEL_POST", "VIETTEL", "VIETTELPOST"]).optional(),
  paymentMethod: z.enum(["COD", "VNPAY", "PAYOS", "SEPAY"]).optional(),
  selectedCartItemIds: z.array(z.number().int().positive()).optional(),
});

const availableCouponsSchema = z.object({
  scope: z.enum(["PRODUCT", "SHIPPING"]),
  selectedCartItemIds: z.array(z.number().int().positive()).optional(),
  addressId: z.number().int().positive().optional(),
  shippingAddress: z.string().max(500).optional(),
  provider: z.enum(["GHN", "VIETTEL_POST", "VIETTEL", "VIETTELPOST"]).optional(),
  paymentMethod: z.enum(["COD", "VNPAY", "PAYOS", "SEPAY"]).optional(),
});

const shippingEstimateSchema = z.object({
  addressId: z.number().int().positive().optional(),
  shippingAddress: z.string().max(500).optional(),
  selectedCartItemIds: z.array(z.number().int().positive()).optional(),
  provider: z.enum(["GHN", "VIETTEL_POST", "VIETTEL", "VIETTELPOST"]).optional(),
  paymentMethod: z.enum(["COD", "VNPAY", "PAYOS", "SEPAY"]).optional(),
});

const confirmMockPaymentSchema = z.object({
  orderId: z.number().int().positive(),
  paymentCode: z.string().max(64).optional(),
});

router.get("/vnpay-ipn", async (req, res) => {
  try {
    const result = await handleVnpayIpn(req.query);
    return res.json(result);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ RspCode: "99", Message: error.message });
    }

    return res.status(500).json({ RspCode: "99", Message: "Unknown error" });
  }
});

router.get("/vnpay-return", async (req, res) => {
  try {
    const result = await handleVnpayReturn(req.query);
    return res.redirect(result.redirectUrl);
  } catch (error) {
    return res.redirect("/payment-result?status=failed&message=callback-error");
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const data = await getMyCart(Number(req.auth?.sub));
    return res.json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post("/items", requireAuth, async (req, res) => {
  try {
    const parsed = addItemSchema.parse(req.body);
    const data = await addItemToCart(Number(req.auth?.sub), parsed);
    return res.json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.patch("/items/:itemId", requireAuth, async (req, res) => {
  try {
    const parsed = updateQuantitySchema.parse(req.body);
    const data = await updateCartItemQuantity(
      Number(req.auth?.sub),
      Number(req.params.itemId),
      parsed.quantity,
    );
    return res.json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.delete("/items/:itemId", requireAuth, async (req, res) => {
  try {
    const data = await removeCartItem(Number(req.auth?.sub), Number(req.params.itemId));
    return res.json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post("/checkout", requireAuth, async (req, res) => {
  try {
    const parsed = checkoutSchema.parse(req.body);
    const forwarded = req.headers["x-forwarded-for"];
    const clientIp = Array.isArray(forwarded)
      ? forwarded[0]
      : String(forwarded ?? req.socket.remoteAddress ?? "").split(",")[0].trim();

    const data = await checkoutCart(Number(req.auth?.sub), {
      ...parsed,
      clientIp,
    });
    return res.status(201).json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post("/preview-pricing", requireAuth, async (req, res) => {
  try {
    const parsed = previewPricingSchema.parse(req.body ?? {});
    const data = await previewCartPricing(Number(req.auth?.sub), parsed);
    return res.json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post("/available-coupons", requireAuth, async (req, res) => {
  try {
    const parsed = availableCouponsSchema.parse(req.body ?? {});
    const data = await listAvailableCoupons(Number(req.auth?.sub), parsed);
    return res.json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post("/shipping-estimate", requireAuth, async (req, res) => {
  try {
    const parsed = shippingEstimateSchema.parse(req.body ?? {});
    const data = await estimateCartShipping(Number(req.auth?.sub), parsed);
    return res.json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post("/mock-vnpay/confirm", requireAuth, async (req, res) => {
  try {
    const parsed = confirmMockPaymentSchema.parse(req.body ?? {});
    const data = await confirmMockVnpayPayment(Number(req.auth?.sub), parsed);
    return res.json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

function handleRouteError(error, res) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: "Invalid request data", issues: error.flatten() });
  }

  if (error instanceof Error) {
    const status =
      error.message.includes("not found")
        ? 404
        : error.message.includes("exceeds") || error.message.includes("empty cart")
          ? 400
          : 400;
    return res.status(status).json({ message: error.message });
  }

  return res.status(500).json({ message: "Unexpected server error" });
}

export { router as cartRouter };
