import { Types } from 'mongoose';
import User from '../models/User';
import Shipment, {
  IPlace,
  ITrackingEvent,
  ShipmentDirection,
  ShipmentStatus,
} from '../models/Shipment';
import Transaction from '../models/Transaction';
import AppError from '../utils/AppError';
import { deriveDirection, estimateAmount, parsePlace } from '../utils/pricing';
import { toShipmentDTO } from '../utils/serializers';
import { createNotification, formatNaira } from './notificationService';
export const MAX_PAGE_SIZE = 50;
const VALID_STATUSES = new Set<ShipmentStatus>([
  'pending',
  'in_transit',
  'delayed',
  'delivered',
]);
const VALID_DIRECTIONS = new Set<ShipmentDirection>([
  'export',
  'import',
  'local',
]);
export const listShipments = async (
  userId: string,
  page: number,
  limit: number,
  filters: { status?: string; direction?: string; search?: string } = {},
) => {
  const query: Record<string, unknown> = { user: new Types.ObjectId(userId) };
  const status = filters.status as ShipmentStatus | undefined;
  if (status && VALID_STATUSES.has(status)) query.status = status;
  const direction = filters.direction as ShipmentDirection | undefined;
  if (direction && VALID_DIRECTIONS.has(direction)) query.direction = direction;
  const search = filters.search?.trim();
  if (search) {
    const rx = { $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    query.$or = [{ trackingId: rx }, { sender: rx }, { receiver: rx }];
  }
  const [items, total] = await Promise.all([
    Shipment.find(query)
      .sort({ createdAt: -1, _id: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    Shipment.countDocuments(query),
  ]);
  return {
    items: items.map(toShipmentDTO),
    meta: { total, page, limit, totalPages: Math.max(1, Math.ceil(total / limit)) },
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
export interface ShipmentInput {
  sender: string;
  receiver: string;
  pickUp: IPlace;
  deliveryTo: IPlace;
}
const readText = (value: unknown, label: string): string => {
  const text = typeof value === 'string' ? value.trim() : '';
  if (!text || text.length > 120) {
    throw new AppError(`Please provide the ${label} name`, 400);
  }
  return text;
};
export const estimateShipment = (input: {
  pickUp?: unknown;
  deliveryTo?: unknown;
}) => {
  const pickUp = parsePlace(input.pickUp, 'pick up');
  const deliveryTo = parsePlace(input.deliveryTo, 'delivery');
  const direction = deriveDirection(pickUp, deliveryTo);
  return { direction, amount: estimateAmount(pickUp, deliveryTo) };
};
const mintTrackingId = async (): Promise<string> => {
  for (let attempt = 0; attempt < 10; attempt++) {
    const n = () => String(Math.floor(100 + Math.random() * 900));
    const id = `MAF-${n()}-${n()}-${n()}`;
    const exists = await Shipment.exists({ trackingId: id });
    if (!exists) return id;
  }
  throw new AppError('Could not generate a unique tracking ID. Try again.', 500);
};
export const createShipment = async (userId: string, input: ShipmentInput) => {
  const sender = readText(input.sender, 'sender');
  const receiver = readText(input.receiver, 'receiver');
  const pickUp = parsePlace(input.pickUp, 'pick up');
  const deliveryTo = parsePlace(input.deliveryTo, 'delivery');
  const direction = deriveDirection(pickUp, deliveryTo);
  const amount = estimateAmount(pickUp, deliveryTo);
  const user = await User.findById(userId);
  if (!user) throw new AppError('User account no longer exists', 401);
  const now = new Date();
  const events: ITrackingEvent[] = [
    { status: 'pending', note: 'Shipment created', at: now },
  ];
  const shipment = await Shipment.create({
    trackingId: await mintTrackingId(),
    user: userId,
    sender,
    receiver,
    pickUp,
    deliveryTo,
    amount,
    status: 'pending',
    direction,
    processingHours: 0,
    isPaid: false,
    events,
  });
  let balance = user.walletBalance ?? 0;
  if (balance >= amount) {
    const result = await payShipment(userId, shipment._id.toString());
    balance = result.balance;
  }
  await createNotification(userId, {
    type: 'shipment',
    title: 'Shipment created',
    message: `Your shipment ${shipment.trackingId} from ${pickUp.name} to ${deliveryTo.name} has been booked.`,
  });
  const fresh = await Shipment.findById(shipment._id);
  return { shipment: toShipmentDTO(fresh!), balance };
};
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
  claimed.events.push({
    status: 'pending',
    note: 'Payment received',
    at: new Date(),
  });
  await claimed.save();
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