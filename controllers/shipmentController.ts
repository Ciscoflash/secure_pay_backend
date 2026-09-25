import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  MAX_PAGE_SIZE,
  getShipment,
  listShipments,
  payShipment,
} from '../services/shipmentService';
import SuccessResponse from '../utils/SuccessResponse';
import asyncHandler from '../utils/asyncHandler';
const positiveInt = (value: unknown, fallback: number, max = Infinity) => {
  const n = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(n) && n > 0 ? Math.min(n, max) : fallback;
};
export const list = asyncHandler(async (req: AuthRequest, res: Response) => {
  const page = positiveInt(req.query.page, 1);
  const limit = positiveInt(req.query.limit, 10, MAX_PAGE_SIZE);
  const data = await listShipments(req.user!.id, page, limit);
  return new SuccessResponse(res, 'Shipments fetched successfully', data);
});
export const show = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await getShipment(req.user!.id, req.params.id);
  return new SuccessResponse(res, 'Shipment fetched successfully', data);
});
export const pay = asyncHandler(async (req: AuthRequest, res: Response) => {
  const data = await payShipment(req.user!.id, req.params.id);
  return new SuccessResponse(res, 'Payment successful', data);
});
