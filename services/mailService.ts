import { Resend } from 'resend';
import AppError from '../utils/AppError';

const API_KEY = process.env.RESEND_API_KEY;
const FROM = process.env.EMAIL_FROM || 'SecurePay <onboarding@resend.dev>';

let resend: Resend | null = null;

const getClient = (): Resend => {
  if (!API_KEY) {
    throw new AppError(
      'Email is not configured. Set RESEND_API_KEY in the environment.',
      500,
    );
  }
  if (!resend) {
    resend = new Resend(API_KEY);
  }
  return resend;
};

/** Emails the 5-digit verification [code]; throws a 500 if delivery fails. */
export const sendVerificationEmail = async (to: string, code: string) => {
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 12px;">
      <h2 style="margin: 0 0 12px;">Your SecurePay verification code</h2>
      <p style="margin: 0 0 20px; color: #374151;">Enter this code to activate your account. It expires in 24 hours.</p>
      <div style="font-size: 40px; font-weight: 700; letter-spacing: 12px; text-align: center; padding: 16px; background: #f1f5f9; border-radius: 8px; color: #0f172a;">${code}</div>
      <p style="margin: 20px 0 0; color: #6b7280; font-size: 13px;">If you did not create an account, you can safely ignore this email.</p>
    </div>
  `;

  try {
    const { data, error } = await getClient().emails.send({
      from: FROM,
      to,
      subject: 'Your SecurePay verification code',
      html,
    });
    if (error) {
      throw new Error(error.message);
    }
    console.log(`Verification email sent to ${to} (id: ${data?.id})`);
  } catch (err) {
    throw new AppError(
      `Could not send verification email: ${err instanceof Error ? err.message : 'unknown error'}`,
      500,
    );
  }
};