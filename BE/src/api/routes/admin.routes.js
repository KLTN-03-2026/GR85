import { Router } from "express";
import { z } from "zod";
import { getAdminDashboard, updateUserByAdmin } from "../../services/admin.service.js";
import { requireAuth } from "../../middleware/auth.js";

const router = Router();

const updateUserSchema = z.object({
  fullName: z.string().min(1).optional(),
  phone: z.string().optional(),
  roleId: z.number().int().positive().nullable().optional(),
  status: z.enum(["ACTIVE", "BANNED", "UNVERIFIED"]).optional(),
});

router.get(
  "/dashboard",
  requireAuth,
  async (req, res) => {
    try {
      // Check if user is Admin
      if (req.auth.role !== "Admin") {
        return res.status(403).json({ message: "Only admins can access this endpoint" });
      }

      const data = await getAdminDashboard();
      return res.json(data);
    } catch (error) {
      if (error instanceof Error) {
        return res.status(400).json({ message: error.message });
      }

      return res.status(500).json({ message: "Unexpected server error" });
    }
  },
);

router.patch(
  "/users/:userId",
  requireAuth,
  async (req, res) => {
    try {
      if (req.auth.role !== "Admin") {
        return res.status(403).json({ message: "Only admins can access this endpoint" });
      }

      const parsed = updateUserSchema.parse(req.body);
      const data = await updateUserByAdmin(req.params.userId, parsed);
      return res.json(data);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", issues: error.flatten() });
      }

      if (error instanceof Error) {
        const status = error.message.includes("not found") ? 404 : 400;
        return res.status(status).json({ message: error.message });
      }

      return res.status(500).json({ message: "Unexpected server error" });
    }
  },
);

export { router as adminRouter };
