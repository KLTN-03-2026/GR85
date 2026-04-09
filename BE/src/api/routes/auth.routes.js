import { Router } from "express";
import { z } from "zod";
import {
  changePassword,
  createUserAddress,
  deleteUserAddress,
  getMyOrderDetail,
  getCurrentUser,
  loginUser,
  listUserAddresses,
  listMyOrders,
  resendVerificationCode,
  requestPasswordReset,
  registerUser,
  resetPassword,
  updateUserAddress,
  updateUserProfile,
  verifyEmail,
} from "../../services/auth.service.js";
import {
  getMyWallet,
  listMyReturnRequests,
  requestOrderReturn,
  topUpWallet,
} from "../../services/wallet.service.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2).max(100).refine((value) => !/\d/.test(value), {
    message: "Full name cannot contain numbers",
  }),
  phone: z.string().regex(/^\d{10}$/).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const emailSchema = z.object({
  email: z.string().email(),
});

const verifySchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/),
});

const resetPasswordSchema = z.object({
  email: z.string().email(),
  otp: z.string().regex(/^\d{6}$/),
  password: z.string().min(6),
});

const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2)
    .max(100)
    .refine((value) => !/\d/.test(value), {
      message: "Full name cannot contain numbers",
    })
    .optional(),
  phone: z.string().regex(/^\d{10}$/).optional(),
  address: z.string().max(500).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

const addressSchema = z.object({
  label: z.string().max(100).optional(),
  receiverName: z.string().min(2).max(100).refine((value) => !/\d/.test(value), {
    message: "Receiver name cannot contain numbers",
  }),
  phoneNumber: z.string().regex(/^\d{10}$/),
  addressLine: z.string().min(5).max(500),
  isDefault: z.boolean().optional(),
});

const topUpWalletSchema = z.object({
  amount: z.number().positive(),
  note: z.string().max(500).optional(),
});

const returnRequestSchema = z.object({
  orderId: z.number().int().positive(),
  reason: z.string().min(10).max(2000),
});

router.post("/register", async (req, res) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const payload = {
      email: parsed.email,
      password: parsed.password,
      fullName: parsed.fullName,
      phone: parsed.phone,
    };
    const result = await registerUser(payload);
    return res.status(201).json(result);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post("/login", async (req, res) => {
  try {
    const parsed = loginSchema.parse(req.body);
    const payload = {
      email: parsed.email,
      password: parsed.password,
    };
    const result = await loginUser(payload);
    return res.json(result);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post("/verify-email", async (req, res) => {
  try {
    const parsed = verifySchema.parse(req.body);
    const result = await verifyEmail(parsed);
    return res.json(result);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post("/resend-verification", async (req, res) => {
  try {
    const parsed = emailSchema.parse(req.body);
    const result = await resendVerificationCode(parsed);
    return res.json(result);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const parsed = emailSchema.parse(req.body);
    const result = await requestPasswordReset(parsed);
    return res.json(result);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post("/reset-password", async (req, res) => {
  try {
    const parsed = resetPasswordSchema.parse(req.body);
    const result = await resetPassword(parsed);
    return res.json(result);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.get("/me", requireAuth, async (req, res) => {
  try {
    const user = await getCurrentUser(Number(req.auth?.sub));
    return res.json(user);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.put("/profile", requireAuth, async (req, res) => {
  try {
    const parsed = updateProfileSchema.parse(req.body);
    const result = await updateUserProfile(Number(req.auth?.sub), parsed);
    return res.json(result);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.get("/my-orders", requireAuth, async (req, res) => {
  try {
    const result = await listMyOrders(Number(req.auth?.sub));
    return res.json(result);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.get("/my-orders/:orderId", requireAuth, async (req, res) => {
  try {
    const result = await getMyOrderDetail(
      Number(req.auth?.sub),
      Number(req.params.orderId),
    );
    return res.json(result);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.get("/addresses", requireAuth, async (req, res) => {
  try {
    const result = await listUserAddresses(Number(req.auth?.sub));
    return res.json(result);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post("/addresses", requireAuth, async (req, res) => {
  try {
    const parsed = addressSchema.parse(req.body);
    const result = await createUserAddress(Number(req.auth?.sub), parsed);
    return res.status(201).json(result);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.put("/addresses/:addressId", requireAuth, async (req, res) => {
  try {
    const parsed = addressSchema.parse(req.body);
    const result = await updateUserAddress(
      Number(req.auth?.sub),
      Number(req.params.addressId),
      parsed,
    );
    return res.json(result);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.delete("/addresses/:addressId", requireAuth, async (req, res) => {
  try {
    const result = await deleteUserAddress(
      Number(req.auth?.sub),
      Number(req.params.addressId),
    );
    return res.json(result);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.get("/wallet", requireAuth, async (req, res) => {
  try {
    const data = await getMyWallet(Number(req.auth?.sub));
    return res.json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post("/wallet/top-up", requireAuth, async (req, res) => {
  try {
    const parsed = topUpWalletSchema.parse(req.body);
    const data = await topUpWallet(Number(req.auth?.sub), parsed);
    return res.status(201).json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.get("/returns", requireAuth, async (req, res) => {
  try {
    const data = await listMyReturnRequests(Number(req.auth?.sub));
    return res.json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post("/returns", requireAuth, async (req, res) => {
  try {
    const parsed = returnRequestSchema.parse(req.body);
    const data = await requestOrderReturn(Number(req.auth?.sub), parsed);
    return res.status(201).json(data);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post("/change-password", requireAuth, async (req, res) => {
  try {
    const parsed = changePasswordSchema.parse(req.body);
    const result = await changePassword(Number(req.auth?.sub), parsed);
    return res.json(result);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

function handleRouteError(error, res) {
  if (error instanceof z.ZodError) {
    return res
      .status(400)
      .json({ message: "Invalid request data", issues: error.flatten() });
  }

  if (error instanceof Error) {
    const status =
      error.message === "Email already exists"
        ? 409
        : error.message === "Email not found"
          ? 404
          : error.message === "User not found"
            ? 404
            : error.message === "Please verify your email first"
              ? 403
              : error.message === "Unable to send verification email"
                ? 502
                : error.message === "Invalid or expired verification code"
                  ? 400
                  : error.message === "Current password is incorrect"
                    ? 401
                    : error.message.includes("Invalid")
                      ? 401
                      : 400;
    return res.status(status).json({ message: error.message });
  }

  return res.status(500).json({ message: "Unexpected server error" });
}

export { router as authRouter };
