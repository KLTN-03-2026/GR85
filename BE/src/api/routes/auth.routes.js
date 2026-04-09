import { Router } from "express";
import { z } from "zod";
import {
  changePassword,
  getMyOrderDetail,
  getCurrentUser,
  loginUser,
  listMyOrders,
  resendVerificationCode,
  requestPasswordReset,
  registerUser,
  resetPassword,
  updateUserProfile,
  verifyEmail,
} from "../../services/auth.service.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  fullName: z.string().min(2),
  phone: z.string().optional(),
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
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  address: z.string().max(500).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
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
