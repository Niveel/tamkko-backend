import { Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import { authService } from '@services/auth.service';
import { catchAsync } from '@utils/catchAsync';

export const register = catchAsync(async (req, res: Response) => {
  const { user, tokens } = await authService.register(req.body);
  res.status(201).json({ status: 'success', data: { user, tokens } });
});

export const login = catchAsync(async (req, res: Response) => {
  const { identifier, email, phone, password } = req.body;
  const resolvedIdentifier = identifier || email || phone;
  const { user, tokens } = await authService.login(resolvedIdentifier, password);
  res.json({ status: 'success', data: { user, tokens } });
});

export const refreshToken = catchAsync(async (req, res: Response) => {
  const tokens = await authService.refreshToken(req.body.refreshToken || req.body.refresh);
  res.json({ status: 'success', data: { tokens } });
});

export const getMe = catchAsync(async (req: AuthRequest, res: Response) => {
  res.json({ status: 'success', data: { user: req.user } });
});
