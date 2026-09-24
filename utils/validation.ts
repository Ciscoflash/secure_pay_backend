import AppError from './AppError';

/**
 * Phone and password rules for new accounts. The Flutter app checks the same
 * rules for instant feedback (frontend/lib/models/country_code.dart and
 * frontend/lib/utils/password_policy.dart); these are the authoritative copy.
 */

interface PhoneRule {
  country: string;
  /** Valid national significant number, without the trunk prefix. */
  pattern: RegExp;
  example: string;
  trunkPrefix: string;
}

const PHONE_RULES: Record<string, PhoneRule> = {
  '+234': { country: 'Nigeria', pattern: /^[789][01]\d{8}$/, example: '8012345678', trunkPrefix: '0' },
  '+233': { country: 'Ghana', pattern: /^[235]\d{8}$/, example: '241234567', trunkPrefix: '0' },
  '+254': { country: 'Kenya', pattern: /^[17]\d{8}$/, example: '712345678', trunkPrefix: '0' },
  '+27': { country: 'South Africa', pattern: /^[1-8]\d{8}$/, example: '821234567', trunkPrefix: '0' },
  '+44': { country: 'United Kingdom', pattern: /^[1-9]\d{9}$/, example: '7400123456', trunkPrefix: '0' },
  '+1': { country: 'United States', pattern: /^[2-9]\d{2}[2-9]\d{6}$/, example: '2015550123', trunkPrefix: '1' },
};

/**
 * Validates [phone] for [countryCode] and returns it normalised to digits
 * without the trunk prefix (e.g. "0801 234 5678" → "8012345678").
 */
export const normalizePhone = (countryCode: unknown, phone: unknown): string => {
  if (typeof countryCode !== 'string' || typeof phone !== 'string' || !phone.trim()) {
    throw new AppError('Please provide your phone number and country code', 400);
  }
  const rule = PHONE_RULES[countryCode.trim()];
  if (!rule) {
    throw new AppError(
      `Unsupported country code. Use one of: ${Object.keys(PHONE_RULES).join(', ')}`,
      400,
    );
  }

  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith(rule.trunkPrefix)) {
    digits = digits.slice(rule.trunkPrefix.length);
  }
  if (!rule.pattern.test(digits)) {
    throw new AppError(
      `Enter a valid ${rule.country} phone number, e.g. ${rule.example}`,
      400,
    );
  }
  return digits;
};

export const PASSWORD_MIN_LENGTH = 8;
/** bcrypt only hashes the first 72 bytes. */
export const PASSWORD_MAX_BYTES = 72;

const PASSWORD_RULES: [string, (p: string) => boolean][] = [
  [`at least ${PASSWORD_MIN_LENGTH} characters`, (p) => p.length >= PASSWORD_MIN_LENGTH],
  ['an uppercase letter', (p) => /[A-Z]/.test(p)],
  ['a lowercase letter', (p) => /[a-z]/.test(p)],
  ['a number', (p) => /\d/.test(p)],
  ['a symbol', (p) => /[^A-Za-z0-9\s]/.test(p)],
];

const COMMON_PASSWORDS = new Set([
  'password1!', 'password@1', 'password123!', 'p@ssw0rd', 'p@ssword1',
  'passw0rd!', 'qwerty123!', 'welcome1!', 'welcome@123', 'admin@123',
  'abc@1234', 'letmein1!',
]);

/** Throws a 400 describing what [password] is missing. */
export const assertStrongPassword = (password: string): void => {
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX_BYTES) {
    throw new AppError(`Password must be at most ${PASSWORD_MAX_BYTES} characters`, 400);
  }
  const missing = PASSWORD_RULES.filter(([, test]) => !test(password)).map(([label]) => label);
  if (missing.length > 0) {
    throw new AppError(`Password needs ${missing.join(', ')}`, 400);
  }
  if (COMMON_PASSWORDS.has(password.toLowerCase())) {
    throw new AppError('This password is too common. Choose something harder to guess', 400);
  }
};
