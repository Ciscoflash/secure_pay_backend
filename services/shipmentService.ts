import { Types } from 'mongoose';
import User from '../models/User';
import Shipment from '../models/Shipment';
import Transaction from '../models/Transaction';
import AppError from '../utils/AppError';
import { toShipmentDTO } from '../utils/serializers';
import { createNotification, formatNaira } from './notificationService';
export const MAX_PAGE_SIZE = 50;
export const listShipments = async (
  userId: string,
  page: number,
  limit: number,
) => {
  const filter = { user: new Types.ObjectId(userId) };
  const [items, total] = await Promise.all([
    Shipment.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Shipment.countDocuments(filter),
  ]);
  return {
    items: items.map(toShipmentDTO),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
  };
};
const findOwned = async (userId: string, shipmentId: string) => {
  if (!Types.ObjectId.isValid(shipmentId)) {
    throw new AppError('Shipment not found', 404);
  }
  const shipment = await Shipment.findOne({ _id: shipmentId, user: userId });
  if (!shipment) throw new AppError('Shipment not found', 404);
  return shipment;
};
export const getShipment = async (userId: string, shipmentId: string) =>
  toShipmentDTO(await findOwned(userId, shipmentId));
export const payShipment = async (userId: string, shipmentId: string) => {
  const existing = await findOwned(userId, shipmentId);
  if (existing.isPaid) {
    throw new AppError('This shipment has already been paid for', 400);
  }
  const claimed = await Shipment.findOneAndUpdate(
    { _id: existing._id, user: userId, isPaid: false },
    { $set: { isPaid: true, paidAt: new Date() } },
    { new: true },
  );
  if (!claimed) {
    throw new AppError('This shipment has already been paid for', 400);
  }
  const user = await User.findOneAndUpdate(
    { _id: userId, walletBalance: { $gte: claimed.amount } },
    { $inc: { walletBalance: -claimed.amount } },
    { new: true },
  );
  if (!user) {
    await Shipment.updateOne(
      { _id: claimed._id },
      { $set: { isPaid: false }, $unset: { paidAt: 1 } },
    );
    throw new AppError(
      'Insufficient wallet balance. Fund your wallet and try again.',
      400,
    );
  }
  await Transaction.create({
    user: user._id,
    type: 'debit',
    amount: claimed.amount,
    balanceAfter: user.walletBalance,
    description: `Payment for shipment ${claimed.trackingId}`,
    shipment: claimed._id,
  });
  await createNotification(userId, {
    type: 'debit',
    title: 'Shipment paid',
    message: `${formatNaira(claimed.amount)} was deducted for shipment ${claimed.trackingId}.`,
  });
  return { shipment: toShipmentDTO(claimed), balance: user.walletBalance };
};
