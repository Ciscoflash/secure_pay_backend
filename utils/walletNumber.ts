import { randomInt } from 'crypto';
import User, { IUser } from '../models/User';
import AppError from './AppError';

/** 10-digit number users transfer to when funding their wallet. */
export const generateWalletNumber = () =>
  randomInt(1_000_000_000, 10_000_000_000).toString();

export const uniqueWalletNumber = async (): Promise<string> => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const number = generateWalletNumber();
    const taken = await User.exists({ walletNumber: number });
    if (!taken) return number;
  }
  throw new AppError('Could not generate a unique wallet number', 500);
};

/** Fresh, unused 10-digit number for new accounts. */
export const mintWalletNumber = () => uniqueWalletNumber();

/** Backfills older accounts that predate the wallet number field. */
export const ensureWalletNumber = async (
  user: IUser | null,
) => {
  if (!user) throw new AppError('User account no longer exists', 401);
  if (!user.walletNumber) {
    user.walletNumber = await uniqueWalletNumber();
    await user.save();
  }
  return user;
};