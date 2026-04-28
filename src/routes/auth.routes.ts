import { Router } from 'express';
import { register, login, refreshToken, getMe } from '@controllers/auth.controller';
import { validate } from '@middleware/validate';
import { registerSchema, loginSchema, refreshSchema } from '@validators/auth.validator';
import { auth } from '@middleware/auth';

const router = Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/login/email', validate(loginSchema), login);
router.post('/login/phone', validate(loginSchema), login);
router.post('/jwt/create', validate(loginSchema), login);
router.post('/refresh', validate(refreshSchema), refreshToken);
router.post('/token/refresh', validate(refreshSchema), refreshToken);
router.post('/jwt/refresh', validate(refreshSchema), refreshToken);
router.get('/me', auth(), getMe);

export { router as authRoutes };
