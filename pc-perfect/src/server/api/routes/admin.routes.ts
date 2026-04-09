import { Router } from 'express';
import { getAdminDashboard } from '../../services/admin.service';
import { requireAuth, requirePermission } from '../../middleware/auth';

const router = Router();

router.get('/dashboard', requireAuth, requirePermission('manage_user'), async (_req, res) => {
  try {
    const data = await getAdminDashboard();
    return res.json(data);
  } catch (error) {
    if (error instanceof Error) {
      return res.status(400).json({ message: error.message });
    }

    return res.status(500).json({ message: 'Unexpected server error' });
  }
});

export { router as adminRouter };
