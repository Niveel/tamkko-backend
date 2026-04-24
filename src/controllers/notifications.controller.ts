import { Response } from 'express';
import { AuthRequest } from '@middleware/auth';
import { catchAsync } from '@utils/catchAsync';
import * as notificationService from '@services/notifications.service';

export const getUserNotifications = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await notificationService.getUserNotifications(req.user!.id, req.query);
  res.json({ status: 'success', data: result });
});

export const getUnreadCount = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await notificationService.getUnreadCount(req.user!.id);
  res.json({ status: 'success', data: result });
});

export const markAsRead = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await notificationService.markAsRead(req.user!.id, req.params.id);
  res.json({ status: 'success', data: result });
});

export const markAllAsRead = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await notificationService.markAllAsRead(req.user!.id, req.query.category as string | undefined);
  res.json({ status: 'success', message: 'All notifications marked as read.', data: result });
});

export const deleteNotification = catchAsync(async (req: AuthRequest, res: Response) => {
  const result = await notificationService.deleteNotification(req.user!.id, req.params.id);
  res.json({ status: 'success', message: 'Notification deleted.', data: result });
});
