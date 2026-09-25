import 'dotenv/config';
import mongoose, { Types } from 'mongoose';
import User from '../models/User';
import Shipment, { IPlace, ShipmentDirection, ShipmentStatus } from '../models/Shipment';
import Transaction from '../models/Transaction';
import { zonedMidnight, zonedParts, daysInMonth } from '../utils/time';
interface SeedOptions {
  reset: boolean;
}
const parseArgs = (): SeedOptions => {
  return { reset: process.argv.includes('--reset') };
};
const DEMO_EMAIL = 'demo@securepay.com';
const DEMO_BALANCE_KOBO = 300_000_028;
const seedUsers = async (reset: boolean) => {
  if (reset) {
    await Promise.all([
      User.deleteMany({}),
      Shipment.deleteMany({}),
      Transaction.deleteMany({}),
    ]);
    console.log('Deleted all users, shipments and transactions');
  }
  const users = [
    {
      name: 'Demo User',
      firstName: 'Demo',
      lastName: 'User',
      email: DEMO_EMAIL,
      password: 'password123',
      role: 'user',
    },
    {
      name: 'Admin User',
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@securepay.com',
      password: 'password123',
      role: 'admin',
    },
  ];
  for (const user of users) {
    const exists = await User.findOne({ email: user.email });
    if (!exists) {
      await User.create(user);
      console.log(`Seeded user: ${user.email}`);
    } else {
      console.log(`User already exists: ${user.email}`);
    }
  }
};
const mulberry32 = (seed: number) => () => {
  let t = (seed += 0x6d2b79f5);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const NIGERIA: IPlace[] = [
  { name: 'Lagos, Nigeria', countryCode: 'NG' },
  { name: 'Oyo Nigeria', countryCode: 'NG' },
  { name: 'Abuja, Nigeria', countryCode: 'NG' },
  { name: 'Port Harcourt, Nigeria', countryCode: 'NG' },
  { name: 'Kano, Nigeria', countryCode: 'NG' },
];
const ABROAD: IPlace[] = [
  { name: 'London, United Kingdom', countryCode: 'GB' },
  { name: 'Houston, United States', countryCode: 'US' },
  { name: 'Toronto, Canada', countryCode: 'CA' },
  { name: 'Accra, Ghana', countryCode: 'GH' },
  { name: 'Dubai, UAE', countryCode: 'AE' },
];
const PEOPLE = ['Bunmi Tanny', 'Mercy', 'Chidi Okafor', 'Aisha Bello', 'Tunde Ade', 'Ngozi Eze'];
const MONTHLY_SHAPE = [28, 33, 30, 36, 34, 44, 32, 49, 38, 63, 12, 98];
const seedDemoShipments = async (reset: boolean) => {
  const demo = await User.findOne({ email: DEMO_EMAIL });
  if (!demo) return;
  const existing = await Shipment.countDocuments({ user: demo._id });
  if (existing > 0 && !reset) {
    console.log(`Demo user already has ${existing} shipments, skipping`);
    return;
  }
  const rand = mulberry32(20260924);
  const pick = <T>(list: T[]) => list[Math.floor(rand() * list.length)];
  const now = new Date();
  const today = zonedParts(now);
  const usedIds = new Set<string>();
  const trackingId = () => {
    let id: string;
    do {
      const n = () => String(Math.floor(100 + rand() * 900));
      id = `MAF-${n()}-${n()}-${n()}`;
    } while (usedIds.has(id));
    usedIds.add(id);
    return id;
  };
  const docs: Record<string, unknown>[] = [];
  for (const year of [today.year - 1, today.year]) {
    for (let month = 1; month <= 12; month++) {
      if (year === today.year && month > today.month) break;
      const isCurrent = year === today.year && month === today.month;
      const days = isCurrent ? today.day : daysInMonth(year, month);
      const count = Math.round(
        MONTHLY_SHAPE[month - 1] * (days / daysInMonth(year, month)),
      );
      for (let i = 0; i < count; i++) {
        const day = 1 + Math.floor(rand() * days);
        const createdAt = new Date(
          zonedMidnight(year, month, day).getTime() + rand() * 86_400_000,
        );
        if (createdAt > now) continue;
        const roll = rand();
        const direction: ShipmentDirection =
          roll < 0.45 ? 'export' : roll < 0.85 ? 'import' : 'local';
        const [pickUp, deliveryTo] =
          direction === 'export'
            ? [pick(NIGERIA), pick(ABROAD)]
            : direction === 'import'
              ? [pick(ABROAD), pick(NIGERIA)]
              : [pick(NIGERIA), pick(NIGERIA)];
        const ageDays = (now.getTime() - createdAt.getTime()) / 86_400_000;
        const status: ShipmentStatus =
          ageDays > 14 ? 'delivered' : pick(['pending', 'in_transit', 'delayed']);
        const isPaid = status === 'delivered' || rand() < 0.6;
        docs.push({
          trackingId: trackingId(),
          user: demo._id,
          sender: pick(PEOPLE),
          receiver: pick(PEOPLE),
          pickUp,
          deliveryTo,
          amount: (3 + Math.floor(rand() * 45)) * 50_000,
          status,
          direction,
          processingHours: 6 + Math.floor(rand() * 60),
          isPaid,
          paidAt: isPaid ? createdAt : undefined,
          createdAt,
          updatedAt: createdAt,
        });
      }
    }
  }
  const designRows: [string, ShipmentStatus, boolean][] = [
    ['MAF-100-234-291', 'in_transit', true],
    ['MAF-100-234-292', 'delayed', false],
    ['MAF-100-234-293', 'in_transit', true],
  ];
  designRows.forEach(([id, status, isPaid], i) => {
    const createdAt = new Date(now.getTime() - (i + 1) * 60_000);
    docs.push({
      trackingId: id,
      user: demo._id,
      sender: 'Bunmi Tanny',
      receiver: 'Mercy',
      pickUp: NIGERIA[0],
      deliveryTo: NIGERIA[1],
      amount: 300_000,
      status,
      direction: 'local',
      processingHours: 10,
      isPaid,
      paidAt: isPaid ? createdAt : undefined,
      createdAt,
      updatedAt: createdAt,
    });
  });
  await Shipment.insertMany(docs);
  await Shipment.collection.bulkWrite(
    docs.map((d) => ({
      updateOne: {
        filter: { trackingId: d.trackingId },
        update: { $set: { createdAt: d.createdAt, updatedAt: d.updatedAt } },
      },
    })),
  );
  await User.updateOne(
    { _id: demo._id },
    { $set: { walletBalance: DEMO_BALANCE_KOBO, firstName: 'Demo', lastName: 'User' } },
  );
  await Transaction.create({
    user: demo._id as Types.ObjectId,
    type: 'credit',
    amount: DEMO_BALANCE_KOBO,
    balanceAfter: DEMO_BALANCE_KOBO,
    description: 'Opening balance (seed)',
  });
  console.log(`Seeded ${docs.length} shipments and wallet balance for ${DEMO_EMAIL}`);
};
const seed = async (): Promise<void> => {
  try {
    const { reset } = parseArgs();
    await mongoose.connect(
      process.env.MONGODB_URI || 'mongodb://localhost:27017/securepay',
    );
    console.log('MongoDB Connected');
    await seedUsers(reset);
    await seedDemoShipments(reset);
    console.log('Seeding complete');
    process.exit(0);
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Seed error: ${error.message}`);
    } else {
      console.error('Unknown seed error');
    }
    process.exit(1);
  }
};
seed();
