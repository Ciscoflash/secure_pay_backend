import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  listNotifications,
  markAllRead,
  markRead,
} from '../services/notificationService';
import SuccessResponse from '../utils/SuccessResponse';
import asyncHandler from '../utils/asyncHandler';

export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await listNotifications(req.user!.id);
  return new SuccessResponse(res, 'Notifications fetched successfully', data);
});

export const read = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await markRead(req.user!.id, req.params.id);
  return new SuccessResponse(res, 'Notification marked as read', data);
});

export const readAll = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await markAllRead(req.user!.id);
  return new SuccessResponse(res, 'All notifications marked as read', data);
});