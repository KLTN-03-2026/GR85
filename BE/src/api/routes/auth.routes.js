import { Router } from "express";
import { z } from "zod";
import {
  changePassword,
  createUserAddress,
  deleteUserAddress,
  getMyOrderDetail,
  getCurrentUser,
  getMyReviewThread,
  listMyPendingReviews,
  listMyReviewHistory,
  loginUser,
  listUserAddresses,
  listMyOrders,
  replyToMyReview,
  resendVerificationCode,
  requestPasswordReset,
  registerUser,
  resetPassword,
  validatePasswordResetOtp,
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
import {
  listNotificationsForUser,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from "../../services/notification.service.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
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
  password: z.string().min(8, "Mật khẩu mới phải có ít nhất 8 ký tự"),
});

const updateProfileSchema = z.object({
  fullName: z
    .string()
    .min(2)
    .max(100)
    .refine((value) => !/\d/.test(value), {
      message: "Họ và tên không được chứa số",
    })
    .optional(),
  phone: z
    .string()
    .regex(/^\d{10}$/)
    .optional(),
  address: z.string().max(500).optional(),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Mật khẩu mới phải có ít nhất 8 ký tự"),
});

const addressSchema = z.object({
  label: z.string().max(100).optional(),
  receiverName: z
    .string()
    .min(2)
    .max(100)
    .refine((value) => !/\d/.test(value), {
      message: "Tên người nhận không được chứa số",
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
  bankName: z.string().min(2).max(100),
  bankAccountNumber: z.string().min(8).max(20),
  bankAccountName: z.string().min(3).max(200),
});

const reviewReplySchema = z.object({
  message: z.string().min(1).max(2000),
});

router.post("/register", async (req, res) => {
  try {
    const parsed = registerSchema.parse(req.body);
    const payload = {
      email: parsed.email,
      password: parsed.password,
      ip: req.ip,
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
    const result = await resendVerificationCode({
      ...parsed,
      ip: req.ip,
    });
    return res.json(result);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post("/forgot-password", async (req, res) => {
  try {
    const parsed = emailSchema.parse(req.body);
    const result = await requestPasswordReset({
      ...parsed,
      ip: req.ip,
    });
    return res.json(result);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post("/validate-reset-otp", async (req, res) => {
  try {
    const parsed = verifySchema.parse(req.body);
    const result = await validatePasswordResetOtp(parsed);
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

router.get("/my-reviews", requireAuth, async (req, res) => {
  try {
    const result = await listMyReviewHistory(Number(req.auth?.sub));
    return res.json(result);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.get("/my-reviews/pending", requireAuth, async (req, res) => {
  try {
    const result = await listMyPendingReviews(Number(req.auth?.sub));
    return res.json(result);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.get("/my-reviews/:reviewId/thread", requireAuth, async (req, res) => {
  try {
    const result = await getMyReviewThread(
      Number(req.auth?.sub),
      Number(req.params.reviewId),
    );
    return res.json(result);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.post("/my-reviews/:reviewId/reply", requireAuth, async (req, res) => {
  try {
    const parsed = reviewReplySchema.parse(req.body ?? {});
    const result = await replyToMyReview(
      Number(req.auth?.sub),
      Number(req.params.reviewId),
      parsed,
    );
    return res.status(201).json(result);
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

router.get("/notifications", requireAuth, async (req, res) => {
  try {
    const limit = req.query?.limit;
    const result = await listNotificationsForUser(Number(req.auth?.sub), {
      limit,
    });
    return res.json(result);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

router.patch(
  "/notifications/:notificationId/read",
  requireAuth,
  async (req, res) => {
    try {
      const result = await markNotificationAsRead(
        Number(req.auth?.sub),
        Number(req.params.notificationId),
      );
      return res.json(result);
    } catch (error) {
      return handleRouteError(error, res);
    }
  },
);

router.post("/notifications/mark-all-read", requireAuth, async (req, res) => {
  try {
    const result = await markAllNotificationsAsRead(Number(req.auth?.sub));
    return res.json(result);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

function handleRouteError(error, res) {
  if (error instanceof z.ZodError) {
    return res
      .status(400)
      .json({
        message: "Dữ liệu yêu cầu không hợp lệ",
        issues: error.flatten(),
      });
  }

  if (error instanceof Error) {
    const status =
      typeof error.statusCode === "number"
        ? error.statusCode
        : error.message === "Email đã tồn tại"
          ? 409
          : error.message === "Email không tồn tại"
            ? 404
            : error.message ===
                "Không thể gửi lại email xác minh. Vui lòng thử lại sau"
              ? 502
              : error.message ===
                  "Không thể gửi email đặt lại mật khẩu. Vui lòng thử lại sau"
                ? 502
                : error.message === "Người dùng không tồn tại"
                  ? 404
                  : error.message ===
                      "Vui lòng xác nhận email trước khi đăng nhập"
                    ? 403
                    : error.message === "Không thể gửi email xác nhận"
                      ? 502
                      : error.message ===
                          "Mã xác minh không hợp lệ hoặc đã hết hạn"
                        ? 400
                        : error.message === "Mật khẩu hiện tại không chính xác"
                          ? 401
                          : error.message.includes("Không hợp lệ")
                            ? 401
                            : 400;

    const payload = { message: error.message };
    if (typeof error.retryAfterSeconds === "number" && error.retryAfterSeconds > 0) {
      payload.retryAfterSeconds = error.retryAfterSeconds;
    }

    const response = res.status(status);
    if (status === 429 && typeof payload.retryAfterSeconds === "number") {
      response.set("Retry-After", String(payload.retryAfterSeconds));
    }

    return response.json(payload);
  }

  return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
}

export { router as authRouter };
