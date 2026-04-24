import { Notification } from '@models/Notification';
import { ApiError } from '@utils/apiError';

export async function getUserNotifications(userId: string, query: { limit?: number; category?: string; unread_only?: string }) {
  const filter: Record<string, unknown> = { recipient: userId, isDeleted: false };
  if (query.category && query.category !== 'all') filter.category = query.category;
  if (query.unread_only === 'true') filter.isRead = false;

  const notifications = await Notification.find(filter)
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(query.limit || 20), 50));
  const unread_count = await Notification.countDocuments({ recipient: userId, isDeleted: false, isRead: false });

  return { unread_count, notifications, next_cursor: null, has_more: false };
}

export async function getUnreadCount(userId: string) {
  const [social, earnings, system] = await Promise.all([
    Notification.countDocuments({ recipient: userId, category: 'social', isRead: false, isDeleted: false }),
    Notification.countDocuments({ recipient: userId, category: 'earnings', isRead: false, isDeleted: false }),
    Notification.countDocuments({ recipient: userId, category: 'system', isRead: false, isDeleted: false }),
  ]);
  return { unread_count: social + earnings + system, by_category: { social, earnings, system } };
}

export async function markAsRead(userId: string, notificationId: string) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId, isDeleted: false },
    { isRead: true },
    { new: true }
  );
  if (!notification) throw new ApiError(404, 'Notification not found');
  const counts = await getUnreadCount(userId);
  return { notification_id: notification._id, is_read: notification.isRead, unread_count: counts.unread_count };
}

export async function markAllAsRead(userId: string, category?: string) {
  const filter: Record<string, unknown> = { recipient: userId, isDeleted: false, isRead: false };
  if (category) filter.category = category;
  const result = await Notification.updateMany(filter, { isRead: true });
  return { marked_count: result.modifiedCount, unread_count: 0 };
}

export async function deleteNotification(userId: string, notificationId: string) {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, recipient: userId },
    { isDeleted: true },
    { new: true }
  );
  if (!notification) throw new ApiError(404, 'Notification not found');
  return getUnreadCount(userId);
}
