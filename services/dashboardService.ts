import { Types } from 'mongoose';
import User from '../models/User';
import Shipment from '../models/Shipment';
import AppError from '../utils/AppError';
import {
  APP_TIMEZONE,
  Period,
  PeriodWindow,
  currentWindow,
  daysInMonth,
  previousWindow,
  zonedParts,
} from '../utils/time';

interface Counts {
  shipments: number;
  exports: number;
  imports: number;
}

const countShipments = async (
  userId: Types.ObjectId,
  window: PeriodWindow,
): Promise<Counts> => {
  const [row] = await Shipment.aggregate<Counts>([
    {
      $match: {
        user: userId,
        createdAt: { $gte: window.start, $lt: window.end },
      },
    },
    {
      $group: {
        _id: null,
        shipments: { $sum: 1 },
        exports: { $sum: { $cond: [{ $eq: ['$direction', 'export'] }, 1, 0] } },
        imports: { $sum: { $cond: [{ $eq: ['$direction', 'import'] }, 1, 0] } },
      },
    },
  ]);
  return row ?? { shipments: 0, exports: 0, imports: 0 };
};

/** Percentage change, or null when there is no previous value to compare. */
const changePct = (current: number, previous: number): number | null =>
  previous === 0 ? null : Math.round(((current - previous) / previous) * 100);

export const getOverview = async (userId: string, period: Period) => {
  const user = await User.findById(userId);
  if (!user) throw new AppError('User account no longer exists', 401);

  const id = new Types.ObjectId(userId);
  const [current, previous] = await Promise.all([
    countShipments(id, currentWindow(period)),
    countShipments(id, previousWindow(period)),
  ]);

  const stat = (key: keyof Counts) => ({
    current: current[key],
    previous: previous[key],
    changePct: changePct(current[key], previous[key]),
  });

  return {
    period,
    balance: user.walletBalance ?? 0,
    stats: {
      shipments: stat('shipments'),
      exports: stat('exports'),
      imports: stat('imports'),
    },
  };
};

/**
 * Shipments created per bucket of the current calendar period: months of this
 * year, days of this month, or weekdays of this week.
 */
export const getGrowth = async (userId: string, range: Period) => {
  const window = currentWindow(range);
  const now = zonedParts(new Date());

  const bucketExpr = {
    year: { $month: { date: '$createdAt', timezone: APP_TIMEZONE } },
    month: { $dayOfMonth: { date: '$createdAt', timezone: APP_TIMEZONE } },
    week: { $isoDayOfWeek: { date: '$createdAt', timezone: APP_TIMEZONE } },
  }[range];

  const labels =
    range === 'year'
      ? Array.from({ length: 12 }, (_, i) => String(i + 1))
      : range === 'month'
        ? Array.from({ length: daysInMonth(now.year, now.month) }, (_, i) =>
            String(i + 1),
          )
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const rows = await Shipment.aggregate<{ _id: number; count: number }>([
    {
      $match: {
        user: new Types.ObjectId(userId),
        createdAt: { $gte: window.start, $lt: window.end },
      },
    },
    { $group: { _id: bucketExpr, count: { $sum: 1 } } },
  ]);

  const values = labels.map(() => 0);
  for (const row of rows) values[row._id - 1] = row.count;

  return { range, labels, values };
};
