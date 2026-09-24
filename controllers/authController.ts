import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  registerUser,
  loginUser,
  getProfile,
  verifyEmail as verifyEmailService,
  resendVerification as resendVerificationService,
} from '../services/authService';
import SuccessResponse from '../utils/SuccessResponse';
import asyncHandler from '../utils/asyncHandler';
import AppError from '../utils/AppError';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, email, phone, countryCode, password } = req.body;

  const { token, user } = await registerUser({
    firstName,
    lastName,
    email,
    phone,
    countryCode,
    password,
  });

  return new SuccessResponse(
    res,
    'Account created successfully',
    { token, user },
    201,
  );
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
    throw new AppError('Please provide an email and password', 400);
  }

  const { token, user } = await loginUser({ email, password });

  return new SuccessResponse(res, 'Logged in successfully', { token, user });
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const profile = await getProfile(req.user!.id);
  return new SuccessResponse(res, 'Profile fetched successfully', profile);
});

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const user = await verifyEmailService(req.body.code ?? req.body.token);
  return new SuccessResponse(res, 'Email verified successfully', user);
});

export const resend = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { email } = await resendVerificationService(req.user!.id);
  return new SuccessResponse(res, 'Verification email sent', { email });
});