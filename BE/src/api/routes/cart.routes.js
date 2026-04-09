import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import {
  addItemToCart,
  checkoutCart,
  getMyCart,
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
  shippingAddress: z.string().min(1),
  phoneNumber: z.string().min(1),
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
    const data = await checkoutCart(Number(req.auth?.sub), parsed);
    return res.status(201).json(data);
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
