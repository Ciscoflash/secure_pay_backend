import Transaction from '../models/Transaction';
import AppError from '../utils/AppError';
import {
  createNotification,
  formatNaira,
} from './notificationService';
import { ensureWalletNumber } from '../utils/walletNumber';
import User from '../models/User';
import { MAX_FUND_NAIRA, WALLET_BANK_NAME } from '../constants';
export const getWallet = async (userId: string) => {
  const user = await ensureWalletNumber(await User.findById(userId));
  const transactions = await Transaction.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(10);
  return {
    balance: user.walletBalance ?? 0,
    accountNumber: user.walletNumber,
    bankName: WALLET_BANK_NAME,
    transactions: transactions.map((t) => ({
      id: t._id,
      type: t.type,
      amount: t.amount,
      balanceAfter: t.balanceAfter,
      description: t.description,
      createdAt: t.createdAt,
    })),
  };
};
export const fundWallet = async (userId: string, amountNaira: unknown) => {
  if (
    typeof amountNaira !== 'number' ||
    !Number.isFinite(amountNaira) ||
    amountNaira <= 0
  ) {
    throw new AppError('Enter an amount greater than zero', 400);
  }
  if (amountNaira > MAX_FUND_NAIRA) {
    throw new AppError(
      `You can add at most N${MAX_FUND_NAIRA.toLocaleString('en-NG')} at a time`,
      400,
    );
  }
  const kobo = Math.round(amountNaira * 100);
  if (Math.abs(kobo - amountNaira * 100) > 1e-6) {
    throw new AppError('Amount can have at most two decimal places', 400);
  }
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { walletBalance: kobo } },
    { new: true },
  );
  if (!user) throw new AppError('User account no longer exists', 401);
  await Transaction.create({
    user: user._id,
    type: 'credit',
    amount: kobo,
    balanceAfter: user.walletBalance,
    description: 'Wallet top-up',
  });
  await createNotification(userId, {
    type: 'credit',
    title: 'Wallet funded',
    message: `${formatNaira(kobo)} was added to your wallet.`,
  });
  return { balance: user.walletBalance };
};