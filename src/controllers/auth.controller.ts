import { Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import { authService } from '@services/auth.service';
import { catchAsync } from '@utils/catchAsync';
import { ApiError } from '@utils/apiError';
import { User } from '@models/User';

export const register = catchAsync(async (req, res: Response) => {
  const { user, tokens, verificationCode } = await authService.register(req.body);
  res.status(201).json({
    status: 'success',
    data: {
      user,
      tokens,
      ...(verificationCode && { verificationCode }),
    },
  });
});

export const login = catchAsync(async (req, res: Response) => {
  const { emailOrUsername, identifier, email, username, phone, password } = req.body;
  const resolvedIdentifier = emailOrUsername || identifier || email || username || phone;
  const { user, tokens } = await authService.login(resolvedIdentifier, password);
  res.json({ status: 'success', data: { user, tokens } });
});

export const refreshToken = catchAsync(async (req, res: Response) => {
  const tokens = await authService.refreshToken(req.body.refreshToken || req.body.refresh);
  res.json({ status: 'success', data: { tokens } });
});

export const getMe = catchAsync(async (req: AuthRequest, res: Response) => {
  if (!req.user?.id) throw new ApiError(401, 'Authentication required');
  const user = await User.findOne({ _id: req.user.id, isDeleted: false });
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ status: 'success', data: { user: authService.sanitizeUser(user) } });
});
