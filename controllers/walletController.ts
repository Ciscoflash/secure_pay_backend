import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { fundWallet, getWallet } from '../services/walletService';
import SuccessResponse from '../utils/SuccessResponse';
import asyncHandler from '../utils/asyncHandler';

export const show = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await getWallet(req.user!.id);
  return new SuccessResponse(res, 'Wallet fetched successfully', data);
});

export const fund = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await fundWallet(req.user!.id, req.body?.amount);
  return new SuccessResponse(res, 'Wallet funded successfully', data);
});
