import mongoose, { Types } from 'mongoose';
import Notification, {
  INotification,
  NotificationType,
} from '../models/Notification';
import AppError from '../utils/AppError';
const MAX_LIST = 50;
export const formatNaira = (kobo: number) =>
  'N' +
  (Math.abs(kobo) / 100).toLocaleString('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export const toNotificationDTO = (n: INotification) => ({
  id: n._id,
  title: n.title,
  message: n.message,
  type: n.type,
  read: n.read,
  createdAt: n.createdAt,
});
export const createNotification = async (
  userId: string,
  input: {
    title: string;
    message: string;
    type?: NotificationType;
  },
) => {
  await Notification.create({
    user: new Types.ObjectId(userId),
    title: input.title,
    message: input.message,
    type: input.type ?? 'info',
  });
};
export const listNotifications = async (userId: string) => {
  const filter = { user: new Types.ObjectId(userId) };
  const [items, unread] = await Promise.all([
    Notification.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .limit(MAX_LIST),
    Notification.countDocuments({ ...filter, read: false }),
  ]);
  return {
    items: items.map(toNotificationDTO),
    meta: { unread },
  };
};
const findOwned = async (userId: string, notificationId: string) => {
  if (!mongoose.Types.ObjectId.isValid(notificationId)) {
    throw new AppError('Notification not found', 404);
  }
  const notification = await Notification.findOne({
    _id: notificationId,
    user: userId,
  });
  if (!notification) throw new AppError('Notification not found', 404);
  return notification;
};
export const markRead = async (userId: string, notificationId: string) => {
  const notification = await findOwned(userId, notificationId);
  if (notification.read) {
    return toNotificationDTO(notification);
  }
  notification.read = true;
  await notification.save();
  return toNotificationDTO(notification);
};
export const markAllRead = async (userId: string) => {
  await Notification.updateMany(
    { user: userId, read: false },
    { $set: { read: true } },
  );
  return { unread: 0 };
};