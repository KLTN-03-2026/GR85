import { Router } from 'express';
import { z } from 'zod';
import { getCurrentUser, loginUser, registerUser } from '../../services/auth.service';
import { requireAuth } from '../../middleware/auth';

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

router.post('/register', async (req, res) => {
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

router.post('/login', async (req, res) => {
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

router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await getCurrentUser(Number(req.auth?.sub));
    return res.json(user);
  } catch (error) {
    return handleRouteError(error, res);
  }
});

function handleRouteError(error: unknown, res: import('express').Response) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({ message: 'Invalid request data', issues: error.flatten() });
  }

  if (error instanceof Error) {
    const status = error.message === 'Email already exists' ? 409 : error.message.includes('Invalid') ? 401 : 400;
    return res.status(status).json({ message: error.message });
  }

  return res.status(500).json({ message: 'Unexpected server error' });
}

export { router as authRouter };
