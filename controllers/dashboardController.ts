import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getGrowth, getOverview } from '../services/dashboardService';
import AppError from '../utils/AppError';
import SuccessResponse from '../utils/SuccessResponse';
import asyncHandler from '../utils/asyncHandler';
import { Period, isPeriod } from '../utils/time';

const parsePeriod = (value: unknown, fallback: Period): Period => {
  if (value === undefined) return fallback;
  if (!isPeriod(value)) {
    throw new AppError('Period must be one of: week, month, year', 400);
  }
  return value;
};

export const overview = asyncHandler(async (req: AuthRequest, res: Response) => {
  const period = parsePeriod(req.query.period, 'month');
  const data = await getOverview(req.user!.id, period);
  return new SuccessResponse(res, 'Overview fetched successfully', data);
});

export const growth = asyncHandler(async (req: AuthRequest, res: Response) => {
  const range = parsePeriod(req.query.range, 'year');
  const data = await getGrowth(req.user!.id, range);
  return new SuccessResponse(res, 'Growth fetched successfully', data);
});
