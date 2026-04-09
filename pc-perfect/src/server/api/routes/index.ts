import { Router } from 'express';
import { authRouter } from './auth.routes';
import { adminRouter } from './admin.routes';

const router = Router();

router.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'pc-perfect-api',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', authRouter);
router.use('/admin', adminRouter);

export { router as apiRouter };
