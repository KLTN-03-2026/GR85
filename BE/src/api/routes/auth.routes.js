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
  }

  return res.status(500).json({ message: "Lỗi máy chủ không xác định" });
}

export { router as authRouter };
