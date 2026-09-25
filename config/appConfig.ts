export const isProduction = (): boolean => process.env.NODE_ENV === 'production';
export const shouldExposeVerificationCode = (): boolean => {
  const flag = process.env.EXPOSE_VERIFICATION_CODE;
  if (flag !== undefined) {
    return flag.toLowerCase() === 'true';
  }
  return !isProduction();
};