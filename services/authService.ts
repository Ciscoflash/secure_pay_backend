import bcrypt from 'bcryptjs';
import { createHash, randomInt } from 'crypto';
import User, { IUser } from '../models/User';
import AppError from '../utils/AppError';
import { signToken } from '../utils/token';
import { toPublicUser } from '../utils/serializers';
import { assertStrongPassword, normalizePhone } from '../utils/validation';
import { sendVerificationEmail } from './mailService';
import { createNotification } from './notificationService';
import { mintWalletNumber } from '../utils/walletNumber';
import { shouldExposeVerificationCode } from '../config/appConfig';
interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  countryCode?: string;
  password: string;
}
interface LoginInput {
  email: string;
  password: string;
}
const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
const hashVerificationCode = (code: string): string =>
  createHash('sha256').update(code).digest('hex');
const VERIFICATION_CODE_PATTERN = /^\d{5}$/;
const issueAndSendVerification = async (user: IUser): Promise<string> => {
  const code = randomInt(10000, 100000).toString();
  user.emailVerificationToken = hashVerificationCode(code);
  user.emailVerificationTokenExpires = new Date(Date.now() + VERIFICATION_TTL_MS);
  await user.save();
  try {
    await sendVerificationEmail(user.email, code);
  } catch (error) {
    if (!shouldExposeVerificationCode()) {
      throw error;
    }
    console.warn(`Email delivery to ${user.email} failed; code shown in the app instead.`);
  }
  return code;
};
export const registerUser = async (input: RegisterInput) => {
  const fields = [input.firstName, input.lastName, input.email, input.password];
  if (fields.some((f) => typeof f !== 'string')) {
    throw new AppError(
      'Please provide your first name, last name, email and password',
      400,
    );
  }
  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (!firstName || !lastName || !input.email || !input.password) {
    throw new AppError(
      'Please provide your first name, last name, email and password',
      400,
    );
  }
  const phone = normalizePhone(input.countryCode, input.phone);
  assertStrongPassword(input.password);
  const existingUser = await User.findOne({
    email: input.email.trim().toLowerCase(),
  });
  if (existingUser) {
    throw new AppError('An account with this email already exists', 400);
  }
  const user = await User.create({
    name: `${firstName} ${lastName}`,
    firstName,
    lastName,
    email: input.email,
    phone,
    countryCode: input.countryCode!.trim(),
    password: input.password,
    walletNumber: await mintWalletNumber(),
  });
  let verificationCode: string;
  try {
    verificationCode = await issueAndSendVerification(user);
  } catch (error) {
    await User.findByIdAndDelete(user._id);
    throw error;
  }
  await createNotification(user._id.toString(), {
    type: 'welcome',
    title: 'Welcome to SecurePay',
    message: 'Your wallet is ready. Fund it to start paying for shipments.',
  });
  const token = signToken({ id: user._id });
  return {
    token,
    user: toPublicUser(user),
    verificationCode: shouldExposeVerificationCode() ? verificationCode : undefined,
  };
};
export const loginUser = async (input: LoginInput) => {
  const user = await User.findOne({
    email: input.email.trim().toLowerCase(),
  }).select('+password');
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }
  const isMatch = await bcrypt.compare(input.password, user.password);
  if (!isMatch) {
    throw new AppError('Invalid email or password', 401);
  }
  const token = signToken({ id: user._id });
  return { token, user: toPublicUser(user) };
};
export const getProfile = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User account no longer exists', 401);
  }
  return toPublicUser(user);
};
export const verifyEmail = async (rawCode: string) => {
  if (typeof rawCode !== 'string' || !rawCode.trim()) {
    throw new AppError('Please provide the verification code', 400);
  }
  const code = rawCode.trim();
  if (!VERIFICATION_CODE_PATTERN.test(code)) {
    throw new AppError('Enter the 5-digit code from your email', 400);
  }
  const hashed = hashVerificationCode(code);
  const user = await User.findOne({
    emailVerificationToken: hashed,
    emailVerificationTokenExpires: { $gt: new Date() },
  });
  if (!user) {
    throw new AppError(
      'This verification code is invalid or has expired. Request a new one.',
      400,
    );
  }
  user.emailVerified = true;
  user.emailVerificationToken = undefined;
  user.emailVerificationTokenExpires = undefined;
  await user.save();
  return toPublicUser(user);
};
export const resendVerification = async (userId: string) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new AppError('User account no longer exists', 401);
  }
  if (user.emailVerified) {
    throw new AppError('Your email is already verified', 400);
  }
  const code = await issueAndSendVerification(user);
  return {
    email: user.email,
    verificationCode: shouldExposeVerificationCode() ? code : undefined,
  };
};